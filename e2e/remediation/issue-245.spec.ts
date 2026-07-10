import { test, expect, request as pwRequest } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Issue #245 remediation — Codex QA FAILED: removing the duplicate editable "Anamnesi" chart
// tab (dedup vs "Sezioni Cliniche (testo)") made pre-existing Cartella.data.anamnesi values
// inaccessible in the UI. Fix: read-only LegacyAnamnesisView mounted above NarrativeSectionsTab
// in the "Sezioni Cliniche (testo)" tab. This spec seeds a synthetic legacy anamnesi value via
// the real API (read-modify-write on Cartella.data), then proves through the UI that:
//   - the duplicate "Anamnesi" L3 tab stays removed (dedup persists, AC1/AC3),
//   - the seeded legacy value is visible under "Sezioni Cliniche (testo)" (AC2 — data reachable),
//   - it survives a full page reload (persistence proof, no re-seed).
// Not run by the implementer (no local stack here) — executed later by the controller.

const API = process.env.CLINICOS_API ?? 'http://localhost:3001';
const PATIENT_ID = 'SEED-PAZ-008';
const PATIENT_LABEL = 'Moretti, Elena';
const OUT = join('..', '..', 'artifacts', 'task-validation', '245-remove-duplicate-anamnesis');
const SEEDED_VALUE = 'Ipertensione arteriosa (sintetico)';
const KNOWN_PREEXISTING = /cannot be a descendant of|cannot contain a nested|hydration/i;

let originalData: Record<string, unknown> | null = null;

test.beforeAll(async () => {
  mkdirSync(join(OUT, 'screenshots'), { recursive: true });
  const ctx = await pwRequest.newContext();
  try {
    const getRes = await ctx.get(`${API}/patients/${PATIENT_ID}/cartella`);
    expect(getRes.ok(), 'GET cartella must succeed to seed legacy anamnesi').toBeTruthy();
    const body = await getRes.json();
    const data = (body?.data ?? {}) as Record<string, unknown>;
    originalData = { ...data };

    const seededAnamnesi = {
      ...(typeof data.anamnesi === 'object' && data.anamnesi ? data.anamnesi : {}),
      patologicaRemota: SEEDED_VALUE,
      updatedAt: new Date().toISOString(),
      operatore: 'QA Seed #245',
    };
    const putRes = await ctx.put(`${API}/patients/${PATIENT_ID}/cartella`, {
      data: { data: { ...data, anamnesi: seededAnamnesi } },
    });
    expect(putRes.ok(), 'PUT cartella must succeed to seed legacy anamnesi').toBeTruthy();
  } finally {
    await ctx.dispose();
  }
});

test.afterAll(async () => {
  // Best-effort restore of the original cartella so this spec leaves no fixture residue.
  if (!originalData) return;
  const ctx = await pwRequest.newContext();
  try {
    await ctx.put(`${API}/patients/${PATIENT_ID}/cartella`, { data: { data: originalData } });
  } catch {
    // best-effort — do not fail the suite on cleanup
  } finally {
    await ctx.dispose();
  }
});

test('legacy anamnesi stays reachable (read-only) after duplicate tab removal, survives reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('response', (r) => {
    const status = r.status();
    if (status >= 400 && status !== 401 && status !== 403) badResponses.push(`${status} ${r.url()}`);
  });

  async function openPatientClinicaSezioniNarrative() {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('text="Operatore"').first().click();
    await page.waitForLoadState('networkidle');
    await page.locator('text="Pazienti"').first().click();
    await page.waitForTimeout(500);
    await page.getByText(PATIENT_LABEL, { exact: false }).first().click();
    await page.waitForTimeout(800);
    await page.getByRole('tab', { name: /^Clinica(\s+\d+)?$/ }).click();
    await page.waitForTimeout(500);
  }

  await openPatientClinicaSezioniNarrative();

  // AC1/AC3 — dedup persists: no duplicate "Anamnesi" tab in the Clinica L3 group.
  const l3Labels = (await page.locator('button, [role="tab"]').allInnerTexts()).map((s) => s.trim());
  expect(l3Labels.some((t) => t === 'Anamnesi')).toBe(false);
  expect(l3Labels.some((t) => /Sezioni Cliniche/i.test(t))).toBe(true);

  // AC2 — the legacy structured value seeded via API is visible under "Sezioni Cliniche (testo)".
  await page.getByRole('tab', { name: /^Sezioni Cliniche \(testo\)(\s+\d+)?$/ }).click();
  await page.waitForTimeout(800);

  const legacyPanel = page.locator('[data-testid="legacy-anamnesis"]');
  await expect(legacyPanel).toBeVisible();
  await expect(legacyPanel).toContainText(SEEDED_VALUE);

  // Persistence proof — reload and re-navigate; the seeded value must still be visible
  // (proves the data lives in Cartella storage, not component-local state).
  await openPatientClinicaSezioniNarrative();
  await page.getByRole('tab', { name: /^Sezioni Cliniche \(testo\)(\s+\d+)?$/ }).click();
  await page.waitForTimeout(800);
  const legacyPanelAfterReload = page.locator('[data-testid="legacy-anamnesis"]');
  await expect(legacyPanelAfterReload).toBeVisible();
  await expect(legacyPanelAfterReload).toContainText(SEEDED_VALUE);

  await page.screenshot({ path: join(OUT, 'screenshots', 'result.png'), fullPage: true });

  const newConsoleErrors = consoleErrors.filter((e) => !KNOWN_PREEXISTING.test(e));
  expect(newConsoleErrors, `unexpected console errors: ${newConsoleErrors.join(' | ')}`).toHaveLength(0);
  expect(badResponses, `unexpected 4xx/5xx responses: ${badResponses.join(' | ')}`).toHaveLength(0);
});
