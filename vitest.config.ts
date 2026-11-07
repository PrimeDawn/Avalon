import { defineConfig } from 'vitest/config';

// SPEC-001 writer/plan.html §3.5: executor owns focused Node tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
