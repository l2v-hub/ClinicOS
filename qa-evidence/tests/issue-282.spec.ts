// #282 — L'ultimo step della creazione paziente non deve mai lasciare il bottone "Crea paziente"
// premuto-ma-inerte: la conferma terapia è sbloccabile QUI (checkbox accept-therapy-verifica),
// il bottone si abilita e crea davvero il paziente (persistente dopo reload).
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect, syntheticCF } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const COGNOME = `Creazione282-${STAMP}`;
// #294: CF obbligatorio (chiave univoca) — sintetico e nuovo a ogni run.
const CF = syntheticCF(STAMP);

test('#282 creazione paziente: gate sbloccabile allo step finale + creazione persistente', async ({
  page,
}) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await page.getByRole('button', { name: /Nuovo paziente/ }).click();
  await page.waitForTimeout(800);

  // Step 1: anagrafica minima obbligatoria (#294: incluso il codice fiscale).
  await page.getByPlaceholder('Mario', { exact: true }).fill('Bruno');
  await page.getByPlaceholder('Rossi', { exact: true }).fill(COGNOME);
  await page.locator('input[type="date"]').first().fill('1960-05-20');
  await page.getByPlaceholder('RSSMRA80A01H501U').first().fill(CF);

  // Avanza fino allo step finale (6 — Verifica) senza toccare la Clinica.
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /Avanti/i }).click();
    await page.waitForTimeout(400);
  }
  const recap = page.locator('[data-testid="intake-step-6"]');
  await expect(recap).toBeVisible();

  // Bug #282: bottone disabilitato SENZA alcun controllo per rimediare. Ora la checkbox c'è.
  const createBtn = page.getByRole('button', { name: /^Crea paziente$/ }).last();
  await expect(createBtn).toBeDisabled();
  const acceptTherapy = page.locator('[data-testid="accept-therapy-verifica"] input');
  await expect(acceptTherapy).toBeVisible(); // AC1
  await expect(recap.getByText('Confermo: nessuna terapia da inserire')).toBeVisible();

  // AC2: spuntate le conferme il bottone si abilita e al click crea il paziente.
  await acceptTherapy.check();
  await page.locator('[data-testid="accept-demographics"]').check();
  await expect(createBtn).toBeEnabled({ timeout: 8000 });

  await page.screenshot({
    path: `${OUT}/screenshots/282-step-finale-sbloccato.png`,
    fullPage: true,
  });

  const confirmResp = page.waitForResponse(
    (r) => /\/intake\/drafts\/.+\/confirm/.test(r.url()) && r.request().method() === 'POST',
  );
  await createBtn.click();
  expect((await confirmResp).status()).toBe(201);

  // AC3: il paziente persiste dopo reload completo.
  await page.reload();
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await expect(page.getByText(COGNOME, { exact: false }).first()).toBeVisible({ timeout: 15000 });

  await page.screenshot({ path: `${OUT}/screenshots/282-paziente-in-lista.png`, fullPage: true });
  g.assertClean();
});
