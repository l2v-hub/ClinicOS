import { defineConfig, devices } from '@playwright/test';
const OUT = process.env.EV_OUT ?? 'out';
export default defineConfig({
  testDir: './tests', outputDir: `${OUT}/test-results`, timeout: 120000,
  expect: { timeout: 20000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { outputFolder: `${OUT}/playwright-report`, open: 'never' }]],
  use: { trace: 'on', video: 'on', screenshot: 'on' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
