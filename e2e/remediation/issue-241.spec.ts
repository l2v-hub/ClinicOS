import { test, expect, type Page, type Response } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// Issue #241 remediation — the PUT route (backend/src/routes/patient-therapies.ts) previously
// copied `giorniSettimana` verbatim into the Prisma update, bypassing the `normalizeGiorniSettimana`
// canonicalization that POST always applies (via createTherapyInTx). This spec proves the FIXED
// PUT path: create a therapy via POST (Lun/Mar/Gio/Dom), then EDIT it via the UI (which issues a
// PUT), toggling one weekday off, and asserts the persisted/reloaded summary pill reflects the
// canonical edited set — the exact scenario the bug allowed to be silently corrupted.

const PATIENT = 'Moretti, Elena';
const DRUG = 'TestFarmaco241B';
const EVIDENCE_DIR = path.resolve(__dirname, '../../artifacts/task-validation/241-medication-weekday-schedule');

const IGNORED_CONSOLE_RE = /descendant of|nested|hydration/i;

async function clickText(page: Page, t: string) {
  await page.locator(`text="${t}"`).first().click();
}

async function openTerapiaTab(page: Page) {
  await page.locator('text="Pazienti"').first().click();
  await page.getByText(PATIENT, { exact: false }).first().click();
  // I tab L2/L3 sono role=tab e mostrano un badge conteggio ("Clinica 1"):
  // regex ancorata tollerante al badge (pattern provato nella spec #242).
  await page.getByRole('tab', { name: /^Clinica(\s+\d+)?$/ }).click();
  await page.getByRole('tab', { name: /^Terapia Farmacologica(\s+\d+)?$/ }).click();
}

function pillText(page: Page) {
  return page.locator('[data-testid="therapy-days-summary"]').first();
}

test('#241 PUT normalizes giorniSettimana on edit (regression for bypass)', async ({ page }, testInfo) => {
  mkdirSync(path.join(EVIDENCE_DIR, 'screenshots'), { recursive: true });

  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const httpIssues: string[] = [];
  page.on('response', (r: Response) => {
    const status = r.status();
    if (status >= 400 && status !== 401 && status !== 403) {
      httpIssues.push(`${r.request().method()} ${r.url()} → ${status}`);
    }
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');

  await openTerapiaTab(page);

  // Open the "new therapy" form: link nel corpo (stato vuoto) oppure bottone azioni
  // nell'header (cts__header-right ha stopPropagation) quando esistono già terapie.
  // NB: count() e non .catch() — il primo locator consumerebbe l'intero timeout.
  const addBodyLink = page.locator('button.link-btn', { hasText: 'Aggiungi' });
  if (await addBodyLink.count()) {
    await addBodyLink.first().click();
  } else {
    await page.locator('.cts__header-right button', { hasText: 'Aggiungi farmaco' }).first().click();
  }
  await page.waitForSelector('[data-testid="therapy-weekdays"]', { timeout: 8000 });
  await expect(page.locator('[data-testid="therapy-weekdays"]')).toBeVisible();

  await page.getByPlaceholder('es. Kanrenol').fill(DRUG);

  // AC1/AC3 — select Lun(1) Mar(2) Gio(4) Dom(7).
  for (const n of [1, 2, 4, 7]) {
    const toggle = page.locator(`[data-testid="weekday-${n}"]`);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  }

  const [createResp] = await Promise.all([
    page.waitForResponse((r) => /\/patients\/.+\/therap/i.test(r.url()) && r.request().method() === 'POST', { timeout: 10_000 }),
    page.getByRole('button', { name: /Salva terapia/i }).click(),
  ]);
  expect(createResp.status(), `POST status was ${createResp.status()}`).toBe(201);

  // AC2/AC3 — pill shows all four selected days.
  await expect(pillText(page)).toHaveText('Lun Mar Gio Dom', { timeout: 10_000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'screenshots', 'after-create-days-pill.png') });

  // Re-open the therapy for editing (icon-btn "Modifica" on the row for our new drug) and toggle
  // OFF weekday-2 (Mar). This exercises the PUT route under test.
  const row = page.locator('tr', { hasText: DRUG }).first();
  await expect(row).toBeVisible();
  await row.locator('button[title="Modifica"]').first().click();

  await page.waitForSelector('[data-testid="therapy-weekdays"]', { timeout: 8000 });
  const day2Toggle = page.locator('[data-testid="weekday-2"]');
  await expect(day2Toggle).toHaveAttribute('aria-pressed', 'true');
  await day2Toggle.click();
  await expect(day2Toggle).toHaveAttribute('aria-pressed', 'false');

  const [updateResp] = await Promise.all([
    page.waitForResponse((r) => /\/patients\/.+\/therap/i.test(r.url()) && r.request().method() === 'PUT', { timeout: 10_000 }),
    page.getByRole('button', { name: /Aggiorna/i }).click(),
  ]);
  expect(updateResp.status(), `PUT status was ${updateResp.status()}`).toBeGreaterThanOrEqual(200);
  expect(updateResp.status()).toBeLessThan(300);

  // AC6 — pill now reflects the canonicalized PUT-persisted set (Mar removed).
  await expect(pillText(page)).toHaveText('Lun Gio Dom', { timeout: 10_000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'screenshots', 'after-put-edit-days-pill.png') });

  // AC4 — persistence after reload: reload, navigate back to the tab, pill must be unchanged.
  await page.reload({ waitUntil: 'networkidle' });
  await clickText(page, 'Operatore');
  await page.waitForLoadState('networkidle');
  await openTerapiaTab(page);

  await expect(pillText(page)).toHaveText('Lun Gio Dom', { timeout: 10_000 });

  const resultPath = path.join(EVIDENCE_DIR, 'screenshots', 'result.png');
  await page.screenshot({ path: resultPath, fullPage: true });
  await testInfo.attach('result', { path: resultPath, contentType: 'image/png' });

  const newConsoleErrors = consoleErrors.filter((e) => !IGNORED_CONSOLE_RE.test(e));
  expect(newConsoleErrors, `unexpected console errors: ${newConsoleErrors.join(' | ')}`).toHaveLength(0);
  expect(httpIssues, `unexpected HTTP 4xx/5xx: ${httpIssues.join(' | ')}`).toHaveLength(0);
});
