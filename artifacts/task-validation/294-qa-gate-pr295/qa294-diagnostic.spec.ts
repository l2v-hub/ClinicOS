// QA-GATE DIAGNOSTIC (PR #295 / issue #294) — NOT part of the PR.
// Written by the independent QA session to distinguish "feature broken" from
// "delivered spec broken": the PR's issue-294.spec.ts clicks a hard-disabled
// "Avanti" and times out. This probe exercises the same ACs with the actual UI
// contract (disabled button = blocked step 1). Delete after the QA gate.
import { test } from '@playwright/test';
import { guard, enterAs, nav, expect } from '../helpers';

const OUT = process.env.EV_OUT ?? 'qa-evidence/_out';
const STAMP = Date.now();
const LETTERS = 'BCDFGLMNPR';
const SUFFIX = String(STAMP)
  .slice(-6)
  .split('')
  .map((d) => LETTERS[Number(d)])
  .join('');
// NB: the CF surname code uses the FIRST three consonants — the run-varying letters
// must come immediately after 'Q' or every run computes the same CF (learned in run 2).
const COGNOME = `Q${SUFFIX.toLowerCase()}diag`;

async function fillStep1(page: import('@playwright/test').Page, cognome: string) {
  await page.getByRole('button', { name: /Nuovo paziente/ }).click();
  await page.waitForTimeout(800);
  await page.getByPlaceholder('Mario', { exact: true }).fill('Verifica');
  await page.getByPlaceholder('Rossi', { exact: true }).fill(cognome);
  await page.locator('input[type="date"]').first().fill('1958-03-12');
}

test('QA-294 diag: step1 bloccato senza CF; Calcola(Imola); CF in colonna; reload', async ({
  page,
}) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await fillStep1(page, COGNOME);

  // AC3 (blocking behavior actually implemented): without a CF the footer
  // "Avanti" is hard-disabled — the wizard cannot advance past step 1.
  const avanti = page.getByRole('button', { name: /Avanti/i });
  await expect(avanti).toBeDisabled();
  // The inline error message is NOT reachable (submitAttempted can never fire) — documented finding.
  await page.screenshot({
    path: `${OUT}/screenshots/qa294-diag-step1-bloccato-senza-cf.png`,
    fullPage: true,
  });

  // AC3: "Calcola" computes a valid CF from anagrafica data (comune: Imola).
  await page.getByPlaceholder('Roma', { exact: true }).fill('Imola');
  await page.getByRole('button', { name: /^Calcola$/ }).click();
  const cfInput = page.getByPlaceholder('RSSMRA80A01H501U').first();
  await expect(cfInput).toHaveValue(/^[A-Z0-9]{16}$/);
  const cf = await cfInput.inputValue();
  await expect(avanti).toBeEnabled();
  await page.screenshot({
    path: `${OUT}/screenshots/qa294-diag-cf-calcolato-imola.png`,
    fullPage: true,
  });

  for (let i = 0; i < 5; i++) {
    await avanti.click();
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

  // AC5: CF persisted on the Patient COLUMN and equal to the computed value.
  const patients = (await (await page.request.get('http://localhost:3001/patients')).json()) as {
    lastName: string;
    codiceFiscale?: string | null;
  }[];
  const created = patients.find((p) => p.lastName === COGNOME);
  expect(created, `paziente ${COGNOME} presente in /patients`).toBeTruthy();
  expect(created!.codiceFiscale).toBe(cf);

  // AC5: persistence after full reload.
  await page.reload();
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await expect(page.getByText(COGNOME, { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: `${OUT}/screenshots/qa294-diag-paziente-creato-lista.png`,
    fullPage: true,
  });
  g.assertClean();
});

test('QA-294 diag: CF duplicato rifiutato alla conferma (400, non forzabile)', async ({ page }) => {
  const g = guard(page);
  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');

  const patients = (await (await page.request.get('http://localhost:3001/patients')).json()) as {
    lastName: string;
    codiceFiscale?: string | null;
  }[];
  const existing = patients.find((p) => p.lastName === COGNOME);
  expect(existing?.codiceFiscale, 'CF del primo test presente').toBeTruthy();

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
    path: `${OUT}/screenshots/qa294-diag-cf-duplicato-rifiutato.png`,
    fullPage: true,
  });

  // The browser always logs "Failed to load resource ... 400" for the EXPECTED 400 on
  // /confirm — tolerate exactly that artifact, nothing else. (The PR's issue-294.spec.ts
  // asserts toEqual([]) and would fail here even with the click issue fixed — finding F2.)
  const unexpectedConsole = g.consoleErrors.filter(
    (e: string) => !/Failed to load resource: the server responded with a status of 400/.test(e),
  );
  expect(unexpectedConsole, `console errors: ${JSON.stringify(unexpectedConsole)}`).toEqual([]);
  expect(
    g.httpErrors.every((e) => e.includes('/confirm')),
    `HTTP inattesi: ${JSON.stringify(g.httpErrors)}`,
  ).toBe(true);
});
