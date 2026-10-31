import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evidenceServer } from './cloud-recovery-evidence.mjs';

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(
  cwd,
  process.env.CLOUD_RECOVERY_EVIDENCE_DIR ??
    'artifacts/task-validation/520-cloud-same-round-recovery/evidence/browser',
);
test('one synthetic recovery preserves the consumed fifth round after disk reload', async ({
  page,
}) => {
  const server = await evidenceServer(output, cwd);
  const errors = [];
  page.on('console', (event) => {
    if (event.type() === 'error') errors.push('console-error');
  });
  page.on('pageerror', () => errors.push('page-error'));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`http-${response.status()}`);
  });
  await page.route('**/*', (route) => {
    if (
      route
        .request()
        .url()
        .startsWith(server.url + '/')
    )
      return route.continue();
    errors.push('non-loopback-request');
    return route.abort();
  });
  try {
    await page.goto(server.url);
    const assertValues = async () => {
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#source')).toHaveText(server.result.sourceSha);
      for (const [key, value] of Object.entries({
        originalConsumedRounds: 5,
        reviewLimit: 5,
        originalFailure: 'failed-authentication-no-inference',
        executionStatus: 'published',
        technicalExecutions: 1,
        mockReviewPosts: 1,
        actualClaudeCalls: 0,
        accountingPreserved: true,
        reportPreserved: true,
        replayRejected: true,
        realMergeOrDeploy: false,
      })) {
        await expect(page.locator(`#${key}`)).toBeVisible();
        await expect(page.locator(`#${key}`)).toHaveText(String(value));
      }
    };
    await assertValues();
    await page.reload();
    await assertValues();
    const persisted = await page.request.get(server.url + '/result.json');
    expect(persisted.ok()).toBe(true);
    expect(await persisted.json()).toEqual(server.result);
    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(output, 'result.png'), fullPage: true });
  } finally {
    await server.close();
  }
});
