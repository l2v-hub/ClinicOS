import { defineConfig } from '@playwright/test';

// Remediation evidence config for issue #225 (docs-only: Azure backend config principles).
// This issue has no product UI — the QA surface is a doc-render page built by the spec itself
// (see issue-225.spec.ts). Output is packaged under the canonical evidence dir so Codex's gate
// finds test-results/ + playwright-report/ + trace/video/screenshot in one place.
export default defineConfig({
  testDir: '.',
  testMatch: 'issue-225.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  outputDir: '../../artifacts/task-validation/225-preparazione-futuro-backend-azure/test-results',
  reporter: [
    ['html', { outputFolder: '../../artifacts/task-validation/225-preparazione-futuro-backend-azure/playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    viewport: { width: 1366, height: 768 },
  },
});
