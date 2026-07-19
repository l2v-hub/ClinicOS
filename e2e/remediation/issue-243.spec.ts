import { test, expect, type ConsoleMessage, type Response } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Issue #243 — QA FAILED: "AC4 is not implemented. The six available modules render as
// non-interactive `div` cards; selecting a module cannot open its flow or content."
//
// This spec drives the REAL fix end to end: opens the intake wizard, selects the "Scala
// Braden" module card in step 4 (now an interactive, keyboard-focusable button with
// aria-pressed state + a "will open after creation" hint), completes the acceptance
// checklist, confirms patient creation, and asserts the app lands on that patient's chart
// with the Moduli group / Scala Braden tab active and its content rendered — not just the
// step-4 grid being visible (that was already covered, insufficiently, by prior evidence).
// It then reloads, re-authenticates (this app keeps no session in storage — full reset is
// expected) and re-reaches the same module tab for the same patient, proving persistence.

const EV_DIR = '../../artifacts/task-validation/243-modules-section-operational';
const RESULT_SCREENSHOT_DIR = join(EV_DIR, 'screenshots');
mkdirSync(RESULT_SCREENSHOT_DIR, { recursive: true });

const IGNORED_CONSOLE_RE = /descendant of|nested|hydration/i;

async function clickText(page: import('@playwright/test').Page, t: string) {
  await page.locator(`text="${t}"`).first().click();
}

async function advanceToNextStep(page: import('@playwright/test').Page) {
  await page.locator('footer button.btn-primary').click();
  await page.waitForTimeout(1200);
}

function activeStepLabel(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="patient-intake-stepper"] .is-active').innerText();
}

test('#243 AC4 — card modulo selezionabile naviga al flusso reale post-creazione', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const httpErrors: { url: string; status: number }[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('response', (r: Response) => {
    const status = r.status();
    if (status >= 400) httpErrors.push({ url: r.url(), status });
  });

  // Cognome unico per run: evita il rilevamento "paziente duplicato" da esecuzioni precedenti.
  const cognome = `Moduli243B${Date.now().toString().slice(-6)}`;
  const nome = 'Test';

  // ── Login (Operatore) + Pazienti ────────────────────────────────────────────
  await page.goto('/', { waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');
  await clickText(page, 'Pazienti');
  await page.waitForTimeout(600);

  // ── Apri wizard "Nuovo paziente" ─────────────────────────────────────────────
  await page.getByRole('button', { name: /Nuovo paziente/i }).click();
  await page.waitForSelector('[data-testid="intake-step-1"]', { timeout: 10_000 });
  await page.waitForTimeout(800);

  // Step 1 — Anagrafica
  const nomeInput = page.getByPlaceholder('Mario', { exact: true });
  await nomeInput.click();
  await nomeInput.pressSequentially(nome, { delay: 20 });
  const cognomeInput = page.getByPlaceholder('Rossi', { exact: true });
  await cognomeInput.click();
  await cognomeInput.pressSequentially(cognome, { delay: 20 });
  const dob = page.locator('[data-testid="intake-step-1"] input[type="date"]');
  await dob.fill('1980-01-01');
  await dob.press('Tab');
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid="patient-intake-body"]')).toBeVisible();

  // Step 1 → 2 (Ingresso)
  await advanceToNextStep(page);
  await expect(page.locator('[data-testid="intake-step-2"]')).toBeVisible();

  // Step 2 → 3 (Clinica)
  await advanceToNextStep(page);
  await expect(page.locator('[data-testid="intake-step-3"]')).toBeVisible();

  // #235 acceptance gate — "Accetto la terapia" lives on step 3 (Clinica).
  const acceptTherapy = page.locator('[data-testid="accept-therapy"] input[type="checkbox"]');
  await acceptTherapy.check();
  await expect(acceptTherapy).toBeChecked();

  // Step 3 → 4 (Moduli)
  await advanceToNextStep(page);
  await expect(page.locator('[data-testid="intake-modules-grid"]')).toBeVisible();
  await expect(activeStepLabel(page)).resolves.toMatch(/Moduli/i);

  // ── AC4: select the "Scala Braden" card ─────────────────────────────────────
  const bradenCard = page.locator('[data-testid="intake-module-braden"]');
  await expect(bradenCard).toBeVisible();
  await expect(bradenCard).toHaveAttribute('aria-pressed', 'false');
  await bradenCard.click();
  await expect(bradenCard).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid="intake-module-braden-hint"]')).toBeVisible();
  await expect(page.locator('[data-testid="intake-module-braden-hint"]')).toHaveText(
    /Si aprirà dopo la creazione del paziente/i,
  );
  await page.screenshot({
    path: join(RESULT_SCREENSHOT_DIR, '01-step4-braden-selected.png'),
    fullPage: true,
  });

  // Step 4 → 5 (Documenti)
  await advanceToNextStep(page);
  await expect(page.locator('[data-testid="intake-step-5"]')).toBeVisible();

  // Step 5 → 6 (Verifica)
  await advanceToNextStep(page);
  await expect(page.locator('[data-testid="intake-step-6"]')).toBeVisible();

  // #235 acceptance gate — "Accetto i dati anagrafici" on step 6 (Verifica).
  const acceptDemo = page.locator('[data-testid="accept-demographics"] input[type="checkbox"]');
  await acceptDemo.check();
  await expect(acceptDemo).toBeChecked();

  // ── Confirm patient creation ─────────────────────────────────────────────────
  const confirmBtn = page.locator('footer button.btn-primary');
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();
  // Belt-and-braces: se emerge il banner "paziente duplicato", procedi comunque.
  const creaComunque = page.getByRole('button', { name: /Crea comunque/i });
  if (await creaComunque.isVisible().catch(() => false)) {
    await creaComunque.click();
    await page
      .getByRole('button', { name: /Crea paziente/i })
      .click()
      .catch(() => {});
  }

  // The intake modal closes once confirmDraft resolves and the app navigates.
  await page.waitForSelector('[data-testid="patient-intake-header"]', {
    state: 'detached',
    timeout: 20_000,
  });
  await page.waitForTimeout(1000);

  // ── AC4: landed on the patient chart, Moduli group, Scala Braden tab active ─
  // TopNav renders L2/L3 items as role="tab" (see components/navigation/TopNav.tsx).
  const l3Braden = page.getByRole('tab', { name: 'Scala Braden' });
  await expect(l3Braden).toBeVisible({ timeout: 10_000 });
  await expect(l3Braden).toHaveAttribute('aria-selected', 'true');
  // Real module content rendered (ScalaBradenTab section), not just the tab highlighted.
  await expect(page.locator('.cts__title', { hasText: /scala di braden/i }).first()).toBeVisible();
  await page.screenshot({
    path: join(RESULT_SCREENSHOT_DIR, '02-patient-chart-braden-flow.png'),
    fullPage: true,
  });

  // ── Persistence after reload (full app reset — no client session storage) ──
  await page.reload({ waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');
  await clickText(page, 'Pazienti');
  await page.waitForTimeout(600);

  await clickText(page, `${cognome}, ${nome}`);
  await page.waitForTimeout(800);
  await clickText(page, 'Moduli');
  await page.waitForTimeout(300);
  await clickText(page, 'Scala Braden');
  await page.waitForTimeout(500);

  const l3BradenAfterReload = page.getByRole('tab', { name: 'Scala Braden' });
  await expect(l3BradenAfterReload).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.cts__title', { hasText: /scala di braden/i }).first()).toBeVisible();

  const finalShot = join(RESULT_SCREENSHOT_DIR, 'result.png');
  await page.screenshot({ path: finalShot, fullPage: true });
  await page.screenshot({
    path: join(RESULT_SCREENSHOT_DIR, '03-braden-reachable-after-reload.png'),
    fullPage: true,
  });

  const newConsoleErrors = consoleErrors.filter((e) => !IGNORED_CONSOLE_RE.test(e));
  expect(newConsoleErrors, `unexpected console errors: ${newConsoleErrors.join(' | ')}`).toEqual(
    [],
  );

  const relevantHttpErrors = httpErrors.filter((e) => e.status !== 401 && e.status !== 403);
  expect(
    relevantHttpErrors,
    `unexpected HTTP errors: ${JSON.stringify(relevantHttpErrors)}`,
  ).toEqual([]);
});
