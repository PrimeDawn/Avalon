import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initializeRuntimePaths, resolveRuntimePaths } from '../../src/main/runtime-paths';

const native = vi.hoisted(() => ({
  isPackaged: false,
  getPath: vi.fn(), setPath: vi.fn(), setAppLogsPath: vi.fn(),
  commandLine: { getSwitchValue: vi.fn() },
}));
vi.mock('electron', () => ({ app: native }));

let fixture: string;
beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'avalon-paths-'));
  native.isPackaged = false;
  native.getPath.mockReturnValue(fixture);
  native.commandLine.getSwitchValue.mockReturnValue('');
});
afterEach(() => {
  if (!resolve(fixture).startsWith(join(tmpdir(), 'avalon-paths-'))) throw new Error('Unexpected fixture path');
  rmSync(fixture, { recursive: true, force: true });
});

describe('runtime path boundaries (SPEC-007 plan §3.2–3.3)', () => {
  it('separates packaged data, browser session and logs under the system application data root', () => {
    const root = join(fixture, '用户 空格');
    expect(resolveRuntimePaths(root, true)).toEqual({
      userData: join(root, 'Avalon'), sessionData: join(root, 'Avalon', 'session'), logs: join(root, 'Avalon', 'logs'),
    });
  });
  it('isolates development data from packaged data', () => {
    expect(resolveRuntimePaths(fixture, false).userData).toBe(join(fixture, 'Avalon-dev'));
  });
  it('accepts an absolute test profile only in development', () => {
    const profile = join(fixture, '隔离 用户');
    expect(resolveRuntimePaths(fixture, false, profile)).toEqual({
      userData: profile, sessionData: join(profile, 'session'), logs: join(profile, 'logs'),
    });
    expect(resolveRuntimePaths(fixture, true, profile).userData).toBe(join(fixture, 'Avalon'));
  });
  it.each(['', 'relative/root'])('rejects an invalid application data root: %j', (root) => {
    expect(() => resolveRuntimePaths(root, false)).toThrow('INVALID_USER_DATA_PATH');
  });
  it('rejects a relative development profile but ignores overrides in packaged mode', () => {
    expect(() => resolveRuntimePaths(fixture, false, 'relative')).toThrow('INVALID_USER_DATA_PATH');
    expect(resolveRuntimePaths(fixture, true, 'relative').userData).toBe(join(fixture, 'Avalon'));
    expect(resolveRuntimePaths(fixture, false, '').userData).toBe(join(fixture, 'Avalon-dev'));
  });
  it('creates real directories before configuring the native Electron paths', () => {
    native.isPackaged = true;
    native.setPath.mockImplementation((_name: string, directory: string) => expect(existsSync(directory)).toBe(true));
    native.setAppLogsPath.mockImplementation((directory: string) => expect(existsSync(directory)).toBe(true));
    const actual = initializeRuntimePaths();
    expect(native.getPath).toHaveBeenCalledWith('appData');
    expect(actual.userData).toBe(join(fixture, 'Avalon'));
    for (const directory of Object.values(actual)) expect(existsSync(directory)).toBe(true);
    expect(native.setPath).toHaveBeenCalledWith('userData', actual.userData);
    expect(native.setPath).toHaveBeenCalledWith('sessionData', actual.sessionData);
    expect(native.setAppLogsPath).toHaveBeenCalledWith(actual.logs);
  });
  it('uses the Electron command line override for a development test profile', () => {
    const profile = join(fixture, '开发 测试');
    native.commandLine.getSwitchValue.mockReturnValue(profile);
    expect(initializeRuntimePaths().userData).toBe(profile);
    expect(native.commandLine.getSwitchValue).toHaveBeenCalledWith('user-data-dir');
  });
  it('propagates a real filesystem failure without configuring a broken directory', () => {
    writeFileSync(join(fixture, 'Avalon-dev'), 'not a directory');
    expect(() => initializeRuntimePaths()).toThrow();
    expect(native.setPath).not.toHaveBeenCalled();
    expect(native.setAppLogsPath).not.toHaveBeenCalled();
  });
});
