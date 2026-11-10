import { defineConfig } from '@playwright/test';
import { isAbsolute, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const evidence = process.env.AVALON_TEST_RUN_DIR;
const executable = process.env.AVALON_PACKAGED_EXE;
if (!evidence || !executable || !isAbsolute(executable) || !existsSync(executable)) {
  throw new Error('Use test:e2e with AVALON_PACKAGED_EXE set to an existing absolute exe path.');
}
export default defineConfig({
  testDir: './tests/packaged', workers: 1, fullyParallel: false, retries: 0,
  timeout: 30_000, expect: { timeout: 8_000 },
  outputDir: resolve(evidence, 'playwright'),
  reporter: [['list'], ['json', { outputFile: resolve(evidence, 'results.json') }]],
});
