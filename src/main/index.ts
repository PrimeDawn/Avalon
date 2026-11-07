import { app, BrowserWindow } from 'electron';
import { registerAppIpc } from './ipc';
import { createMainWindow, getDocumentUrl } from './window';

let mainWindow: BrowserWindow | null = null;

function failStartup(error: unknown): void {
  console.error({ event: 'app-start-failed', message: error instanceof Error ? error.message : String(error) });
  app.exit(1);
}

async function openWindow(): Promise<void> {
  const window = await createMainWindow();
  mainWindow = window;
  window.on('closed', () => { if (mainWindow === window) mainWindow = null; });
}

// SPEC-001 writer/plan.html §3.2–3.4: ready → IPC → window; no persistent background app on Windows.
export async function bootstrap(): Promise<void> {
  try {
    await app.whenReady();
    const dispose = registerAppIpc(() => mainWindow, getDocumentUrl);
    app.on('will-quit', dispose);
    app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void openWindow().catch(failStartup);
    });
    await openWindow();
  } catch (error) {
    failStartup(error);
  }
}
void bootstrap();
