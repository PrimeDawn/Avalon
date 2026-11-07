# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> TC-002/003/007/011 — actual window, real IPC, isolation and close
- Location: tests\e2e\shell.spec.ts:68:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: {"contextIsolation": true, "sandbox": true}
Received: undefined
```

# Test source

```ts
  1   | import { test, expect, _electron as electron, type ElectronApplication, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
  3   | import { cp, mkdir, writeFile } from 'node:fs/promises';
  4   | import { resolve, join } from 'node:path';
  5   | import { createRequire } from 'node:module';
  6   | import { once } from 'node:events';
  7   | 
  8   | // SPEC-001 desktop coverage: TC-002–008, window-close part of TC-011, and TC-014.
  9   | const root = process.cwd();
  10  | const evidence = process.env.AVALON_TEST_RUN_DIR!;
  11  | const require = createRequire(import.meta.url);
  12  | const executablePath = require('electron') as string;
  13  | const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key, value]) =>
  14  |   value !== undefined && !['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL', 'NO_SANDBOX', 'ELECTRON_CLI_ARGS'].includes(key),
  15  | )) as Record<string, string>;
  16  | const stamp = () => new Date().toISOString();
  17  | let launchSequence = 0;
  18  | const live = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  19  | 
  20  | function log(file: string, event: unknown) {
  21  |   appendFileSync(join(evidence, file), `${JSON.stringify({ timestamp: stamp(), event })}\n`);
  22  | }
  23  | 
  24  | async function withApp(info: TestInfo, action: (app: ElectronApplication, page: Page) => Promise<void>, appRoot = root) {
  25  |   const invocation = `${info.testId.replace(/[^a-zA-Z0-9-]/g, '_')}-${++launchSequence}`;
  26  |   const folder = join(evidence, 'cases', invocation);
  27  |   mkdirSync(folder, { recursive: true });
  28  |   const profile = join(root, '.awr/cache', process.env.AVALON_TEST_RUN_ID!, String(launchSequence), 'profile');
  29  |   const app = await electron.launch({
  30  |     executablePath, args: [appRoot, `--user-data-dir=${profile}`],
  31  |     cwd: appRoot, env: cleanEnv, timeout: 20_000,
  32  |   });
  33  |   const child = app.process();
  34  |   const pid = child.pid!;
  35  |   log('audit.log', { case: info.title, action: 'launched', pid });
  36  |   child.stdout?.on('data', (data) => appendFileSync(join(evidence, 'main.stdout.log'), data));
  37  |   child.stderr?.on('data', (data) => appendFileSync(join(evidence, 'main.stderr.log'), data));
  38  |   const network: unknown[] = [];
  39  |   const errors: string[] = [];
  40  |   const context = app.context();
  41  |   context.on('request', (request) => network.push({ case: info.title, method: request.method(), url: request.url().split('?')[0] }));
  42  |   context.on('response', (response) => network.push({ case: info.title, url: response.url().split('?')[0], status: response.status() }));
  43  |   context.on('requestfailed', (request) => network.push({ case: info.title, url: request.url().split('?')[0], failure: request.failure() }));
  44  |   let page: Page | undefined;
  45  |   try {
  46  |     await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  47  |     page = await app.firstWindow();
  48  |     page.on('console', (message) => log('renderer-console.ndjson', { case: info.title, type: message.type(), text: message.text() }));
  49  |     page.on('pageerror', (error) => { errors.push(error.message); log('renderer-console.ndjson', { case: info.title, pageerror: error.message }); });
  50  |     await page.waitForLoadState('domcontentloaded');
  51  |     await action(app, page);
  52  |     expect(errors, 'No unhandled renderer exceptions').toEqual([]);
  53  |     log('audit.log', { case: info.title, action: 'assertions-passed' });
  54  |   } catch (error) {
  55  |     log('audit.log', { case: info.title, action: 'failed', error: String(error) });
  56  |     if (page && !page.isClosed()) await page.screenshot({ path: join(folder, 'failure.png') }).catch(() => {});
  57  |     throw error;
  58  |   } finally {
  59  |     writeFileSync(join(folder, 'network-summary.json'), JSON.stringify(network, null, 2));
  60  |     if (page && !page.isClosed()) await page.screenshot({ path: join(folder, 'final.png') }).catch(() => {});
  61  |     await context.tracing.stop({ path: join(folder, 'trace.zip') }).catch(() => {});
  62  |     if (child.exitCode === null && child.signalCode === null) await app.close();
  63  |     await expect.poll(() => live(pid), { timeout: 5_000 }).toBe(false);
  64  |     log('audit.log', { case: info.title, action: 'process-exited', pid, code: child.exitCode, signal: child.signalCode });
  65  |   }
  66  | }
  67  | 
  68  | test('TC-002/003/007/011 — actual window, real IPC, isolation and close', async ({}, info) => {
  69  |   await withApp(info, async (app, page) => {
  70  |     await expect(page).toHaveTitle('Avalon');
  71  |     await expect(page.getByText('工作台已启动')).toBeVisible();
  72  |     expect(app.windows()).toHaveLength(1);
  73  |     expect(await page.evaluate(() => ({ api: Object.keys(window.avalon!), node: typeof (window as any).require, process: typeof (window as any).process })))
  74  |       .toEqual({ api: ['getAppInfo'], node: 'undefined', process: 'undefined' });
  75  |     const cdp = await app.context().newCDPSession(page);
  76  |     const contexts: { id: number; name: string }[] = [];
  77  |     cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.push(context));
  78  |     await cdp.send('Runtime.enable');
  79  |     const isolated = contexts.find((context) => context.name === 'Electron Isolated Context');
  80  |     expect(isolated, 'Electron preload runs in its own isolated context').toBeDefined();
  81  |     const runtime = await cdp.send('Runtime.evaluate', {
  82  |       contextId: isolated!.id, expression: '({sandbox: process.sandboxed, contextIsolation: process.contextIsolated})', returnByValue: true,
  83  |     });
> 84  |     expect(runtime.result.value).toEqual({ sandbox: true, contextIsolation: true });
      |                                  ^ Error: expect(received).toEqual(expected) // deep equality
  85  |     await cdp.detach();
  86  |     const version = await app.evaluate(({ app }) => app.getVersion());
  87  |     expect(version).toBe('0.1.0');
  88  |     await page.getByRole('button', { name: '检查连接' }).click();
  89  |     await expect(page.getByRole('status')).toHaveText(`连接正常 · Avalon ${version}`);
  90  |     const exited = once(app.process(), 'exit');
  91  |     await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
  92  |     const [code] = await exited;
  93  |     expect(code).toBe(0);
  94  |   });
  95  | });
  96  | 
  97  | test('TC-003/006 — pending, real IPC timeout and retry', async ({}, info) => {
  98  |   await withApp(info, async (app, page) => {
  99  |     await app.evaluate(({ ipcMain }) => {
  100 |       ipcMain.removeHandler('avalon:get-app-info');
  101 |       ipcMain.handle('avalon:get-app-info', () => new Promise(() => {}));
  102 |     });
  103 |     await page.getByRole('button', { name: '检查连接' }).click();
  104 |     await expect(page.getByRole('button', { name: '检查连接' })).toBeDisabled();
  105 |     await expect(page.getByRole('status')).toHaveText('正在检查连接…');
  106 |     await expect(page.getByRole('status')).toHaveText('连接失败，请重试', { timeout: 5_000 });
  107 |     await expect(page.getByRole('button', { name: '检查连接' })).toBeEnabled();
  108 |     await app.evaluate(({ ipcMain, app }) => {
  109 |       ipcMain.removeHandler('avalon:get-app-info');
  110 |       ipcMain.handle('avalon:get-app-info', () => ({ name: 'Avalon', version: app.getVersion() }));
  111 |     });
  112 |     await page.getByRole('button', { name: '检查连接' }).click();
  113 |     await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
  114 |   });
  115 | });
  116 | 
  117 | test('TC-005 — missing native handler produces a retryable failure', async ({}, info) => {
  118 |   await withApp(info, async (app, page) => {
  119 |     await app.evaluate(({ ipcMain }) => ipcMain.removeHandler('avalon:get-app-info'));
  120 |     await page.getByRole('button', { name: '检查连接' }).click();
  121 |     await expect(page.getByRole('status')).toHaveText('连接失败，请重试');
  122 |     await expect(page.getByRole('button', { name: '检查连接' })).toBeEnabled();
  123 |   });
  124 |   await withApp(info, async (_app, page) => {
  125 |     await page.getByRole('button', { name: '检查连接' }).click();
  126 |     await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
  127 |   });
  128 | });
  129 | 
  130 | test('TC-006 — malformed native response never displays success', async ({}, info) => {
  131 |   await withApp(info, async (app, page) => {
  132 |     await app.evaluate(({ ipcMain }) => {
  133 |       ipcMain.removeHandler('avalon:get-app-info');
  134 |       ipcMain.handle('avalon:get-app-info', () => ({ name: 'Other', version: 123 }));
  135 |     });
  136 |     await page.getByRole('button', { name: '检查连接' }).click();
  137 |     await expect(page.getByRole('status')).toHaveText('连接失败，请重试');
  138 |   });
  139 | });
  140 | 
  141 | test('TC-008 — new windows and navigation away are denied', async ({}, info) => {
  142 |   await withApp(info, async (app, page) => {
  143 |     const original = page.url();
  144 |     // Local, non-sensitive destination; this must be denied before any request occurs.
  145 |     const returnedNull = await page.evaluate(() => window.open('https://example.invalid/') === null);
  146 |     expect(returnedNull).toBe(true);
  147 |     await page.evaluate(() => { window.location.href = 'https://example.invalid/'; });
  148 |     await expect(page.getByText('工作台已启动')).toBeVisible();
  149 |     expect(page.url()).toBe(original);
  150 |     expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  151 |   });
  152 | });
  153 | 
  154 | test('TC-004 — a real foreign window cannot invoke the app handler', async ({}, info) => {
  155 |   const probe = join(evidence, 'foreign-preload.cjs');
  156 |   await writeFile(probe, "const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('probe',{run:()=>ipcRenderer.invoke('avalon:get-app-info').then(()=> 'UNEXPECTED_SUCCESS',e=>String(e.message))});");
  157 |   await withApp(info, async (app) => {
  158 |     const result = await app.evaluate(async ({ BrowserWindow }, preload) => {
  159 |       const foreign = new BrowserWindow({ show: false, webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false } });
  160 |       try {
  161 |         await foreign.loadURL('data:text/html,<title>probe</title>');
  162 |         return await foreign.webContents.executeJavaScript('window.probe.run()');
  163 |       } finally { foreign.destroy(); }
  164 |     }, probe);
  165 |     expect(result).toContain('IPC_UNAVAILABLE');
  166 |     log('audit.log', { case: info.title, nativeRejection: result });
  167 |   });
  168 | });
  169 | 
  170 | test('TC-014 — built app starts from Chinese and space-containing path', async ({}, info) => {
  171 |   const replica = join(root, '.awr/cache', process.env.AVALON_TEST_RUN_ID!, '中文 空格 副本');
  172 |   await mkdir(replica, { recursive: true });
  173 |   await cp(join(root, 'out'), join(replica, 'out'), { recursive: true });
  174 |   await cp(join(root, 'package.json'), join(replica, 'package.json'));
  175 |   await withApp(info, async (_app, page) => {
  176 |     await expect(page.getByText('工作台已启动')).toBeVisible();
  177 |     await page.getByRole('button', { name: '检查连接' }).click();
  178 |     await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
  179 |   }, replica);
  180 | });
  181 | 
```