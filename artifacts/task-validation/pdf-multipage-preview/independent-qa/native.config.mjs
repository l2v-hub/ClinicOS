import { defineConfig } from 'playwright/test';
import { resolve } from 'node:path';
const dir = resolve('artifacts/task-validation/pdf-multipage-preview/independent-qa');
export default defineConfig({
  testDir: resolve(dir, 'native-tests'), workers: 1, retries: 0,
  outputDir: resolve(dir, 'test-results'),
  reporter: [['html', { outputFolder: resolve(dir, 'playwright-report'), open: 'never' }], ['list']],
  timeout: 120000,
});
