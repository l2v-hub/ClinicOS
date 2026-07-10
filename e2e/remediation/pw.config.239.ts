import { defineConfig } from '@playwright/test';

// Issue #239 — Agnos chatbot plan routing (rooms_occupancy aggregate + plural terapie),
// ported onto current main (branch fix/239-rooms-occupancy-port). Drives the LIVE Agnos
// panel against one running stack (:5173 UI / :3001 ported backend, deterministic mode).
// Evidence lands under artifacts/task-validation/239-agnos-chatbot-plan-routing/.
export default defineConfig({
  testDir: '.',
  testMatch: /issue-239\.spec\.ts$/,
  timeout: 120_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  outputDir: '../../artifacts/task-validation/239-agnos-chatbot-plan-routing/test-results',
  reporter: [
    ['html', { outputFolder: '../../artifacts/task-validation/239-agnos-chatbot-plan-routing/playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    viewport: { width: 1366, height: 768 },
  },
});
