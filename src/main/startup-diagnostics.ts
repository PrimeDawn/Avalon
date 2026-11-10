import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// SPEC-007 writer/plan.html §3.2–3.3: one bounded snapshot, no manuscript contents.
export type StartupDiagnostic = Readonly<{
  event: 'app-ready' | 'app-start-failed';
  timestamp: string;
  version: string;
  isPackaged: boolean;
  message: string | null;
}>;

export function writeStartupDiagnostic(logs: string, diagnostic: StartupDiagnostic): void {
  writeFileSync(join(logs, 'startup.json'), JSON.stringify(diagnostic, null, 2) + '\n', 'utf8');
}
