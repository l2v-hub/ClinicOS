// #278 — Anamnesi modificabile nella scheda paziente (AnamnesisEditor al posto della vista
// read-only). AC1 editabilità, AC2 persistenza dopo reload, AC3 no console/HTTP errors.
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const TEXT = `Anamnesi aggiornata da QA #278 — ${STAMP}`;

async function openAnamnesi(page: import('@playwright/test').Page) {
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await page.getByText('Moretti', { exact: false }).first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('tab', { name: 'Clinica' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: 'Sezioni Cliniche (testo)' }).click();
  await page.waitForTimeout(800);
}

test('#278 anamnesi: campi editabili + salvataggio persistente dopo reload', async ({ page }) => {
  const g = guard(page);
  await openAnamnesi(page);

  // AC1: l'editor strutturato è presente e NON read-only — la card "Anamnesi generale"
  // espone il bottone Modifica (la vecchia LegacyAnamnesisView non lo aveva).
  const card = page.locator('.clinical-card', { hasText: 'Anamnesi generale' }).first();
  await expect(card).toBeVisible();
  const editBtn = card.locator('.clinical-card__edit');
  await expect(editBtn).toBeVisible();

  // Modifica il campo e salva.
  await editBtn.click();
  const textarea = card.locator('textarea');
  await expect(textarea).toBeVisible();
  await textarea.fill(TEXT);
  await card.getByRole('button', { name: /Salva/ }).click();

  // Il valore salvato è visibile subito (non più in editing).
  await expect(card.getByText(TEXT)).toBeVisible();

  // AC2: persistenza dopo reload completo della pagina.
  await page.reload();
  await openAnamnesi(page);
  const cardAfter = page.locator('.clinical-card', { hasText: 'Anamnesi generale' }).first();
  await expect(cardAfter.getByText(TEXT)).toBeVisible({ timeout: 15000 });

  await page.screenshot({ path: `${OUT}/screenshots/278-anamnesi-persistita.png`, fullPage: true });
  g.assertClean(); // AC3
});
