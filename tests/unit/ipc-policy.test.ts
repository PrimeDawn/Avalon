import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import { isTrustedCaller, type IpcCaller } from '../../src/main/ipc-policy';
import type { UserConfig } from 'electron-vite';
import type { Plugin } from 'vite';

// SPEC-001 writer/plan.html §3.4: IDs and URL come from Electron, never renderer input.
const devUrl = 'http://127.0.0.1:5178/';
const caller: IpcCaller = { webContentsId: 7, frameUrl: devUrl, isMainFrame: true };

describe('isTrustedCaller', () => {
  it('accepts only the expected main-frame document in the expected window', () => {
    expect(isTrustedCaller(caller, 7, devUrl)).toBe(true);
  });

  it('accepts the exact built document URL with Chinese and spaces', () => {
    const fileUrl = pathToFileURL('C:/小说 工作台/out/renderer/index.html').href;
    expect(isTrustedCaller({ ...caller, frameUrl: fileUrl }, 7, fileUrl)).toBe(true);
  });

  it.each([
    { ...caller, webContentsId: 8 },
    { ...caller, isMainFrame: false },
    { ...caller, frameUrl: 'http://127.0.0.1:5173/' },
    { ...caller, frameUrl: 'http://localhost:5178/' },
    { ...caller, frameUrl: 'https://example.com/' },
    { ...caller, frameUrl: `${devUrl}other` },
    { ...caller, frameUrl: `${devUrl}?other=1` },
    { ...caller, frameUrl: `${devUrl}#other` },
    { ...caller, frameUrl: 'not a URL' },
    { ...caller, frameUrl: '' },
  ])('rejects untrusted caller %j without throwing', (untrusted) => {
    expect(isTrustedCaller(untrusted, 7, devUrl)).toBe(false);
  });

  it('rejects matching but invalid or unsupported URLs', () => {
    for (const url of ['', 'not a URL', 'javascript:alert(1)', 'about:blank']) {
      expect(isTrustedCaller({ ...caller, frameUrl: url }, 7, url)).toBe(false);
    }
  });
});

describe('development and build configuration', () => {
  async function config(command: 'serve' | 'build'): Promise<UserConfig> {
    const { default: configure } = await import('../../electron.vite.config');
    return configure({ command, mode: command === 'serve' ? 'development' : 'production' });
  }
  it('pins the server to loopback 5178 with no silent fallback', async () => {
    expect((await config('serve')).renderer?.server).toMatchObject({ host: '127.0.0.1', port: 5178, strictPort: true });
  });
  it('emits standalone CJS entry points for main and sandboxed preload', async () => {
    const options = await config('build');
    for (const target of [options.main, options.preload]) {
      expect(target?.build?.rolldownOptions?.output).toMatchObject({ format: 'cjs', entryFileNames: 'index.cjs', codeSplitting: false });
    }
    expect(options.preload?.build?.externalizeDeps).toBe(false);
  });
  it.each(['serve', 'build'] as const)('writes the %s CSP into the resulting HTML', async (command) => {
    const plugins = (await config(command)).renderer?.plugins?.flat() as Plugin[] | undefined;
    const hook = plugins?.find((plugin) => plugin && plugin.name === 'avalon-csp')?.transformIndexHtml;
    expect(hook).toBeTypeOf('function');
    const transform = hook as (html: string) => string;
    const html = transform('<meta http-equiv="Content-Security-Policy" content="__AVALON_CSP__">');
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("object-src 'none'; base-uri 'none'");
    expect(html).not.toContain('__AVALON_CSP__');
    if (command === 'serve') expect(html).toContain("connect-src 'self' ws://127.0.0.1:5178");
    else {
      expect(html).toContain("connect-src 'none'");
      expect(html).not.toContain('unsafe-inline');
      expect(html).not.toContain('127.0.0.1');
    }
  });
});
