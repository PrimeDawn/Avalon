import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const evidence = process.env.AVALON_TEST_RUN_DIR;
if (!evidence) throw new Error('Use npm run test:e2e so each run has an evidence directory.');

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: resolve(evidence, 'playwright'),
  reporter: [['list'], ['json', { outputFile: resolve(evidence, 'results.json') }]],
});
