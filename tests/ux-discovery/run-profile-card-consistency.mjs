import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/profile-card-consistency';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1150, 800, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 884 } });
    const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
    await mockApi(context, state);
    const page = await context.newPage();
    await page.goto(
      'http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test/profilo',
    );
    await page.getByRole('button', { name: /Medico Test/ }).click();
    const profile = page.getByRole('region', { name: 'Anagrafica', exact: true });
    const admission = page.getByRole('region', { name: 'Dati di ingresso', exact: true });
    await admission.waitFor();
    await page.getByRole('button', { name: /Chiudi tutte le sezioni/ }).click();
    const styles = await page.locator('.clinical-card__header').evaluateAll((headers) =>
      headers.map((header) => ({
        height: header.getBoundingClientRect().height,
        titleFont: getComputedStyle(header.querySelector('h3')).fontSize,
        toggleClass: header.querySelector('button[aria-expanded]').className,
        icon: header.querySelector('button[aria-expanded] svg')?.outerHTML,
      })),
    );
    assert.ok(styles.length >= 5);
    assert.ok(styles.every((style) => Math.abs(style.height - styles[0].height) < 1));
    assert.ok(
      styles.every(
        (style) => style.titleFont === styles[0].titleFont && style.icon === styles[0].icon,
      ),
    );
    assert.equal(await profile.locator('.cts__chevron').count(), 0);
    await page.screenshot({ path: `${out}/collapsed-${width}.png`, fullPage: false });
    await profile.getByRole('button', { name: 'Modifica', exact: true }).click();
    const phone = page.getByLabel('Telefono (necessario per completare la scheda)', {
      exact: true,
    });
    await phone.waitFor();
    await phone.fill('0511234567');
    await profile.getByRole('button', { name: 'Comprimi Anagrafica', exact: true }).click();
    assert.equal(await phone.isVisible(), false);
    await profile.getByRole('button', { name: 'Espandi Anagrafica', exact: true }).press('Enter');
    assert.equal(await phone.inputValue(), '0511234567');
    await profile.getByRole('button', { name: 'Annulla', exact: true }).click();
    await page.getByRole('button', { name: /Chiudi tutte le sezioni/ }).click();
    await admission.getByRole('button', { name: 'Espandi Dati di ingresso', exact: true }).click();
    await page.getByRole('button', { name: 'Modifica contatti', exact: true }).click();
    await phone.waitFor();
    assert.equal(
      await profile
        .getByRole('button', { name: 'Comprimi Anagrafica', exact: true })
        .getAttribute('aria-expanded'),
      'true',
    );
    await page.getByRole('button', { name: /Chiudi tutte le sezioni/ }).click();
    assert.equal(await phone.isVisible(), false);
    await page.getByRole('button', { name: /Apri tutte le sezioni/ }).click();
    assert.equal(await phone.isVisible(), true);
    await profile.getByRole('button', { name: 'Annulla', exact: true }).click();
    assert.equal(state.clinicalWrites, 0);
    assert.equal(
      state.requests.filter(
        (r) => r.method !== 'GET' && r.method !== 'OPTIONS' && !r.path.startsWith('/auth/'),
      ).length,
      0,
    );
    await context.close();
  }
  console.log(
    'PASS: shared card controls, keyboard toggle, edit from collapsed/contact action and retained draft at three widths',
  );
} finally {
  await browser.close();
}
