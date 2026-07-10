import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Issue #244 — allergy status not shown in summary; contradictory states persistable.
//
// Codex findings addressed:
//  1. `allergieStatus` was consumed only inside the AllergiesEditor modal — the patient
//     summary (riepilogo card + quick-stat) derived its message/count solely from
//     `cartella.allergie`, so the modal could say "Paziente nega allergie" while the
//     background summary still said "Nessuna allergia segnalata". Fixed: both now read
//     `deriveAllergySummary(cartella.allergie, cartella.allergieStatus)`.
//  2. The UI permitted setting 'assenti'/'paziente_nega' while the allergy list was still
//     non-empty, persisting a contradictory state. Fixed: `canSetStatus` blocks the
//     transition — the status buttons are disabled and no PUT is fired.
//
// This spec: sets "Paziente nega" (empty list, allowed) and asserts the summary reflects
// it immediately AND after reload; then adds an allergen (forces "presenti"), attempts to
// set "Assenti" while the list is non-empty and asserts it is BLOCKED (no state change, no
// PUT); cleans up by removing the allergen and restoring "paziente_nega".

const PATIENT = 'Moretti, Elena';
const EVIDENCE_DIR = path.resolve(__dirname, '../../artifacts/task-validation/244-allergies-absent-denied');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Pre-existing React warnings unrelated to this fix — do not fail the test on these.
const IGNORED_CONSOLE_RE = /descendant of|nested|hydration/i;

test('issue #244 — allergy status is unambiguous in the summary and cannot be set to a contradictory state', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !IGNORED_CONSOLE_RE.test(msg.text())) consoleErrors.push(msg.text());
  });

  const httpFailures: string[] = [];
  const cartellaPutRequests: string[] = [];
  page.on('request', (req) => {
    if (/\/patients\/.+\/cartella/.test(req.url()) && req.method() !== 'GET') {
      cartellaPutRequests.push(`${req.method()} ${req.url()}`);
    }
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400 && status !== 401 && status !== 403) {
      httpFailures.push(`${status} ${res.request().method()} ${res.url()}`);
    }
  });

  async function clickText(t: string) {
    await page.locator(`text="${t}"`).first().click();
  }

  async function openPatient() {
    await clickText('Pazienti');
    await page.waitForLoadState('networkidle');
    await page.getByText(PATIENT, { exact: false }).first().click();
    await page.waitForLoadState('networkidle');
  }

  async function openAllergieModal() {
    await page.locator('[data-testid="allergy-summary-state"]').click();
    await expect(page.locator('[data-testid="allergy-status"]')).toBeVisible({ timeout: 8000 });
  }

  async function closeModal() {
    await page.locator('.modal-footer').getByText('Chiudi', { exact: true }).click();
    await expect(page.locator('[data-testid="allergy-status"]')).toBeHidden();
  }

  // ── Setup: role gate → patient ──────────────────────────────────────────────
  await page.goto('/');
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openPatient();

  // ── Step 1: set "Paziente nega" (list is empty at this point → allowed) ─────
  await openAllergieModal();
  cartellaPutRequests.length = 0;
  await Promise.all([
    page.waitForResponse((r) => /\/patients\/.+\/cartella/.test(r.url()) && r.request().method() !== 'GET', { timeout: 8000 }),
    page.locator('[data-testid="allergy-status-paziente_nega"]').click(),
  ]);
  await expect(page.locator('[data-testid="allergy-denied"]')).toBeVisible();
  expect(cartellaPutRequests.length, 'expected a PUT when setting paziente_nega').toBeGreaterThan(0);
  await closeModal();

  // ── Step 2: assert the SUMMARY (riepilogo/quick-stat) shows the explicit state ──
  const summary = page.locator('[data-testid="allergy-summary-state"]');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Paziente nega allergie');

  // ── Step 3: persistence after reload ────────────────────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await openPatient();
  await expect(page.locator('[data-testid="allergy-summary-state"]')).toContainText('Paziente nega allergie');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'summary-paziente-nega.png'), fullPage: true });

  // ── Step 4: add an allergen → status flips to "presenti" ────────────────────
  await openAllergieModal();
  await page.locator('button', { hasText: 'Aggiungi allergia' }).click();
  await page.locator('.form-field .form-input').first().fill('Penicillina (test #244)');
  cartellaPutRequests.length = 0;
  await Promise.all([
    page.waitForResponse((r) => /\/patients\/.+\/cartella/.test(r.url()) && r.request().method() !== 'GET', { timeout: 8000 }),
    page.locator('button', { hasText: 'Salva' }).click(),
  ]);
  await expect(page.locator('[data-testid="allergy-status-presenti"]')).toHaveAttribute('aria-checked', 'true');

  // ── Step 5: attempt to set "Assenti" while the list is non-empty → BLOCKED ──
  cartellaPutRequests.length = 0;
  const assentiBtn = page.locator('[data-testid="allergy-status-assenti"]');
  await expect(assentiBtn).toBeDisabled();
  await expect(page.locator('[data-testid="allergy-status-blocked"]')).toBeVisible();
  // Force-clicking a disabled control must not fire the request nor change the state.
  await assentiBtn.click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(500);
  expect(cartellaPutRequests.length, 'no PUT must fire when the transition is blocked').toBe(0);
  await expect(page.locator('[data-testid="allergy-status-presenti"]')).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'blocked-assenti.png'), fullPage: true });

  // ── Cleanup: remove the allergen, restore "paziente_nega" ───────────────────
  await page.locator('.ec-modal-item').filter({ hasText: 'Penicillina (test #244)' }).locator('button[title="Elimina"]').click();
  await expect(page.locator('[data-testid="allergy-status-blocked"]')).toBeHidden();
  await Promise.all([
    page.waitForResponse((r) => /\/patients\/.+\/cartella/.test(r.url()) && r.request().method() !== 'GET', { timeout: 8000 }),
    page.locator('[data-testid="allergy-status-paziente_nega"]').click(),
  ]);
  await expect(page.locator('[data-testid="allergy-denied"]')).toBeVisible();
  await closeModal();

  // ── Final: full-page screenshot of the summary showing the explicit state ───
  await expect(page.locator('[data-testid="allergy-summary-state"]')).toContainText('Paziente nega allergie');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'result.png'), fullPage: true });

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(httpFailures, `unexpected HTTP failures: ${httpFailures.join(' | ')}`).toEqual([]);
});
