import { app, ipcMain, type BrowserWindow } from 'electron';
import { APP_INFO_CHANNEL, type AppInfo } from '../shared/contracts';
import { isTrustedCaller } from './ipc-policy';

// SPEC-001 writer/plan.html §3.4: one no-argument handler, no generic IPC forwarding.
export function registerAppIpc(getWindow: () => BrowserWindow | null, getDocumentUrl: () => string): () => void {
  ipcMain.handle(APP_INFO_CHANNEL, (event, ...args: unknown[]): AppInfo => {
    const window = getWindow();
    const frame = event.senderFrame;
    if (!window || window.isDestroyed() || args.length !== 0 || !frame || !isTrustedCaller({
      webContentsId: event.sender.id,
      frameUrl: frame.url,
      isMainFrame: frame === event.sender.mainFrame,
    }, window.webContents.id, getDocumentUrl())) {
      throw new Error('IPC_UNAVAILABLE');
    }
    return { name: 'Avalon', version: app.getVersion() };
  });
  return () => ipcMain.removeHandler(APP_INFO_CHANNEL);
}
