import { defineConfig } from '@playwright/test';

const EVIDENCE = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/263-qa-gate-pr293';

export default defineConfig({
  testDir: 'E:/Workspace/DG_SE_DEV/ClinicOS/.claude/worktrees/agent-a3bf3eb1f0b21e88a/artifacts/task-validation/263-qa-gate-pr293',
  testMatch: '**/qa-report.spec.mjs',
  outputDir: `${EVIDENCE}/test-results`,
  timeout: 60000,
  use: {
    browserName: 'chromium',
    trace: 'on',
    viewport: { width: 1280, height: 900 },
  },
  reporter: [
    ['list'],
    ['json', { outputFile: `${EVIDENCE}/test-results/results.json` }],
  ],
});
