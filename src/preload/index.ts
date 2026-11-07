import { contextBridge, ipcRenderer } from 'electron';
import { APP_INFO_CHANNEL, type AppInfo, type AvalonApi } from '../shared/contracts';

// SPEC-001 writer/plan.html §3.4: return a fresh validated object, never native IPC objects.
async function getAppInfo(): Promise<AppInfo> {
  try {
    const info: unknown = await ipcRenderer.invoke(APP_INFO_CHANNEL);
    if (!info || typeof info !== 'object' || !('name' in info) || info.name !== 'Avalon' ||
        !('version' in info) || typeof info.version !== 'string' || !info.version.trim()) {
      throw new Error('IPC_UNAVAILABLE');
    }
    return { name: 'Avalon', version: info.version };
  } catch {
    throw new Error('IPC_UNAVAILABLE');
  }
}

const api: AvalonApi = { getAppInfo };
contextBridge.exposeInMainWorld('avalon', api);
