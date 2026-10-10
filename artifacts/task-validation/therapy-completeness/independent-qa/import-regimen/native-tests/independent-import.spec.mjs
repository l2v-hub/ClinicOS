import { test, expect } from 'playwright/test';
import { guard } from './fixtures.mjs';
for (const [name, viewport] of [['desktop', { width: 1256, height: 1032 }], ['mobile', { width: 390, height: 844 }]]) {
 test(`${name}: negative and mixed PRN stay explicit unresolved source, only unmixed positive becomes PRN`, async ({ page }, info) => {
  await page.setViewportSize(viewport); const log = await guard(page); await page.goto('/qa-therapy?intake&scenario=adversarial');
  const review = page.getByTestId('discharge-therapy-review'); await expect(review).toBeVisible();
  const rows = review.getByTestId('discharge-therapy-row'); await expect(rows).toHaveCount(3);
  const negative = rows.filter({ hasText: '(23) Delta CPR' });
  const mixed = rows.filter({ hasText: '4) Gamma CPR' });
  const prn = rows.filter({ hasText: '5. Epsilon CPR' });
  await expect(negative.getByText('DELTA', { exact: true }).first()).toBeVisible();
  await expect(mixed.getByText('GAMMA', { exact: true }).first()).toBeVisible();
  await expect(prn.getByText('EPSILON', { exact: true }).first()).toBeVisible();
  for (const row of [negative, mixed]) {
   await expect(row.getByRole('radio', { name: /Al bisogno/ })).not.toBeChecked();
   await expect(row.getByRole('button', { name: 'Ho verificato questa terapia', exact: true })).toBeDisabled();
   await expect(row).toHaveAttribute('data-stato', 'da_verificare');
  }
  await expect(negative.getByTestId('discharge-original-text')).toContainText('non al bisogno');
  await expect(mixed.getByTestId('discharge-original-text')).toContainText('ore 08:00 e al bisogno');
  await expect(mixed.locator('input[type="time"]').first()).toHaveValue('08:00');
  await expect(prn.getByRole('radio', { name: /Al bisogno/ })).toBeChecked();
  await expect(prn.locator('input[type="time"]')).toHaveCount(0);
  await expect(prn.getByLabel('Note e indicazioni', { exact: true })).toHaveValue(/massimo 2 volte.*1 Cpr/);
  await prn.screenshot({ path: info.outputPath(`${name}-positive-prn-readable.png`) });
  await mixed.screenshot({ path: info.outputPath(`${name}-mixed-prn-source.png`) });
  await negative.screenshot({ path: info.outputPath(`${name}-negative-prn-source.png`) });
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
 });
}
