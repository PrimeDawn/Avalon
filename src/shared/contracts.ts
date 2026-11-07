// SPEC-001 writer/plan.html §3.3–3.4: the only renderer/main contract.
export type AppInfo = { name: 'Avalon'; version: string };
export interface AvalonApi { getAppInfo(): Promise<AppInfo> }
export type ConnectionState =
  | { status: 'idle' | 'checking' }
  | { status: 'ready'; info: AppInfo }
  | { status: 'error'; message: string };
export const APP_INFO_CHANNEL = 'avalon:get-app-info';
