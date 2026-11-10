import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import type { AvalonApi } from '../../src/shared/contracts';
import { registerAppIpc } from '../../src/main/ipc';

// SPEC-001 writer/plan.html §3.2–3.4. Electron is the native process boundary.
// Tester must cover the same paths in real Electron; these mocks are not E2E proof.
const native = vi.hoisted(() => {
  const listeners = new Map<string, (...args: any[]) => void>();
  const windows: any[] = [];
  const permission = { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() };
  const loading = { error: null as Error | null, close: false, closing: false };
  class Window {
    static getAllWindows() { return windows.filter((w) => !w.destroyed); }
    destroyed = false;
    listeners = new Map<string, (...args: any[]) => void>();
    webContents = {
      id: 7,
      mainFrame: { url: 'http://127.0.0.1:5178/' },
      session: permission,
      setWindowOpenHandler: vi.fn(),
      on: vi.fn((name, fn) => { this.listeners.set(name, fn); }),
    };
    loadURL = vi.fn(async (_url: string) => {
      if (loading.closing) this.listeners.get('close')?.();
      if (loading.close) this.destroyed = true;
      if (loading.error) throw loading.error;
    });
    loadFile = vi.fn(async (_path: string) => {
      if (loading.closing) this.listeners.get('close')?.();
      if (loading.close) this.destroyed = true;
      if (loading.error) throw loading.error;
    });
    on = vi.fn((name, fn) => { this.listeners.set(name, fn); return this; });
    once = this.on;
    isDestroyed() { return this.destroyed; }
    constructor(public options: any) { windows.push(this); }
  }
  return {
    Window, windows, listeners, permission, loading,
    app: {
      isPackaged: false,
      whenReady: vi.fn(async () => {}),
      getVersion: vi.fn(() => '0.1.0'),
      getPath: vi.fn(), setPath: vi.fn(), setAppLogsPath: vi.fn(), setAppUserModelId: vi.fn(),
      commandLine: { getSwitchValue: vi.fn(() => '') },
      on: vi.fn((name, fn) => { listeners.set(name, fn); }),
      quit: vi.fn(), exit: vi.fn(),
    },
    ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
    contextBridge: { exposeInMainWorld: vi.fn() },
    ipcRenderer: { invoke: vi.fn() },
    dialog: { showErrorBox: vi.fn() },
  };
});
vi.mock('electron', () => ({
  app: native.app, BrowserWindow: native.Window, ipcMain: native.ipcMain,
  contextBridge: native.contextBridge, ipcRenderer: native.ipcRenderer,
  dialog: native.dialog,
}));

let dataFixture: string;
beforeEach(() => {
  dataFixture = mkdtempSync(join(tmpdir(), 'avalon-lifecycle-'));
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  native.windows.length = 0;
  native.listeners.clear();
  native.loading.error = null;
  native.loading.close = false;
  native.loading.closing = false;
  native.app.isPackaged = false;
  native.app.whenReady.mockResolvedValue(undefined);
  native.app.getVersion.mockReturnValue('0.1.0');
  native.app.getPath.mockReset().mockReturnValue(dataFixture);
  native.app.commandLine.getSwitchValue.mockReturnValue('');
  native.ipcRenderer.invoke.mockReset();
});
afterEach(() => {
  if (!resolve(dataFixture).startsWith(join(tmpdir(), 'avalon-lifecycle-'))) throw new Error('Unexpected fixture path');
  rmSync(dataFixture, { recursive: true, force: true });
});

describe('registerAppIpc', () => {
  const url = 'http://127.0.0.1:5178/';
  function fixture() {
    const window = new native.Window({});
    const dispose = registerAppIpc(() => window as unknown as BrowserWindow, () => url);
    expect(native.ipcMain.handle).toHaveBeenCalledTimes(1);
    const [channel, handle] = native.ipcMain.handle.mock.calls[0]!;
    expect(channel).toBe('avalon:get-app-info');
    const event = { sender: window.webContents, senderFrame: window.webContents.mainFrame };
    return { window, dispose, handle, event };
  }
  it('returns application info for the trusted main frame and unregisters on disposal', async () => {
    const { handle, event, dispose } = fixture();
    await expect(Promise.resolve(handle(event))).resolves.toEqual({ name: 'Avalon', version: '0.1.0' });
    dispose();
    expect(native.ipcMain.removeHandler).toHaveBeenCalledWith('avalon:get-app-info');
  });
  it.each(['extra argument', 'different window', 'child frame', 'external URL', 'missing frame', 'destroyed window'])('rejects %s without returning app info', async (kind) => {
    const { handle, event, window } = fixture();
    const args: unknown[] = [];
    if (kind === 'extra argument') args.push({ unused: true });
    if (kind === 'different window') event.sender = { ...event.sender, id: 99 };
    if (kind === 'child frame') event.senderFrame = { url };
    if (kind === 'external URL') event.senderFrame.url = 'https://example.com/';
    if (kind === 'missing frame') event.senderFrame = null as never;
    if (kind === 'destroyed window') window.destroyed = true;
    await expect(Promise.resolve().then(() => handle(event as unknown as IpcMainInvokeEvent, ...args))).rejects.toThrow('IPC_UNAVAILABLE');
    expect(native.app.getVersion).not.toHaveBeenCalled();
  });
  it('rejects while no window is available', async () => {
    registerAppIpc(() => null, () => url);
    expect(native.ipcMain.handle).toHaveBeenCalledTimes(1);
    const handle = native.ipcMain.handle.mock.calls[0]![1];
    await expect(Promise.resolve().then(() => handle({}))).rejects.toThrow('IPC_UNAVAILABLE');
  });
});

describe('preload bridge', () => {
  async function api() {
    await import('../../src/preload/index');
    expect(native.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, exposed] = native.contextBridge.exposeInMainWorld.mock.calls[0]!;
    expect(name).toBe('avalon');
    expect(Object.keys(exposed)).toEqual(['getAppInfo']);
    return exposed as AvalonApi;
  }
  it('exposes only the no-argument application info call', async () => {
    const bridge = await api();
    native.ipcRenderer.invoke.mockResolvedValue({ name: 'Avalon', version: '0.1.0', secret: 'discard' });
    await expect(bridge.getAppInfo()).resolves.toEqual({ name: 'Avalon', version: '0.1.0' });
    expect(native.ipcRenderer.invoke).toHaveBeenCalledWith('avalon:get-app-info');
  });
  it.each([null, {}, { name: 'Other', version: '1' }, { name: 'Avalon', version: '' }])('sanitizes invalid response %j', async (bad) => {
    const bridge = await api();
    native.ipcRenderer.invoke.mockResolvedValue(bad);
    await expect(bridge.getAppInfo()).rejects.toThrow(new Error('IPC_UNAVAILABLE'));
  });
  it('sanitizes native IPC errors', async () => {
    const bridge = await api();
    native.ipcRenderer.invoke.mockRejectedValue(new Error('private details'));
    await expect(bridge.getAppInfo()).rejects.toThrow(new Error('IPC_UNAVAILABLE'));
  });
});

describe('createMainWindow', () => {
  it.each(['file', 'dev'])('cancels %s loading after close but before destruction', async (mode) => {
    vi.stubEnv('ELECTRON_RENDERER_URL', mode === 'dev' ? 'http://127.0.0.1:5178/' : '');
    native.loading.closing = true;
    native.loading.error = new Error('ERR_FAILED: load cancelled');
    const { createMainWindow } = await import('../../src/main/window');
    await expect(createMainWindow()).resolves.toBeNull();
    expect(native.windows[0].isDestroyed()).toBe(false);
  });
  it.each([null, new Error('ERR_FAILED: load cancelled')])('returns null if the window closes during loading (%s)', async (error) => {
    native.loading.close = true;
    native.loading.error = error;
    const { createMainWindow } = await import('../../src/main/window');
    await expect(createMainWindow()).resolves.toBeNull();
  });
  it('creates the sandboxed window, loads the fixed dev URL and blocks navigation/permissions', async () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://127.0.0.1:5178');
    const { createMainWindow } = await import('../../src/main/window');
    const window = await createMainWindow() as unknown as InstanceType<typeof native.Window>;
    expect(window.options).toMatchObject({
      width: 1000, height: 700, minWidth: 640, minHeight: 480, title: 'Avalon',
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    expect(window.options.webPreferences.preload).toMatch(/[\\/]preload[\\/]index\.cjs$/);
    expect(window.loadURL).toHaveBeenCalledWith('http://127.0.0.1:5178/');
    expect(window.loadFile).not.toHaveBeenCalled();
    expect(window.webContents.setWindowOpenHandler.mock.calls[0]![0]({ url: 'https://example.com/' })).toEqual({ action: 'deny' });
    const preventDefault = vi.fn();
    window.listeners.get('will-navigate')!({ preventDefault }, 'https://example.com/');
    expect(preventDefault).toHaveBeenCalledOnce();
    const answer = vi.fn();
    native.permission.setPermissionRequestHandler.mock.calls[0]![0](window.webContents, 'notifications', answer);
    expect(answer).toHaveBeenCalledWith(false);
    expect(native.permission.setPermissionCheckHandler.mock.calls[0]![0](window.webContents, 'notifications')).toBe(false);
  });
  it('uses a local built file when no development server is present', async () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', '');
    const { createMainWindow } = await import('../../src/main/window');
    const window = await createMainWindow() as unknown as InstanceType<typeof native.Window>;
    expect(window.loadFile.mock.calls[0]![0]).toMatch(/[\\/]renderer[\\/]index\.html$/);
    expect(window.loadURL).not.toHaveBeenCalled();
  });
  it('ignores the development URL in packaged mode', async () => {
    native.app.isPackaged = true;
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://127.0.0.1:5178/');
    const { createMainWindow } = await import('../../src/main/window');
    const window = await createMainWindow() as unknown as InstanceType<typeof native.Window>;
    expect(window.loadFile).toHaveBeenCalledOnce();
    expect(window.loadURL).not.toHaveBeenCalled();
  });
  it('rejects an unexpected dev server address before loading it', async () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://127.0.0.1:5179/');
    const { createMainWindow } = await import('../../src/main/window');
    await expect(createMainWindow()).rejects.toThrow('INVALID_DEV_URL');
  });
  it('propagates a document load failure to the startup handler', async () => {
    native.loading.error = new Error('document missing');
    const { createMainWindow } = await import('../../src/main/window');
    await expect(createMainWindow()).rejects.toThrow('document missing');
  });
});

describe('bootstrap lifecycle', () => {
  it('sets real profile directories before ready and writes a successful launch snapshot', async () => {
    native.app.isPackaged = true;
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.windows).toHaveLength(1));
    expect(native.app.setPath).toHaveBeenCalledWith('userData', join(dataFixture, 'Avalon'));
    expect(native.app.setPath.mock.invocationCallOrder[0]).toBeLessThan(native.app.whenReady.mock.invocationCallOrder[0]!);
    if (process.platform === 'win32') expect(native.app.setAppUserModelId).toHaveBeenCalledWith('io.github.primedawn.avalon');
    const snapshot = JSON.parse(readFileSync(join(dataFixture, 'Avalon/logs/startup.json'), 'utf8'));
    expect(snapshot).toEqual({ event: 'app-ready', timestamp: expect.any(String), version: '0.1.0', isPackaged: true, message: null });
    expect(Number.isNaN(Date.parse(snapshot.timestamp))).toBe(false);
  });
  it('does not register a closed window or report cancellation as startup failure', async () => {
    native.loading.close = true;
    native.loading.error = new Error('ERR_FAILED: cancelled');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.windows).toHaveLength(1));
    expect(native.app.exit).not.toHaveBeenCalled();
    expect(native.dialog.showErrorBox).not.toHaveBeenCalled();
    expect(native.windows[0].listeners.has('closed')).toBe(false);
    expect(log).not.toHaveBeenCalled();
    expect(existsSync(join(dataFixture, 'Avalon-dev/logs/startup.json'))).toBe(false);
  });
  it('reports a path initialization failure without pretending a log file exists', async () => {
    writeFileSync(join(dataFixture, 'Avalon-dev'), 'file blocks directory');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.app.exit).toHaveBeenCalledWith(1));
    expect(native.app.whenReady).not.toHaveBeenCalled();
    expect(native.windows).toHaveLength(0);
    expect(native.dialog.showErrorBox).toHaveBeenCalledWith('Avalon 启动失败', expect.stringContaining('日志目录未能初始化'));
  });
  it('keeps a working window open when writing its success diagnostic fails', async () => {
    native.app.whenReady.mockImplementationOnce(async () => {
      mkdirSync(join(dataFixture, 'Avalon-dev/logs/startup.json'), { recursive: true });
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.windows).toHaveLength(1));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'diagnostic-write-failed' }));
    expect(native.app.exit).not.toHaveBeenCalled();
    expect(native.dialog.showErrorBox).not.toHaveBeenCalled();
  });
  it('registers IPC before creating one window, quits on Windows close, and reopens on activate', async () => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://127.0.0.1:5178/');
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.windows).toHaveLength(1));
    expect(native.ipcMain.handle).toHaveBeenCalledTimes(1);
    expect(native.ipcMain.handle.mock.invocationCallOrder[0]).toBeLessThan(native.windows[0].loadURL.mock.invocationCallOrder[0]);
    native.listeners.get('activate')!();
    expect(native.windows).toHaveLength(1);
    native.windows[0].destroyed = true;
    native.windows[0].listeners.get('closed')!();
    const handler = native.ipcMain.handle.mock.calls[0]![1];
    await expect(Promise.resolve().then(() => handler({}))).rejects.toThrow('IPC_UNAVAILABLE');
    native.listeners.get('window-all-closed')!();
    if (process.platform !== 'darwin') expect(native.app.quit).toHaveBeenCalledOnce();
    native.listeners.get('activate')!();
    await vi.waitFor(() => expect(native.windows).toHaveLength(2));
    expect(native.ipcMain.handle).toHaveBeenCalledTimes(1);
  });
  it('reports readiness failure and exits nonzero', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    native.app.whenReady.mockRejectedValue(new Error('readiness failed'));
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.app.exit).toHaveBeenCalledWith(1));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'app-start-failed' }));
    expect(native.windows).toHaveLength(0);
  });
  it('reports document load failure and exits nonzero instead of keeping a blank app', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    native.loading.error = new Error('document missing');
    await import('../../src/main/index');
    await vi.waitFor(() => expect(native.app.exit).toHaveBeenCalledWith(1));
    expect(native.dialog.showErrorBox).toHaveBeenCalledWith('Avalon 启动失败', expect.stringContaining('startup.json'));
    const snapshot = JSON.parse(readFileSync(join(dataFixture, 'Avalon-dev/logs/startup.json'), 'utf8'));
    expect(snapshot).toMatchObject({ event: 'app-start-failed', message: 'document missing', isPackaged: false });
  });
});
