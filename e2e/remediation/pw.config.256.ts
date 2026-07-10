import { defineConfig } from '@playwright/test';

// Issue #256 — suite Playwright INTEGRATA: esegue le 5 spec di scenario (A–E) contro UN
// solo stack integrato (branch integration/issue-256-qa-closure), non overlay per-PR.
//   A #241 issue-241.spec.ts · B #242 issue-242.spec.ts · C #243 issue-243.spec.ts
//   D #244 issue-244.spec.ts · E #245 issue-245.spec.ts
// Serializzato (workers:1) sullo stack condiviso :5173/:3001.
export default defineConfig({
  testDir: '.',
  testMatch: /issue-24[12345]\.spec\.ts$/,
  timeout: 120_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  outputDir: '../../artifacts/task-validation/256-integrate-qa-passed-prs/test-results',
  reporter: [
    ['html', { outputFolder: '../../artifacts/task-validation/256-integrate-qa-passed-prs/playwright-report', open: 'never' }],
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
