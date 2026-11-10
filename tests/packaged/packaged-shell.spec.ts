import { test, expect, _electron as electron } from '@playwright/test';
import { appendFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';

const exe = process.env.AVALON_PACKAGED_EXE!;
const evidence = process.env.AVALON_TEST_RUN_DIR!;
const env: Record<string, string> = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
env.ELECTRON_RENDERER_URL = 'http://127.0.0.1:1/';
for (const key of ['ELECTRON_RUN_AS_NODE', 'NO_SANDBOX', 'ELECTRON_CLI_ARGS']) delete env[key];
function hashes(root: string): Record<string, string> {
  const entries: Record<string, string> = {};
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else entries[relative(root, file)] = createHash('sha256').update(readFileSync(file)).digest('hex');
    }
  }
  walk(root); return entries;
}
const log = (event: unknown) => appendFileSync(join(evidence, 'packaged-audit.log'), JSON.stringify({ timestamp: new Date().toISOString(), event }) + '\n');

test('P07/P08 — packaged local resources, real IPC, isolated paths, no server and normal close', async () => {
  const before = hashes(dirname(exe));
  const app = await electron.launch({ executablePath: exe, args: [], cwd: 'C:/Windows/Temp', env, timeout: 20_000 });
  const child = app.process();
  child.stdout?.on('data', d => appendFileSync(join(evidence, 'packaged.stdout.log'), d));
  child.stderr?.on('data', d => appendFileSync(join(evidence, 'packaged.stderr.log'), d));
  const context = app.context();
  const network: unknown[] = [], errors: string[] = [];
  context.on('request', r => network.push({ method: r.method(), url: r.url().split('?')[0] }));
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  try {
    const page = await app.firstWindow();
    page.on('console', m => { log({ console: m.type(), text: m.text() }); if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await expect(page.getByText('工作台已启动')).toBeVisible();
    await page.getByRole('button', { name: '检查连接' }).click();
    await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
    const runtime = await app.evaluate(({ app, BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]!;
      const renderer = app.getAppMetrics().find(m => m.pid === window.webContents.getOSProcessId());
      return { packaged: app.isPackaged, appPath: app.getAppPath(), userData: app.getPath('userData'),
        appData: app.getPath('appData'), sessionData: app.getPath('sessionData'), logs: app.getPath('logs'),
        url: window.webContents.getURL(), sandboxed: renderer?.sandboxed,
        pids: app.getAppMetrics().map(m => m.pid) };
    });
    expect(runtime.packaged).toBe(true);
    expect(runtime.appPath).toMatch(/app\.asar$/);
    expect(runtime.url).toMatch(/^file:.*app\.asar.*renderer/);
    expect(runtime.userData).toBe(join(runtime.appData, 'Avalon'));
    expect(runtime.sessionData).toBe(join(runtime.userData, 'session'));
    expect(runtime.logs).toBe(join(runtime.userData, 'logs'));
    expect(runtime.sandboxed).toBe(true);
    expect(JSON.parse(readFileSync(join(runtime.logs, 'startup.json'), 'utf8'))).toMatchObject({ event: 'app-ready', isPackaged: true });
    // Playwright adds a main-process inspector; distinguish that instrumentation port from app servers.
    const netstat = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true });
    const listeners = netstat.split(/\r?\n/).filter(line => line.includes('LISTENING') && runtime.pids.includes(Number(line.trim().split(/\s+/).at(-1))));
    expect(listeners.some(line => /:5178\s/.test(line))).toBe(false);
    log({ runtime, instrumentationListeners: listeners, executableSha256: createHash('sha256').update(readFileSync(exe)).digest('hex') });
    await page.screenshot({ path: join(evidence, 'packaged-ready.png') });
    expect(errors).toEqual([]);
    expect(network.some(n => /^https?:/.test((n as { url: string }).url))).toBe(false);
    await context.tracing.stop({ path: join(evidence, 'packaged-trace.zip') });
    const exited = once(child, 'exit');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
    expect((await exited)[0]).toBe(0);
    expect(hashes(dirname(exe))).toEqual(before);
    writeFileSync(join(evidence, 'packaged-result.json'), JSON.stringify({ runtime, before, after: hashes(dirname(exe)), exitCode: child.exitCode }, null, 2));
  } finally {
    writeFileSync(join(evidence, 'packaged-network.json'), JSON.stringify(network, null, 2));
    if (child.exitCode === null) await app.close();
  }
});

test('P09 — close the first available packaged window immediately, then reopen', async () => {
  const timings: unknown[] = [];
  for (const phase of ['early-close', 'reopen'] as const) {
    const launchedAt = Date.now();
    const app = await electron.launch({ executablePath: exe, args: [], cwd: 'C:/Windows/Temp', env, timeout: 20_000 });
    const child = app.process();
    let stderr = '';
    child.stderr?.on('data', data => { stderr += String(data); });
    try {
      const page = await app.firstWindow();
      const availableAt = Date.now();
      if (phase === 'reopen') {
        await expect(page.getByText('工作台已启动')).toBeVisible();
        await page.getByRole('button', { name: '检查连接' }).click();
        await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');
      }
      const closeRequestedAt = Date.now();
      const exited = once(child, 'exit');
      // BrowserWindow.close follows the application close lifecycle, unlike killing the process.
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
      const exitCode = (await exited)[0];
      const exitedAt = Date.now();
      timings.push({ phase, launchedAt, availableAt, closeRequestedAt, exitedAt, exitCode, stderr });
      expect(exitCode).toBe(0);
      expect(stderr).not.toContain('app-start-failed');
      expect(exitedAt - closeRequestedAt).toBeLessThan(5_000);
      if (phase === 'early-close') expect(closeRequestedAt - availableAt).toBeLessThan(250);
    } finally {
      writeFileSync(join(evidence, 'packaged-early-close.json'), JSON.stringify(timings, null, 2));
      if (child.exitCode === null) await app.close();
    }
  }
});
