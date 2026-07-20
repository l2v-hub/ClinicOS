// QA-gate-only Playwright config (evidence folder — not repo source).
import { defineConfig } from '@playwright/test';

const EV = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/296-qa-gate-pr297';

export default defineConfig({
  testDir:
    'E:/Workspace/DG_SE_DEV/ClinicOS/.claude/worktrees/agent-ab197c4739e4043e0/artifacts/task-validation/296-qa-gate-pr297',
  testMatch: /qa296\.spec\.mjs/,
  outputDir: `${EV}/test-results`,
  timeout: 60000,
  reporter: [
    ['list'],
    ['json', { outputFile: `${EV}/test-results/results.json` }],
    ['html', { outputFolder: `${EV}/playwright-report`, open: 'never' }],
  ],
  use: {
    browserName: 'chromium',
    trace: 'on',
  },
});
