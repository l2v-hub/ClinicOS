import { defineConfig, devices } from '@playwright/test';

// Evidence-remediation harness. One issue per invocation: set EV_OUT to the issue's evidence dir so
// screenshots, trace.zip, video.webm, test-results/ and the HTML playwright-report/ land there.
const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';

export default defineConfig({
  testDir: './tests',
  outputDir: `${OUT}/test-results`,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: `${OUT}/playwright-report`, open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
  ],
});
