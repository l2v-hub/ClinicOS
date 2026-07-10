import { defineConfig } from '@playwright/test';

// #243 remediation — executed later by the controller against the live local stack.
export default defineConfig({
  testDir: '.',
  testMatch: 'issue-243.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  outputDir: '../../artifacts/task-validation/243-modules-section-operational/test-results',
  reporter: [
    ['html', { outputFolder: '../../artifacts/task-validation/243-modules-section-operational/playwright-report', open: 'never' }],
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
