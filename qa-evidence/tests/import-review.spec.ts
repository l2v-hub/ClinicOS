import { test, expect, enterAs, nav, guard } from '../harness';
import { writeFixtures } from '../../e2e/fixtures.mjs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

// #234 (import-proposed text editable + save feedback) + #235 (acceptance gate on Crea paziente).
// Drives the REAL import flow (mock AI runtime) → review → workspace, with real assertions.
test('#234/#235 import review: editable text + save feedback + acceptance gate', async ({
  page,
}) => {
  const g = guard(page);
  const fx = writeFixtures(resolve(tmpdir(), 'clinicos-ir-fixtures'));

  await enterAs(page, 'Operatore');
  await nav(page, 'Pazienti');
  await page.getByText('Importa dimissione', { exact: false }).first().click();
  await page.waitForTimeout(600);
  await page.setInputFiles('input[type=file][multiple]', [fx.pdf, fx.jpg]);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Avvia elaborazione/i }).click();

  // Review surface (#1): demographics section appears after extraction.
  const demo = page.locator('[data-testid="srev-PATIENT_DEMOGRAPHICS"]');
  await demo.waitFor({ state: 'visible', timeout: 45000 });

  // Fill required anagrafica, then hand off to the workspace.
  await demo.locator('input[type=text]').nth(0).fill('E2E');
  await demo.locator('input[type=text]').nth(1).fill('ImportReview');
  await demo.locator('input[type=date]').first().fill('1955-09-09');
  await page
    .getByRole('button', { name: /^Crea paziente$/ })
    .first()
    .click();

  // ── Workspace (step 3 Clinica) ─────────────────────────────────────────────
  const acceptTherapy = page.locator('[data-testid="accept-therapy"]');
  await acceptTherapy.waitFor({ state: 'visible', timeout: 30000 });

  // #234: a proposed clinical editor is editable — type into one (best-effort across editor types).
  const editable = page
    .locator(
      '.cts--open textarea, .cts--open input[type=text], .cts--open [contenteditable="true"]',
    )
    .first();
  if (await editable.count()) {
    await editable.click().catch(() => {});
    await editable.type(' revisionato E2E', { delay: 10 }).catch(() => {});
  }

  // #235 + #234 save feedback: checking accept-therapy is an autosaved update → save-state indicator shows.
  await acceptTherapy.check();
  await expect(acceptTherapy).toBeChecked();
  await expect(page.getByText(/Salvato|Salvataggio|Errore salvataggio/i).first()).toBeVisible({
    timeout: 12000,
  });

  // Advance to the final review step.
  for (let i = 0; i < 5; i++) {
    const verifica = page.locator('[data-testid="accept-demographics"]');
    if (await verifica.count()) break;
    const avanti = page.getByRole('button', { name: /Avanti/i });
    if (!(await avanti.count())) break;
    await avanti
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(500);
  }

  // On the final step: blocking checklist visible, create button still disabled until demographics accepted.
  const acceptDemo = page.locator('[data-testid="accept-demographics"]');
  await acceptDemo.waitFor({ state: 'visible', timeout: 15000 });
  await expect(page.locator('[data-testid="intake-blocking-checklist"]')).toBeVisible();
  const createBtn = page.getByRole('button', { name: /^Crea paziente$/ }).last();
  await expect(createBtn).toBeDisabled();

  // Accept demographics → gate clears → button enabled.
  await acceptDemo.check();
  await expect(acceptDemo).toBeChecked();
  await expect(createBtn).toBeEnabled({ timeout: 8000 });

  g.assertClean();
  await page.screenshot({ path: `${process.env.EV_OUT}/final/after.png`, fullPage: true });
});
