import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// SPEC-001 writer/plan.html §3.2: paths are relative to out/main/index.cjs.
const rendererFile = join(__dirname, '../renderer/index.html');
const devUrl = 'http://127.0.0.1:5178/';

export function getDocumentUrl(): string {
  const configured = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && configured) {
    if (configured !== devUrl && configured !== devUrl.slice(0, -1)) {
      throw new Error('INVALID_DEV_URL');
    }
    return devUrl;
  }
  return pathToFileURL(rendererFile).href;
}

// SPEC-001 writer/plan.html §3.4: loading is awaited and failures reach bootstrap.
export async function createMainWindow(): Promise<BrowserWindow | null> {
  const url = getDocumentUrl();
  const window = new BrowserWindow({
    title: 'Avalon',
    width: 1000, height: 700, minWidth: 640, minHeight: 480,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // Fix: debugger/debug-002.html — load rejection can precede native destruction.
  let closing = false;
  window.on('close', () => { closing = true; });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => {
    if (target !== url) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  // SPEC-007 writer/plan.html §3.3: a user closing the loading window cancels startup.
  // A genuine load failure in a live window must still reach the failure handler.
  try {
    if (url === devUrl) await window.loadURL(url);
    else await window.loadFile(rendererFile);
  } catch (error) {
    if (closing || window.isDestroyed()) return null;
    throw error;
  }
  return closing || window.isDestroyed() ? null : window;
}
