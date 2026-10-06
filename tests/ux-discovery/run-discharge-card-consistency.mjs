import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/discharge-card-consistency';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const readStyle = (header) => ({
  height: header.getBoundingClientRect().height,
  font: getComputedStyle(header.querySelector('h3')).fontSize,
  toggle: header
    .querySelector('button[aria-expanded]')
    .outerHTML.replace(/aria-(label|controls|expanded)="[^"]*"/g, ''),
  actionClass: header.querySelector('.clinical-card__edit').className,
});
try {
  for (const width of [1150, 800, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 884 },
      hasTouch: width < 1150,
      isMobile: width < 1150,
    });
    const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
    await mockApi(context, state);
    const page = await context.newPage();
    await page.goto(
      'http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test/profilo',
    );
    await page.getByRole('button', { name: /Medico Test/ }).click();
    const admission = page.getByRole('region', { name: 'Dati di ingresso', exact: true });
    await admission.waitFor();
    await page.getByRole('button', { name: /Chiudi tutte le sezioni/ }).click();
    const expected = await admission.locator('.clinical-card__header').evaluate(readStyle);
    await page.getByRole('tab', { name: 'Dimissione', exact: true }).click();
    const card = page.getByRole('region', { name: 'Dimissione Infermieristica', exact: true });
    await card.waitFor();
    await card
      .getByRole('button', { name: 'Comprimi Dimissione Infermieristica', exact: true })
      .click();
    assert.deepEqual(await card.locator('.clinical-card__header').evaluate(readStyle), expected);
    await page.screenshot({ path: `${out}/collapsed-${width}.png`, fullPage: false });
    await card
      .getByRole('button', { name: 'Espandi Dimissione Infermieristica', exact: true })
      .press('Enter');
    await card.getByRole('button', { name: 'Compila', exact: true }).first().click();
    const date = card.locator('input[type="date"]').first();
    await date.fill('2026-10-07');
    await card
      .getByRole('button', { name: 'Comprimi Dimissione Infermieristica', exact: true })
      .press('Space');
    assert.equal(await date.isVisible(), false);
    await card
      .getByRole('button', { name: 'Espandi Dimissione Infermieristica', exact: true })
      .click();
    assert.equal(await date.inputValue(), '2026-10-07');
    await card
      .getByRole('button', { name: 'Comprimi Dimissione Infermieristica', exact: true })
      .click();
    await card.getByRole('button', { name: 'Vista modulo', exact: true }).click();
    await page.getByRole('button', { name: '← Vista operativa', exact: true }).waitFor();
    await page.getByRole('button', { name: '← Vista operativa', exact: true }).click();
    assert.equal(await date.isVisible(), true);
    assert.equal(await date.inputValue(), '2026-10-07');
    assert.equal(state.clinicalWrites, 0);
    await context.close();
  }
  console.log(
    'PASS: discharge matches admission controls at three widths; keyboard toggles preserve edits and module navigation without writes',
  );
} finally {
  await browser.close();
}
