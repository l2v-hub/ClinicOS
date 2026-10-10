import { defineConfig } from 'playwright/test';
export default defineConfig({ testDir: './native-tests', workers: 1, fullyParallel: false, timeout: 45000,
  outputDir: './test-results', reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:7543', trace: 'on', video: 'on', screenshot: 'only-on-failure', timezoneId: 'Europe/Rome' } });
