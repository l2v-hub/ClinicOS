import { defineConfig } from 'playwright/test';
export default defineConfig({ testDir: './native-tests', testMatch: '**/readable.spec.mjs', workers: 1,
 timeout: 45000, outputDir: './readable-results', reporter: [['list'], ['html', { outputFolder: './readable-report', open: 'never' }]],
 use: { baseURL: 'http://127.0.0.1:7543', trace: 'on', video: 'on', screenshot: 'only-on-failure', timezoneId: 'Europe/Rome' } });
