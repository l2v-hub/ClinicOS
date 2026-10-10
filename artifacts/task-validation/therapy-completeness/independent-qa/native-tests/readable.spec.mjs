import { test, expect } from 'playwright/test';
import { guard } from './fixtures.mjs';
for (const [name, viewport] of [['desktop', { width: 1256, height: 1032 }], ['mobile', { width: 390, height: 844 }]]) {
 test(`${name}: readable verified late medicines, PRN and missing feed`, async ({ page }, info) => {
  await page.setViewportSize(viewport); const log = await guard(page); await page.goto('/qa-therapy');
  await page.getByRole('button', { name: 'Settimana', exact: true }).click();
  const prn = page.getByRole('region', { name: 'Al bisogno', exact: true });
  await expect(prn).toBeVisible(); await expect(prn.locator('li')).toHaveCount(2);
  await expect(prn).toContainText('Farmaco sintetico 101'); await expect(prn).toContainText('Farmaco sintetico 104');
  await expect(prn.locator('li').filter({ hasText: 'Farmaco sintetico 104' }).getByRole('button')).toHaveCount(0);
  await prn.screenshot({ path: info.outputPath(`${name}-prn-readable.png`) });
  await page.getByRole('button', { name: 'Giorno', exact: true }).click();
  await page.locator('[data-testid="therapy-calendar-cell"][data-time="08:00"]').click();
  const row = page.getByRole('list', { name: 'Prescrizioni dell’orario' }).locator('li').filter({ hasText: 'Farmaco sintetico 001' });
  await expect(row).toBeVisible(); await expect(row).toContainText('stato della dose non disponibile');
  await expect(row.getByRole('button')).toHaveCount(0);
  await row.screenshot({ path: info.outputPath(`${name}-missing-feed-readable.png`) });
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
  await page.getByRole('tab', { name: 'Piano terapeutico' }).click();
  for (const id of ['100', '101', '104', '105', '106', '107']) {
   const medicine = page.locator(`[data-therapy-id="${id}"]`); await expect(medicine).toBeVisible();
   await expect(medicine).toContainText(`Farmaco sintetico ${id}`);
  }
  await page.locator('[data-therapy-id="107"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`${name}-late-prescriptions-readable.png`) });
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
 });
}
