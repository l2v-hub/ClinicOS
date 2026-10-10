import { test, expect } from 'playwright/test';
import { guard, drug, slots } from './fixtures.mjs';

test('independent: switch after complete inventory load never exposes previous patient rows', async ({ page }, info) => {
  const log = await guard(page); await page.goto('/qa-therapy');
  await page.getByRole('tab', { name: 'Piano terapeutico' }).click();
  await expect(page.getByTestId('therapy-drug-line')).toHaveCount(106);
  await page.getByRole('button', { name: 'QA: cambia paziente sintetico' }).click();
  await expect(page.getByTestId('therapy-drug-line')).toHaveCount(1);
  await expect(page.getByTestId('therapy-drug-line')).toContainText('Farmaco sintetico other');
  await expect(page.getByTestId('therapy-drug-line')).not.toContainText('Farmaco sintetico 000');
  await page.screenshot({ path: info.outputPath('loaded-patient-switch.png'), fullPage: true });
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
});

test('independent: second occurrence of same drug in same fascia stays read-only when feed represents only first', async ({ page }, info) => {
  const items = [drug('000', { orarioSpecifico: null, schedules: ['08:00', '10:00'].map((time, i) => ({
    id: `qa-schedule-${i}`, therapyId: '000', time, quantityNumerator: 1, quantityDenominator: 1,
    administrationUnit: 'unità' })) })];
  const log = await guard(page, { therapies: items }); await page.goto('/qa-therapy');
  await page.locator('[data-testid="therapy-calendar-cell"][data-time="10:00"]').click();
  const prescription = page.getByRole('list', { name: 'Prescrizioni dell’orario' });
  await expect(prescription).toBeVisible(); await expect(prescription).toContainText('Farmaco sintetico 000');
  await expect(prescription).toContainText('stato della dose non disponibile');
  await expect(prescription.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Somministra ora:/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('same-fascia-second-occurrence.png'), fullPage: true });
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
});

test('independent: foreign patient hourly feed cannot suppress a scoped prescription', async ({ page }, info) => {
  const foreignSlots = structuredClone(slots); foreignSlots[0].patients[0].patientId = 'unrelated-synthetic';
  const log = await guard(page, { therapies: [drug('000')], slots: foreignSlots }); await page.goto('/qa-therapy');
  await page.locator('[data-testid="therapy-calendar-cell"][data-time="08:00"]').click();
  const prescription = page.getByRole('list', { name: 'Prescrizioni dell’orario' });
  await expect(prescription).toBeVisible(); await expect(prescription).toContainText('Farmaco sintetico 000');
  await expect(prescription).toContainText('stato della dose non disponibile');
  await expect(prescription.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Somministra ora:/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('foreign-feed-patient-scope.png'), fullPage: true });
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
});

test('independent: off-date and inactive medicines remain in plan but absent from today calendar actions', async ({ page }, info) => {
  const log = await guard(page); await page.goto('/qa-therapy');
  const cells = page.getByTestId('therapy-calendar-cell');
  await expect(cells.first()).toBeVisible();
  await expect(cells).not.toContainText('Farmaco sintetico 100');
  await page.getByRole('tab', { name: 'Piano terapeutico' }).click();
  await expect(page.locator('[data-therapy-id="100"]')).toBeVisible();
  await expect(page.locator('[data-therapy-id="105"]')).toBeVisible();
  await expect(page.locator('[data-therapy-id="106"]')).toBeVisible();
  await expect(page.locator('[data-therapy-id="107"]')).toBeVisible();
  await expect(page.locator('[data-therapy-id="102"]')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('off-date-incomplete-conditional-prescriptions.png'), fullPage: true });
  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
});
