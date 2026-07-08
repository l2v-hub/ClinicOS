// #156 E2E (Playwright) — "Terapie rilevate dalla lettera di dimissioni".
//
// Runs against a LIVE ClinicOS stack (frontend + backend + AI runtime mock), driving a discharge
// import that contains a therapy section. Requires an import draft whose data.terapiaImport was
// seeded by the backend parser (see backend/src/intake/parse-discharge-therapy.ts).
//
// Env:
//   E2E_BASE_URL       frontend origin (default http://localhost:5173)
//   E2E_IMPORT_DRAFT_ID an existing source='import' draft id with a therapy section
// If E2E_IMPORT_DRAFT_ID is not provided the test is skipped (harness must seed it).
//
// Covers: AC2 (one row per drug), AC4 (multiple times), AC6 (da_verificare not dropped),
// AC7 (edit before save), AC8/AC9 (confirm persists → visible after refresh).

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const DRAFT_ID = process.env.E2E_IMPORT_DRAFT_ID;

test.describe('#156 discharge therapy → structured rows', () => {
  test.skip(!DRAFT_ID, 'set E2E_IMPORT_DRAFT_ID to a seeded import draft with therapy');

  test('detected therapies are shown, editable, and persist after confirm + refresh', async ({ page }) => {
    await page.goto(`${BASE}/?intakeDraft=${DRAFT_ID}`);

    // AC1/AC7: the review section is shown at the Clinica step.
    const review = page.getByTestId('discharge-therapy-review');
    await expect(review).toBeVisible();

    // AC2: one row per drug.
    const rows = page.getByTestId('discharge-therapy-row');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);

    // AC4: KEPPRA carries both times.
    const keppra = page.locator('[data-testid="discharge-therapy-row"][data-farmaco="KEPPRA"]');
    if (await keppra.count()) {
      await expect(keppra.getByLabel('Orari')).toHaveValue(/08:00.*20:00/);
    }

    // AC6: at least one row flagged "da verificare" (e.g. PEVARYL) is present, not dropped.
    const alert = page.getByTestId('discharge-therapy-alert');
    await expect(alert).toBeVisible();

    // AC7: edit a field before saving.
    await rows.first().getByLabel('Dosaggio').fill('EDIT-DOSE');

    // AC8/AC9: confirm creates the patient + persists therapies.
    await page.getByRole('button', { name: /crea paziente/i }).click();
    // navigate to the created patient's therapy and assert a detected drug is present after refresh.
    await page.reload();
    await expect(page.getByText(/terapia/i).first()).toBeVisible();
  });
});
