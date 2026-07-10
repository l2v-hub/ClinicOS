// Issue #242 — "Diagnosi di dimissione non deve includere la terapia farmacologica"
//
// Codex QA FAILED (evidence was parser-only): this spec drives the REAL patient UI flow —
// set a discharge diagnosis, set a pharmacological therapy, save both, reload, and verify
// the two clinical surfaces (Diagnosi tab vs. Terapia Farmacologica tab) stay separate.
//
// Surfaces under test:
//  - Diagnosi:  frontend/src/components/operator/sections/DiagnosisEditor.tsx
//               (Clinica L2 -> "Diagnosi" L3 tab; PatientDetail.renderDiagnosi(),
//               persisted via PUT /patients/:id/cartella through onChange -> upd({ diagnosi }))
//  - Terapia:   frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx
//               (Clinica L2 -> "Terapia Farmacologica" L3 tab; persisted via
//               POST /patients/:id/therapies)
//
// Synthetic-only data, no PHI. Patient: Moretti, Elena (seed fixture, pre-existing in every
// ClinicOS local/staging DB).

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.resolve(__dirname, '../../artifacts/task-validation/242-diagnosis-excludes-pharmacological-therapy');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

const SYNTH_DIAGNOSIS = 'Scompenso cardiaco cronico (sintetico 242)';
const SYNTH_DRUG = 'Ramipril242';

// Pre-existing noise this remediation batch is explicitly told to ignore (React dev warnings,
// nested-DOM hydration chatter unrelated to #242).
const IGNORED_CONSOLE_RE = /descendant of|nested|hydration/i;

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

async function selectOperatoreRole(page: Page) {
  const roleButton = page.locator('text="Operatore"').first();
  if (await roleButton.count()) {
    await roleButton.click();
  }
}

async function openPatient(page: Page) {
  await page.goto('/');
  await selectOperatoreRole(page);
  await page.locator('text="Pazienti"').first().click();
  await page.getByText('Moretti, Elena', { exact: false }).first().click();
}

async function openClinicaGroup(page: Page) {
  await page.getByRole('tab', { name: 'Clinica' }).click();
}

async function openDiagnosiTab(page: Page) {
  await openClinicaGroup(page);
  await page.getByRole('tab', { name: 'Diagnosi', exact: true }).click();
}

async function openTerapiaTab(page: Page) {
  await openClinicaGroup(page);
  await page.getByRole('tab', { name: 'Terapia Farmacologica', exact: true }).click();
}

test.describe('#242 — diagnosi di dimissione esclude la terapia farmacologica (real UI flow)', () => {
  test('set diagnosis + therapy, save, reload, verify separation persists', async ({ page }) => {
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE_RE.test(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('response', res => {
      const status = res.status();
      if (status >= 400 && status !== 401 && status !== 403) {
        badResponses.push(`${res.request().method()} ${res.url()} -> ${status}`);
      }
    });

    // ── Step 1: open patient, go to Diagnosi tab, add the discharge diagnosis ──
    await openPatient(page);
    await openDiagnosiTab(page);

    await page.getByRole('button', { name: '+ Aggiungi' }).first().click();
    await page.getByLabel('Descrizione *').fill(SYNTH_DIAGNOSIS);
    await page.locator('.cr-inline-form__actions').getByRole('button', { name: 'Salva' }).click();

    const diagnosiRow = page.locator('.cr-diag-desc', { hasText: SYNTH_DIAGNOSIS });
    await expect(diagnosiRow).toBeVisible();
    await expect(diagnosiRow).toHaveText(SYNTH_DIAGNOSIS);

    // ── Step 2: go to Terapia Farmacologica, add the pharmacological therapy ──
    await openTerapiaTab(page);

    const addFarmaco = page.getByRole('button', { name: '+ Aggiungi farmaco' });
    const addFarmacoEmpty = page.getByRole('button', { name: '+ Aggiungi', exact: true });
    if (await addFarmaco.count()) {
      await addFarmaco.click();
    } else {
      await addFarmacoEmpty.first().click();
    }

    await page.getByPlaceholder('es. Kanrenol').fill(SYNTH_DRUG);

    const [therapyResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/therapies') && res.request().method() === 'POST'),
      page.getByRole('button', { name: 'Salva terapia' }).click(),
    ]);
    expect(therapyResponse.status()).toBe(201);

    const therapyRow = page.locator('.clinicos-table, table').locator('text=' + SYNTH_DRUG).first();
    await expect(therapyRow).toBeVisible();

    // ── Step 3: verify separation BEFORE reload ──
    // Explicit positive/negative checks scoped to each surface (more reliable than a body-wide check):
    await expect(page.getByText(SYNTH_DRUG)).toBeVisible(); // therapy surface shows the drug
    const diagnosisTextOnTherapySurface = await page.locator('.cr-tab-content', { hasText: SYNTH_DIAGNOSIS }).count();
    expect(diagnosisTextOnTherapySurface, 'Diagnosis text must NOT appear as a therapy row').toBe(0);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '242-terapia-surface.png'), fullPage: true });

    await openDiagnosiTab(page);
    await expect(diagnosiRow).toBeVisible();
    const drugTextOnDiagnosisSurface = await page.locator('.cr-tab-content', { hasText: SYNTH_DRUG }).count();
    expect(drugTextOnDiagnosisSurface, 'Therapy drug must NOT appear on the Diagnosi surface').toBe(0);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '242-diagnosi-surface.png'), fullPage: true });

    // ── Step 4 (AC3): reload the page and re-verify BOTH persistence and separation ──
    await page.reload();
    await openDiagnosiTab(page);
    await expect(page.locator('.cr-diag-desc', { hasText: SYNTH_DIAGNOSIS })).toBeVisible();
    const drugAfterReloadOnDiagnosis = await page.locator('.cr-tab-content', { hasText: SYNTH_DRUG }).count();
    expect(drugAfterReloadOnDiagnosis, 'After reload: drug must still be absent from Diagnosi').toBe(0);

    await openTerapiaTab(page);
    await expect(page.getByText(SYNTH_DRUG).first()).toBeVisible();
    const diagnosisAfterReloadOnTherapy = await page.locator('.cr-tab-content', { hasText: SYNTH_DIAGNOSIS }).count();
    expect(diagnosisAfterReloadOnTherapy, 'After reload: diagnosis must still be absent from Terapia').toBe(0);

    // Final proof screenshot (result.png) — Terapia surface post-reload with the drug visible,
    // diagnosis text absent, proving the separation survives save + reload.
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'result.png'), fullPage: true });

    // ── Assertions: no NEW console errors, no unexpected 4xx/5xx ──
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(badResponses, `Unexpected HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);
  });

  test.afterAll(async ({ browser }) => {
    // Best-effort cleanup of synthetic data. Never fails the suite (afterAll swallow-by-design
    // for teardown only — the assertions above already ran and recorded the real result).
    const page = await browser.newPage();
    try {
      await openPatient(page);

      await openTerapiaTab(page);
      const therapyDeleteBtn = page.locator('.cr-item-row, tr', { hasText: SYNTH_DRUG }).getByTitle('Elimina').first();
      if (await therapyDeleteBtn.count()) {
        page.once('dialog', d => d.accept());
        await therapyDeleteBtn.click().catch(() => {});
      }

      await openDiagnosiTab(page);
      const diagDeleteBtn = page.locator('.cr-item-row', { hasText: SYNTH_DIAGNOSIS }).getByTitle('Elimina').first();
      if (await diagDeleteBtn.count()) {
        await diagDeleteBtn.click().catch(() => {});
      }
    } catch {
      // Cleanup is best-effort; leaving synthetic data behind is acceptable per remediation brief.
    } finally {
      await page.close();
    }
  });
});
