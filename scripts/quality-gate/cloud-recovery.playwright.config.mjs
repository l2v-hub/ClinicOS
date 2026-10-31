import { defineConfig } from 'playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(
  cwd,
  process.env.CLOUD_RECOVERY_EVIDENCE_DIR ??
    'artifacts/task-validation/520-cloud-same-round-recovery/evidence/browser',
);
export default defineConfig({
  testDir: '.',
  testMatch: 'cloud-recovery-evidence.spec.mjs',
  workers: 1,
  retries: 0,
  outputDir: path.join(output, 'test-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(output, 'playwright-report'), open: 'never' }],
  ],
  use: {
    viewport: { width: 1180, height: 1100 },
    trace: 'on',
    video: 'on',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
});
