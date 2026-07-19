import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'issue-244.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  outputDir: '../../artifacts/task-validation/244-allergies-absent-denied/test-results',
  reporter: [
    [
      'html',
      {
        outputFolder:
          '../../artifacts/task-validation/244-allergies-absent-denied/playwright-report',
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
