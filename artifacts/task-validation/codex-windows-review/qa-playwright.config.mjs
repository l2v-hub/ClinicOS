import { defineConfig } from 'playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'qa-readiness.spec.mjs',
  workers: 1,
  outputDir: 'test-results/browser',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    viewport: { width: 1200, height: 1100 },
    trace: 'on',
    video: 'on',
    launchOptions: { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] },
  },
});
