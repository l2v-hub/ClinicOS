// Playwright verification of the QA-263-016 evidence surface (file:// static HTML).
// Real assertions: regression tests show "pass", totals show 0 failures, no console errors.
import { test, expect } from '@playwright/test';

const EVIDENCE = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/263-qa-gate-pr293';
const HEAD_SHA = '14d50e3c171a323de74536589f5ae24f564d5168';

test('QA-263-016 evidence surface shows both regression tests passing, 0 failures, roots-ignored ok', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(`file:///${EVIDENCE}/qa-report.html`);

  // PR head SHA is displayed
  await expect(page.locator('#head-sha')).toHaveText(HEAD_SHA);

  // Both QA-263-016 regression tests are listed by exact name and marked pass
  const t1 = page.locator('#regression-1');
  const t2 = page.locator('#regression-2');
  await expect(t1).toContainText(
    'doctor passes ignore validation on a real fresh checkout where the roots do not exist (QA-263-016)',
  );
  await expect(t1.locator('.badge')).toHaveText('pass');
  await expect(t1.locator('.badge')).toHaveAttribute('data-status', 'pass');
  await expect(t2).toContainText(
    'doctor fails closed on a real repository whose gitignore lacks the root rules (QA-263-016)',
  );
  await expect(t2.locator('.badge')).toHaveText('pass');
  await expect(t2.locator('.badge')).toHaveAttribute('data-status', 'pass');

  // Totals: 19 tests, 19 pass, 0 fail
  await expect(page.locator('#total-tests')).toHaveText('19');
  await expect(page.locator('#total-pass')).toHaveText('19');
  await expect(page.locator('#total-fail')).toHaveText('0');

  // Live doctor roots-ignored check is ok
  const rootsRow = page.locator('#roots-ignored-row');
  await expect(rootsRow).toBeVisible();
  await expect(rootsRow.locator('.badge')).toHaveText('pass');
  await expect(rootsRow).toContainText('roots-ignored');

  // No console errors on the evidence page
  expect(consoleErrors).toEqual([]);

  await page.screenshot({
    path: `${EVIDENCE}/screenshots/qa-report-final.png`,
    fullPage: true,
  });
});
