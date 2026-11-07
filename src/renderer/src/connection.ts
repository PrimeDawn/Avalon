import type { AppInfo, AvalonApi } from '../../shared/contracts';

// SPEC-001 writer/plan.html §3.4: bounded wait and user-facing errors, no native error details.
export async function checkConnection(api: AvalonApi | undefined, timeoutMs = 3000): Promise<AppInfo> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!api || typeof api.getAppInfo !== 'function') throw new Error('missing bridge');
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    const info: unknown = await Promise.race([api.getAppInfo(), timeout]);
    if (!info || typeof info !== 'object' || !('name' in info) || info.name !== 'Avalon' ||
        !('version' in info) || typeof info.version !== 'string' || !info.version.trim()) {
      throw new Error('invalid response');
    }
    return { name: 'Avalon', version: info.version };
  } catch {
    throw new Error('连接失败，请重试');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
