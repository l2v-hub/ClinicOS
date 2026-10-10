import { defineConfig } from 'playwright/test';
export default defineConfig({ testDir: './native-tests', testMatch: '**/geometry.spec.mjs', workers: 1,
 timeout: 15000, outputDir: './geometry-results', reporter: [['list'], ['html', { outputFolder: './geometry-report', open: 'never' }]],
 use: { baseURL: 'http://127.0.0.1:7543', trace: 'on', video: 'on', screenshot: 'on', timezoneId: 'Europe/Rome' } });
