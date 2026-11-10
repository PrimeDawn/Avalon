import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { writeStartupDiagnostic, type StartupDiagnostic } from '../../src/main/startup-diagnostics';

let fixture: string;
const ready: StartupDiagnostic = {
  event: 'app-ready', timestamp: '2026-11-09T09:00:00.000Z', version: '0.1.0', isPackaged: true, message: null,
};
beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'avalon-diagnostic-')); });
afterEach(() => {
  if (!resolve(fixture).startsWith(join(tmpdir(), 'avalon-diagnostic-'))) throw new Error('Unexpected fixture path');
  rmSync(fixture, { recursive: true, force: true });
});
describe('startup snapshot (SPEC-007 plan §3.2–3.3)', () => {
  it('writes a readable UTF-8 snapshot without requiring a console', () => {
    writeStartupDiagnostic(fixture, ready);
    expect(readdirSync(fixture)).toEqual(['startup.json']);
    expect(JSON.parse(readFileSync(join(fixture, 'startup.json'), 'utf8'))).toEqual(ready);
  });
  it('replaces the previous launch snapshot instead of growing an unbounded history', () => {
    writeStartupDiagnostic(fixture, ready);
    const failed: StartupDiagnostic = { ...ready, event: 'app-start-failed', message: '资源 加载失败' };
    writeStartupDiagnostic(fixture, failed);
    expect(readdirSync(fixture)).toEqual(['startup.json']);
    expect(JSON.parse(readFileSync(join(fixture, 'startup.json'), 'utf8'))).toEqual(failed);
  });
  it('propagates write failures to let the caller preserve stderr diagnostics', () => {
    expect(() => writeStartupDiagnostic(join(fixture, 'missing'), ready)).toThrow();
  });
});
