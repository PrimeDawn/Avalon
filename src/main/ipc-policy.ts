// SPEC-001 writer/plan.html §3.4: validate native caller identity and exact document.
export type IpcCaller = { webContentsId: number; frameUrl: string; isMainFrame: boolean };
export function isTrustedCaller(caller: IpcCaller, expectedId: number, expectedUrl: string): boolean {
  if (!caller.isMainFrame || caller.webContentsId !== expectedId || caller.frameUrl !== expectedUrl) {
    return false;
  }
  try {
    const url = new URL(caller.frameUrl);
    return url.protocol === 'http:' || url.protocol === 'file:';
  } catch {
    return false;
  }
}
