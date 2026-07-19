import { defineConfig } from '@playwright/test';

// Issue #241 remediation — PUT bypasses giorniSettimana normalization.
// Executed by the controller against the shared local stack (frontend :5173, backend :3001).
export default defineConfig({
  testDir: '.',
  testMatch: 'issue-241.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  outputDir: '../../artifacts/task-validation/241-medication-weekday-schedule/test-results',
  reporter: [
    [
      'html',
      {
        outputFolder:
          '../../artifacts/task-validation/241-medication-weekday-schedule/playwright-report',
        open: 'never',
      },
    ],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    viewport: { width: 1366, height: 768 },
  },
});
