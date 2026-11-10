import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import { registerAppIpc } from './ipc';
import { createMainWindow, getDocumentUrl } from './window';
import { initializeRuntimePaths, type RuntimePaths } from './runtime-paths';
import { writeStartupDiagnostic } from './startup-diagnostics';

let mainWindow: BrowserWindow | null = null;
let runtimePaths: RuntimePaths | null = null;

function failStartup(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error({ event: 'app-start-failed', message });
  let detail = '日志目录未能初始化，请检查用户数据目录是否可写。';
  if (runtimePaths) {
    try {
      writeStartupDiagnostic(runtimePaths.logs, {
        event: 'app-start-failed', timestamp: new Date().toISOString(),
        version: app.getVersion(), isPackaged: app.isPackaged, message,
      });
      detail = `诊断记录：${join(runtimePaths.logs, 'startup.json')}`;
    } catch (logError) {
      console.error({ event: 'diagnostic-write-failed', message: logError instanceof Error ? logError.message : String(logError) });
      detail = `启动日志写入失败，请检查目录：${runtimePaths.logs}`;
    }
  }
  dialog.showErrorBox('Avalon 启动失败', `无法打开 Avalon。\n${detail}`);
  app.exit(1);
}

async function openWindow(): Promise<void> {
  const window = await createMainWindow();
  if (!window) return;
  mainWindow = window;
  window.on('closed', () => { if (mainWindow === window) mainWindow = null; });
}

// SPEC-007 writer/plan.html §3.3: paths before ready, then the SPEC-001 IPC/window lifecycle.
export async function bootstrap(): Promise<void> {
  try {
    runtimePaths = initializeRuntimePaths();
    if (process.platform === 'win32') app.setAppUserModelId('io.github.primedawn.avalon');
    await app.whenReady();
    const dispose = registerAppIpc(() => mainWindow, getDocumentUrl);
    app.on('will-quit', dispose);
    app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void openWindow().catch(failStartup);
    });
    await openWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        writeStartupDiagnostic(runtimePaths.logs, {
          event: 'app-ready', timestamp: new Date().toISOString(),
          version: app.getVersion(), isPackaged: app.isPackaged, message: null,
        });
      } catch (error) {
        console.error({ event: 'diagnostic-write-failed', message: error instanceof Error ? error.message : String(error) });
      }
    }
  } catch (error) {
    failStartup(error);
  }
}
void bootstrap();
