import { test, expect } from 'playwright/test';
import { guard, therapies } from './fixtures.mjs';
for (const [name, viewport] of [['desktop', { width: 1256, height: 1032 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`${name}: entire stored plan, inactive inventory and reload`, async ({ page }, info) => {
    await page.setViewportSize(viewport); const log = await guard(page);
    await page.goto('/qa-therapy');
    await page.getByRole('button', { name: 'Vedi tutti i farmaci nel piano terapeutico' }).click();
    const list = page.getByRole('list', { name: 'Farmaci attivi', exact: true });
    await expect(list).toBeVisible(); await expect(list.locator('li.tf-drugs__item')).toHaveCount(106);
    for (const t of therapies.filter(t => t.stato === 'attiva')) await expect(list.locator(`[data-therapy-id="${t.id}"]`)).toContainText(t.farmacoNome);
    await expect(page.getByRole('button', { name: 'Carica altre terapie' })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`${name}-complete-plan.png`), fullPage: true });
    await list.locator('[data-therapy-id="101"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${name}-later-prescriptions.png`) });
    await page.reload(); await page.getByRole('tab', { name: 'Piano terapeutico' }).click();
    await expect(list.locator('li.tf-drugs__item')).toHaveCount(106);
    await page.getByRole('tab', { name: 'Storico', exact: true }).click();
    await page.getByRole('button', { name: 'Prescrizioni sospese/concluse', exact: true }).click();
    const inactive = page.getByRole('list', { name: 'Prescrizioni sospese o concluse' });
    await expect(inactive).toBeVisible(); await expect(inactive.locator('li.tf-drugs__item')).toHaveCount(2);
    await expect(inactive).toContainText('Farmaco sintetico 102'); await expect(inactive).toContainText('Farmaco sintetico 103');
    await page.screenshot({ path: info.outputPath(`${name}-inactive.png`), fullPage: true });
    expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
    expect(log.requests.some(r => r.includes('cursor=synthetic-next'))).toBe(true);
  });
  test(`${name}: PRN day/week and missing feed prescriptions stay read-only`, async ({ page }, info) => {
    await page.setViewportSize(viewport); const log = await guard(page); await page.goto('/qa-therapy');
    const prn = page.getByRole('region', { name: 'Al bisogno', exact: true });
    await expect(prn).toBeVisible(); await expect(prn.locator('li')).toHaveCount(1);
    await expect(prn).toContainText('Farmaco sintetico 101');
    const bounds = await prn.evaluate(region => {
      const box = region.getBoundingClientRect();
      return [...region.querySelectorAll('button')].map(button => {
        const control = button.getBoundingClientRect();
        return { left: control.left >= box.left, right: control.right <= box.right,
          textFits: button.scrollWidth <= button.clientWidth };
      });
    });
    expect(bounds).toEqual([{ left: true, right: true, textFits: true }]);
    await prn.screenshot({ path: info.outputPath(`${name}-prn-control-fits.png`) });
    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await expect(prn.locator('li')).toHaveCount(2); await expect(prn).toContainText('Farmaco sintetico 104');
    await expect(prn.locator('li').filter({ hasText: 'Farmaco sintetico 104' }).getByRole('button')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`${name}-weekly-prn.png`), fullPage: true });
    await page.getByRole('button', { name: 'Giorno', exact: true }).click();
    await page.locator('[data-testid="therapy-calendar-cell"][data-time="08:00"]').click();
    const missing = page.getByRole('list', { name: 'Prescrizioni dell’orario' });
    await expect(missing).toBeVisible(); await expect(missing).toContainText('Farmaco sintetico 001');
    await expect(missing).not.toContainText('Farmaco sintetico 000');
    await expect(missing).toContainText('stato della dose non disponibile'); await expect(missing.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Somministra ora:/ })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`${name}-uncovered-read-only.png`), fullPage: true });
    await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
    await page.getByLabel('Data', { exact: true }).fill('2026-10-19');
    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await expect(prn).toBeVisible(); await expect(prn.locator('li')).toHaveCount(1);
    await expect(prn.getByRole('button')).toHaveCount(0);
    expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
  });
}
test('short inventory is an explicit error; retry exposes the full plan', async ({ page }, info) => {
  const state = { short: true }; const log = await guard(page, state); await page.goto('/qa-therapy');
  await page.getByRole('tab', { name: 'Piano terapeutico' }).click();
  await expect(page.getByRole('alert')).toContainText('Elenco terapie incompleto');
  await expect(page.getByTestId('therapy-drug-line')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('incomplete-error.png'), fullPage: true });
  state.short = false; await page.getByRole('button', { name: 'Riprova', exact: true }).click();
  await expect(page.getByTestId('therapy-drug-line')).toHaveCount(106);
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
});
test('patient switch never publishes a stale first-patient inventory', async ({ page }) => {
  const log = await guard(page, { delay: true }); await page.goto('/qa-therapy');
  await page.getByRole('button', { name: 'QA: cambia paziente sintetico' }).click();
  await page.getByRole('tab', { name: 'Piano terapeutico' }).click();
  await expect(page.getByTestId('therapy-drug-line')).toHaveCount(1);
  await expect(page.getByTestId('therapy-drug-line')).toContainText('Farmaco sintetico other');
  await page.waitForTimeout(500); await expect(page.getByTestId('therapy-drug-line')).toHaveCount(1);
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
});
