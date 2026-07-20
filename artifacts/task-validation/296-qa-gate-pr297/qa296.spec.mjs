// QA gate #296 / PR #297 — asserts the qa-report.html surface (real parser outputs).
import { test, expect } from '@playwright/test';

const EV = 'E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/296-qa-gate-pr297';
const URL =
  'file:///E:/Workspace/DG_SE_DEV/ClinicOS/artifacts/task-validation/296-qa-gate-pr297/qa-report.html';

test('#296 QA surface: 18/18 pass, 5 #296 tests PASS, spurious rows = 0, no console errors', async ({
  page,
}) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(URL);

  // Head SHA of the audited PR is displayed.
  await expect(page.locator('#head-sha')).toHaveText('5f249ccd0513493bcf6e6b379aee03882481d45a');

  // Parser suite totals on PR head: 18 passed, 0 failed.
  await expect(page.locator('#total-pass')).toHaveText('18');
  await expect(page.locator('#total-fail')).toHaveText('0');
  await expect(page.locator('#total-tests')).toHaveText('18');

  // The 5 #296 tests are listed and every one is PASS.
  const rows296 = page.locator('#tests-296 tr').filter({ hasText: '#296' });
  await expect(rows296).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(rows296.nth(i).locator('td').nth(1)).toHaveText('PASS');
  }

  // Demonstration: old parser produced 13 rows (3 spurious from prose); new parser 10 rows, 0 spurious.
  await expect(page.locator('#old-rows')).toHaveText('13');
  await expect(page.locator('#old-spurious')).toHaveText('3');
  await expect(page.locator('#new-rows')).toHaveText('10');
  await expect(page.locator('#new-spurious')).toHaveText('0');

  // New parser keeps exactly the 10 real prescriptions.
  await expect(page.locator('#new-names')).toHaveText(
    'KEPPRA, EUTIROX, CACIT, KANRENOL, LASIX, FOLINA, LATTULAC, MEDROL, CETIRIZINA, PEVARYL',
  );
  // And none of the prose-derived spurious names.
  const newNames = await page.locator('#new-names').innerText();
  for (const bad of ['SI,', 'PROSEGUIRE', 'IN,']) expect(newNames).not.toContain(bad);

  // Zero console errors on the surface.
  expect(consoleErrors).toEqual([]);

  await page.screenshot({ path: `${EV}/screenshots/qa-report-296.png`, fullPage: true });
});
