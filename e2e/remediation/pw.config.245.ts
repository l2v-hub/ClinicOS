import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'issue-245.spec.ts', timeout: 90_000, retries: 0, workers: 1,
  outputDir: '../../artifacts/task-validation/245-remove-duplicate-anamnesis/test-results',
  reporter: [['html', { outputFolder: '../../artifacts/task-validation/245-remove-duplicate-anamnesis/playwright-report', open: 'never' }], ['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'on', video: 'on', screenshot: 'on', viewport: { width: 1366, height: 768 } },
});
