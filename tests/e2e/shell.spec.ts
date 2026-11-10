import { test, expect, _electron as electron, type ElectronApplication, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { spawn } from 'node:child_process';

// SPEC-001 desktop coverage: TC-002–008, window-close part of TC-011, and TC-014.
const root = process.cwd();
const evidence = process.env.AVALON_TEST_RUN_DIR!;
const require = createRequire(import.meta.url);
const executablePath = require('electron') as string;
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key, value]) =>
  value !== undefined && !['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL', 'NO_SANDBOX', 'ELECTRON_CLI_ARGS'].includes(key),
)) as Record<string, string>;
const stamp = () => new Date().toISOString();
let launchSequence = 0;
const live = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function log(file: string, event: unknown) {
  appendFileSync(join(evidence, file), `${JSON.stringify({ timestamp: stamp(), event })}\n`);
}

async function withApp(info: TestInfo, action: (app: ElectronApplication, page: Page) => Promise<void>, appRoot = root) {
  const invocation = `${info.testId.replace(/[^a-zA-Z0-9-]/g, '_')}-${++launchSequence}`;
  const folder = join(evidence, 'cases', invocation);
  mkdirSync(folder, { recursive: true });
  const profile = join(root, '.awr/cache', process.env.AVALON_TEST_RUN_ID!, String(launchSequence), 'profile');
  const app = await electron.launch({
    executablePath, args: [appRoot, `--user-data-dir=${profile}`],
    cwd: appRoot, env: cleanEnv, timeout: 20_000,
  });
  const child = app.process();
  const pid = child.pid!;
  log('audit.log', { case: info.title, action: 'launched', pid });
  child.stdout?.on('data', (data) => appendFileSync(join(evidence, 'main.stdout.log'), data));
  child.stderr?.on('data', (data) => appendFileSync(join(evidence, 'main.stderr.log'), data));
  const network: unknown[] = [];
  const errors: string[] = [];
  const context = app.context();
  context.on('request', (request) => network.push({ case: info.title, method: request.method(), url: request.url().split('?')[0] }));
  context.on('response', (response) => network.push({ case: info.title, url: response.url().split('?')[0], status: response.status() }));
  context.on('requestfailed', (request) => network.push({ case: info.title, url: request.url().split('?')[0], failure: request.failure() }));
  let page: Page | undefined;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    page = await app.firstWindow();
    page.on('console', (message) => log('renderer-console.ndjson', { case: info.title, type: message.type(), text: message.text() }));
    page.on('pageerror', (error) => { errors.push(error.message); log('renderer-console.ndjson', { case: info.title, pageerror: error.message }); });
    await page.waitForLoadState('domcontentloaded');
    await action(app, page);
    expect(errors, 'No unhandled renderer exceptions').toEqual([]);
    log('audit.log', { case: info.title, action: 'assertions-passed' });
  } catch (error) {
    log('audit.log', { case: info.title, action: 'failed', error: String(error) });
    if (page && !page.isClosed()) await page.screenshot({ path: join(folder, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    writeFileSync(join(folder, 'network-summary.json'), JSON.stringify(network, null, 2));
    if (page && !page.isClosed()) await page.screenshot({ path: join(folder, 'final.png') }).catch(() => {});
    await context.tracing.stop({ path: join(folder, 'trace.zip') }).catch(() => {});
    if (child.exitCode === null && child.signalCode === null) await app.close();
    await expect.poll(() => live(pid), { timeout: 5_000 }).toBe(false);
    log('audit.log', { case: info.title, action: 'process-exited', pid, code: child.exitCode, signal: child.signalCode });
  }
}

test('TC-002/003/007/011 — actual window, real IPC, isolation and close', async ({}, info) => {
  await withApp(info, async (app, page) => {
    await expect(page).toHaveTitle('Avalon');
    await expect(page.getByText('工作台已启动')).toBeVisible();
    expect(app.windows()).toHaveLength(1);
    expect(await page.evaluate(() => ({ api: Object.keys(window.avalon!), node: typeof (window as any).require, process: typeof (window as any).process })))
      .toEqual({ api: ['getAppInfo'], node: 'undefined', process: 'undefined' });
    const cdp = await app.context().newCDPSession(page);
    const contexts: { id: number; name: string }[] = [];
    cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.push(context));
    await cdp.send('Runtime.enable');
    const isolated = contexts.find((context) => context.name === 'Electron Isolated Context');
    expect(isolated, 'Electron preload runs in its own isolated context').toBeDefined();
    // The sandbox preload's process object is a wrapper-local binding, not a CDP global.
    // Verify the actual renderer OS process through Electron's supported metrics API.
    const renderer = await app.evaluate(({ app, BrowserWindow }) => {
      const pid = BrowserWindow.getAllWindows()[0]!.webContents.getOSProcessId();
      const metric = app.getAppMetrics().find((entry) => entry.pid === pid);
      return { pid, sandboxed: metric?.sandboxed, type: metric?.type };
    });
    expect(renderer.sandboxed).toBe(true);
    expect(renderer.type).toBe('Tab');
    log('audit.log', { case: info.title, renderer, isolatedContextObserved: true });
    await cdp.detach();
    const version = await app.evaluate(({ app }) => app.getVersion());
    expect(version).toBe('0.1.0');
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText(`连接正常 · Avalon ${version}`);
    const exited = once(app.process(), 'exit');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
    const [code] = await exited;
    expect(code).toBe(0);
  });
});

test('TC-003/006 — pending, real IPC timeout and retry', async ({}, info) => {
  await withApp(info, async (app, page) => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('avalon:get-app-info');
      ipcMain.handle('avalon:get-app-info', () => new Promise(() => {}));
    });
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('button', { name: '检查连接' })).toBeDisabled();
    await expect(page.getByRole('status')).toHaveText('正在检查连接…');
    await expect(page.getByRole('status')).toHaveText('连接失败，请重试', { timeout: 5_000 });
    await expect(page.getByRole('button', { name: '检查连接' })).toBeEnabled();
    await app.evaluate(({ ipcMain, app }) => {
      ipcMain.removeHandler('avalon:get-app-info');
      ipcMain.handle('avalon:get-app-info', () => ({ name: 'Avalon', version: app.getVersion() }));
    });
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
  });
});

test('TC-005 — missing native handler produces a retryable failure', async ({}, info) => {
  await withApp(info, async (app, page) => {
    await app.evaluate(({ ipcMain }) => ipcMain.removeHandler('avalon:get-app-info'));
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText('连接失败，请重试');
    await expect(page.getByRole('button', { name: '检查连接' })).toBeEnabled();
  });
  await withApp(info, async (_app, page) => {
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
  });
});

test('TC-006 — malformed native response never displays success', async ({}, info) => {
  await withApp(info, async (app, page) => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('avalon:get-app-info');
      ipcMain.handle('avalon:get-app-info', () => ({ name: 'Other', version: 123 }));
    });
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText('连接失败，请重试');
  });
});

test('TC-008 — new windows and navigation away are denied', async ({}, info) => {
  await withApp(info, async (app, page) => {
    const original = page.url();
    // Local, non-sensitive destination; this must be denied before any request occurs.
    const returnedNull = await page.evaluate(() => window.open('https://example.invalid/') === null);
    expect(returnedNull).toBe(true);
    const attempted = app.evaluate(({ BrowserWindow }) => new Promise<{ prevented: boolean; url: string }>((resolveEvent) => {
      BrowserWindow.getAllWindows()[0]!.webContents.once('will-navigate', (event, url) => resolveEvent({ prevented: event.defaultPrevented, url }));
    }));
    await page.evaluate(() => { window.location.href = 'https://example.invalid/'; });
    expect(await attempted).toEqual({ prevented: true, url: 'https://example.invalid/' });
    // Electron cancellation can leave Playwright's navigation waiter pending; inspect the live document directly.
    const document = await app.evaluate(async ({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0]!.webContents;
      return { url: contents.getURL(), text: await contents.executeJavaScript('document.body.innerText') as string };
    });
    expect(document.url).toBe(original);
    expect(document.text).toContain('工作台已启动');
    log('audit.log', { case: info.title, navigationPrevented: true, document });
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  });
});

test('TC-004 — a real foreign window cannot invoke the app handler', async ({}, info) => {
  const probe = join(evidence, 'foreign-preload.cjs');
  await writeFile(probe, "const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('probe',{run:()=>ipcRenderer.invoke('avalon:get-app-info').then(()=> 'UNEXPECTED_SUCCESS',e=>String(e.message))});");
  await withApp(info, async (app) => {
    const result = await app.evaluate(async ({ BrowserWindow }, preload) => {
      const foreign = new BrowserWindow({ show: false, webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false } });
      try {
        await foreign.loadURL('data:text/html,<title>probe</title>');
        return await foreign.webContents.executeJavaScript('window.probe.run()');
      } finally { foreign.destroy(); }
    }, probe);
    expect(result).toContain('IPC_UNAVAILABLE');
    log('audit.log', { case: info.title, nativeRejection: result });
  });
});

test('TC-014 — built app starts from Chinese and space-containing path', async ({}, info) => {
  const replica = join(root, '.awr/cache', process.env.AVALON_TEST_RUN_ID!, '中文 空格 副本');
  await mkdir(replica, { recursive: true });
  await cp(join(root, 'out'), join(replica, 'out'), { recursive: true });
  await cp(join(root, 'package.json'), join(replica, 'package.json'));
  await withApp(info, async (_app, page) => {
    await expect(page.getByText('工作台已启动')).toBeVisible();
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
  }, replica);
});

test('TC-012 — missing renderer file logs a load error and exits nonzero', async ({}, info) => {
  // SPEC-007 adds a native error dialog: allow the tester to inspect and dismiss it.
  test.setTimeout(90_000);
  const replica = join(root, '.awr/cache', process.env.AVALON_TEST_RUN_ID!, 'missing-renderer');
  await mkdir(replica, { recursive: true });
  for (const directory of ['main', 'preload']) {
    await cp(join(root, 'out', directory), join(replica, 'out', directory), { recursive: true });
  }
  await cp(join(root, 'package.json'), join(replica, 'package.json'));
  const child = spawn(executablePath, [replica, `--user-data-dir=${join(replica, 'profile')}`], {
    cwd: replica, env: cleanEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
    output += data.toString(); appendFileSync(join(evidence, 'missing-renderer.log'), data);
  });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, 60_000);
  const [code, signal] = await once(child, 'close');
  clearTimeout(timer);
  log('audit.log', { case: info.title, pid: child.pid, code, signal, timedOut });
  expect(timedOut).toBe(false);
  expect(code).toBe(1);
  expect(output).toContain('app-start-failed');
  expect(output).toContain('ERR_FILE_NOT_FOUND');
  expect(live(child.pid!)).toBe(false);
});
