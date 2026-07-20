// #294 — Codice fiscale chiave univoca del paziente.
// AC4: nel wizard il CF è obbligatorio — digitato valido oppure CALCOLATO dai dati
//      (cognome/nome/sesso/data/comune di nascita) col pulsante "Calcola".
// AC2/AC3: senza CF valido non si avanza; un CF già presente è rifiutato alla conferma.
// AC5: il CF persiste (colonna Patient via API) e il paziente sopravvive al reload.
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
// Cognome con SOLE LETTERE variabili per run: le consonanti entrano nel CF calcolato,
// quindi un cognome sempre diverso produce un CF sempre diverso (chiave univoca a DB).
const LETTERS = 'BCDFGLMNPR';
const SUFFIX = String(STAMP)
  .slice(-6)
  .split('')
  .map((d) => LETTERS[Number(d)])
  .join('');
const COGNOME = `Qa${SUFFIX.toLowerCase()}`;

async function fillStep1(page: import('@playwright/test').Page, cognome: string) {
  await page.getByRole('button', { name: /Nuovo paziente/ }).click();
  await page.waitForTimeout(800);
  await page.getByPlaceholder('Mario', { exact: true }).fill('Verifica');
  await page.getByPlaceholder('Rossi', { exact: true }).fill(cognome);
  await page.locator('input[type="date"]').first().fill('1958-03-12');
}

test('#294 CF calcolato dai dati + creazione persistente con CF in colonna', async ({ page }) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await fillStep1(page, COGNOME);

  // AC4 (negativo): senza CF il wizard non avanza oltre lo step 1.
  await page.getByRole('button', { name: /Avanti/i }).click();
  await page.waitForTimeout(400);
  await expect(page.getByPlaceholder('Mario', { exact: true })).toBeVisible();
  await expect(page.getByText(/Codice fiscale obbligatorio/i).first()).toBeVisible();
  await page.screenshot({
    path: `${OUT}/screenshots/294-cf-mancante-bloccato.png`,
    fullPage: true,
  });

  // AC4: "Calcola" produce un CF valido dai dati (comune di nascita incluso).
  await page.getByPlaceholder('Roma', { exact: true }).fill('Imola');
  await page.getByRole('button', { name: /^Calcola$/ }).click();
  const cfInput = page.getByPlaceholder('RSSMRA80A01H501U').first();
  await expect(cfInput).toHaveValue(/^[A-Z0-9]{16}$/);
  const cf = await cfInput.inputValue();
  await page.screenshot({ path: `${OUT}/screenshots/294-cf-calcolato.png`, fullPage: true });

  // Ora lo step 1 avanza; completa il wizard fino alla creazione (pattern spec #282).
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /Avanti/i }).click();
    await page.waitForTimeout(400);
  }
  const recap = page.locator('[data-testid="intake-step-6"]');
  await expect(recap).toBeVisible();
  await page.locator('[data-testid="accept-therapy-verifica"] input').check();
  await page.locator('[data-testid="accept-demographics"]').check();
  const createBtn = page.getByRole('button', { name: /^Crea paziente$/ }).last();
  await expect(createBtn).toBeEnabled({ timeout: 8000 });

  const confirmResp = page.waitForResponse(
    (r) => /\/intake\/drafts\/.+\/confirm/.test(r.url()) && r.request().method() === 'POST',
  );
  await createBtn.click();
  expect((await confirmResp).status()).toBe(201);

  // AC5: il CF è persistito sulla COLONNA Patient (chiave univoca), non solo in cartella.
  const patients = (await (await page.request.get('http://localhost:3001/patients')).json()) as {
    lastName: string;
    codiceFiscale?: string | null;
  }[];
  const created = patients.find((p) => p.lastName === COGNOME);
  expect(created, `paziente ${COGNOME} presente in /patients`).toBeTruthy();
  expect(created!.codiceFiscale).toBe(cf);

  // AC5: persistenza dopo reload completo.
  await page.reload();
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await expect(page.getByText(COGNOME, { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: `${OUT}/screenshots/294-paziente-creato-lista.png`,
    fullPage: true,
  });
  g.assertClean();
});

test('#294 CF duplicato rifiutato alla conferma (non forzabile)', async ({ page }) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');

  // Il CF del paziente creato dal primo test, ricavato dall'API (stessa chiave).
  const patients = (await (await page.request.get('http://localhost:3001/patients')).json()) as {
    lastName: string;
    codiceFiscale?: string | null;
  }[];
  const existing = patients.find((p) => p.lastName === COGNOME);
  expect(existing?.codiceFiscale, 'CF del primo test presente').toBeTruthy();

  // Nuovo paziente con NOME diverso ma STESSO CF → la conferma deve fallire.
  await fillStep1(page, `${COGNOME}bis`);
  await page.getByPlaceholder('RSSMRA80A01H501U').first().fill(existing!.codiceFiscale!);
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /Avanti/i }).click();
    await page.waitForTimeout(400);
  }
  await expect(page.locator('[data-testid="intake-step-6"]')).toBeVisible();
  await page.locator('[data-testid="accept-therapy-verifica"] input').check();
  await page.locator('[data-testid="accept-demographics"]').check();
  const createBtn = page.getByRole('button', { name: /^Crea paziente$/ }).last();
  await expect(createBtn).toBeEnabled({ timeout: 8000 });

  const confirmResp = page.waitForResponse(
    (r) => /\/intake\/drafts\/.+\/confirm/.test(r.url()) && r.request().method() === 'POST',
  );
  await createBtn.click();
  expect((await confirmResp).status()).toBe(400);
  await expect(page.getByText(/Codice fiscale già presente/i).first()).toBeVisible({
    timeout: 8000,
  });
  await page.screenshot({
    path: `${OUT}/screenshots/294-cf-duplicato-rifiutato.png`,
    fullPage: true,
  });

  // Console pulita; l'unico HTTP >=400 tollerato è il 400 ATTESO sulla confirm.
  expect(g.consoleErrors, `console errors: ${JSON.stringify(g.consoleErrors)}`).toEqual([]);
  expect(
    g.httpErrors.every((e) => e.includes('/confirm')),
    `HTTP inattesi: ${JSON.stringify(g.httpErrors)}`,
  ).toBe(true);
});
