import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

// SPEC-007 writer/plan.html §3.2–3.3: installation files are never a data directory.
export type RuntimePaths = Readonly<{ userData: string; sessionData: string; logs: string }>;

export function resolveRuntimePaths(appData: string, isPackaged: boolean, userDataOverride?: string): RuntimePaths {
  if (!isAbsolute(appData)) throw new Error('INVALID_USER_DATA_PATH');
  const userData = !isPackaged && userDataOverride
    ? userDataOverride
    : join(appData, isPackaged ? 'Avalon' : 'Avalon-dev');
  if (!isAbsolute(userData)) throw new Error('INVALID_USER_DATA_PATH');
  return { userData, sessionData: join(userData, 'session'), logs: join(userData, 'logs') };
}

export function initializeRuntimePaths(): RuntimePaths {
  const paths = resolveRuntimePaths(app.getPath('appData'), app.isPackaged, app.commandLine.getSwitchValue('user-data-dir'));
  for (const directory of Object.values(paths)) mkdirSync(directory, { recursive: true });
  // Must run before app.whenReady() and before any Chromium session is created.
  app.setPath('userData', paths.userData);
  app.setPath('sessionData', paths.sessionData);
  app.setAppLogsPath(paths.logs);
  return paths;
}
