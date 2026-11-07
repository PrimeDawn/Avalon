import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AvalonApi } from '../../src/shared/contracts';
import { checkConnection } from '../../src/renderer/src/connection';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../src/renderer/src/App';

// SPEC-001 writer/plan.html §3.4; bridge is a process boundary, not the subject.
const info = { name: 'Avalon' as const, version: '0.1.0' };
const message = '连接失败，请重试';

afterEach(() => { vi.useRealTimers(); });

it('renders a readable idle shell with a connection button before any IPC', () => {
  const html = renderToStaticMarkup(createElement(App));
  expect(html).toContain('Avalon');
  expect(html).toContain('工作台已启动');
  expect(html).toMatch(/<button[^>]*>检查连接<\/button>/);
  expect(html).not.toContain('disabled');
  expect(html).not.toContain('连接正常');
});

describe('checkConnection', () => {
  it('returns valid application information and clears its timeout', async () => {
    vi.useFakeTimers();
    await expect(checkConnection({ getAppInfo: async () => info })).resolves.toEqual(info);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a missing bridge with a safe, retryable message', async () => {
    await expect(checkConnection(undefined)).rejects.toThrow(message);
  });

  it('conceals IPC error details and allows a later retry', async () => {
    vi.useFakeTimers();
    const api = { getAppInfo: vi.fn().mockRejectedValueOnce(new Error('private path')).mockResolvedValueOnce(info) };
    await expect(checkConnection(api)).rejects.toThrow(new Error(message));
    expect(vi.getTimerCount()).toBe(0);
    await expect(checkConnection(api)).resolves.toEqual(info);
  });

  it('handles synchronous bridge failure', async () => {
    await expect(checkConnection({ getAppInfo: () => { throw new Error('private'); } })).rejects.toThrow(message);
  });

  it.each([null, undefined, {}, { name: 'Other', version: '1' }, { name: 'Avalon', version: '' }, { name: 'Avalon', version: 1 }])('rejects malformed response %j', async (value) => {
    const api = { getAppInfo: async () => value } as AvalonApi;
    await expect(checkConnection(api)).rejects.toThrow(message);
  });

  it('times out at 3000 ms, then handles a late rejection without leaking a timer', async () => {
    vi.useFakeTimers();
    let fail!: (error: Error) => void;
    const result = checkConnection({ getAppInfo: () => new Promise((_, reject) => { fail = reject; }) });
    const outcome = result.then((value) => ({ value, error: undefined }), (error: Error) => ({ value: undefined, error }));
    let settled = false;
    void result.catch(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(2999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await outcome).error).toEqual(new Error(message));
    expect(vi.getTimerCount()).toBe(0);
    fail(new Error('late private error'));
    await Promise.resolve();
  });

  it('supports an explicit timeout for focused callers', async () => {
    vi.useFakeTimers();
    const result = checkConnection({ getAppInfo: () => new Promise(() => {}) }, 10);
    const outcome = result.then((value) => ({ value, error: undefined }), (error: Error) => ({ value: undefined, error }));
    await vi.advanceTimersByTimeAsync(10);
    expect((await outcome).error).toEqual(new Error(message));
    expect(vi.getTimerCount()).toBe(0);
  });
});
