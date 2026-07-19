// Issue #239 — Agnos chatbot plan routing (ported onto main).
//
// Codex QA FAILED: PR #254 lacked the aggregate rooms_occupancy dispatch and the required
// evidence dirs were absent. This spec drives the REAL Agnos chatbot (AgnosPanel, mounted in
// App.tsx) against the ported backend (branch fix/239-rooms-occupancy-port, commit 9167943):
//
//   textarea "Comando per Agnos"  →  POST /ai/actions/plan  →  orchestrate delegates the read
//   →  assistantQuery  →  deterministic planQuery  →  intent routing.
//
// Two routed questions are verified end-to-end in the browser:
//  A) "quante camere sono occupate oggi"  → rooms_occupancy → AGGREGATE counts only (no names)
//  B) "che terapie ha in corso" (patient in context) → therapies → >0 results (plural recognised)
//
// Deterministic mode: no Azure/LLM call is made (assistant default). Synthetic seed data only.

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../artifacts/task-validation/239-agnos-chatbot-plan-routing',
);
const SHOTS = path.join(EVIDENCE_DIR, 'screenshots');

// Known synthetic patient surnames present in the seed — asserted ABSENT from the aggregate
// occupancy answer to prove no patient identifier leaks (AC2).
const SEED_SURNAMES = ['Moretti', 'Rossi', 'Bianchi', 'Ferrari', 'Russo', 'Esposito', 'Colombo'];

// Pre-existing dev-only console noise unrelated to #239 (React nested-DOM / hydration warnings).
const IGNORED_CONSOLE_RE = /descendant of|nested|hydration|Download the React DevTools/i;

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

async function selectOperatoreRole(page: Page) {
  const roleButton = page.locator('text="Operatore"').first();
  if (await roleButton.count()) await roleButton.click();
}

async function openAgnos(page: Page) {
  await page.getByRole('button', { name: 'Agnos — Assistente ClinicOS' }).click();
  await expect(page.getByRole('dialog', { name: 'Agnos — Assistente ClinicOS' })).toBeVisible();
}

async function closeAgnos(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Agnos — Assistente ClinicOS' });
  await dialog.getByRole('button', { name: 'Chiudi' }).click();
  await expect(dialog).toBeHidden();
}

async function ask(page: Page, question: string) {
  const input = page.getByLabel('Comando per Agnos');
  await input.click();
  await input.fill(question);
  await page.getByRole('button', { name: 'Invia' }).click();
}

test.describe('#239 — Agnos plan routing (rooms_occupancy aggregate + plural terapie)', () => {
  test('routes occupancy to aggregate counts (no names) and plural terapie to therapies', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];
    page.on('console', (m: ConsoleMessage) => {
      if (m.type() === 'error' && !IGNORED_CONSOLE_RE.test(m.text())) consoleErrors.push(m.text());
    });
    page.on('response', (res) => {
      const s = res.status();
      if (s >= 400 && s !== 401 && s !== 403)
        badResponses.push(`${res.request().method()} ${res.url()} -> ${s}`);
    });

    // ── AC1/AC2: aggregate rooms occupancy, counts only ──────────────────────────
    await page.goto('/');
    await selectOperatoreRole(page);
    await openAgnos(page);

    const [planResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/ai\/actions\/plan$/.test(r.url()) && r.request().method() === 'POST',
      ),
      ask(page, 'quante camere sono occupate oggi'),
    ]);
    expect(planResp.status(), `POST ${planResp.url()}`).toBe(200);

    // The read-answer renders the occupancy source produced by query_rooms_occupancy.
    const occupancyLabel = page.locator('.ai-asst__source-label', {
      hasText: 'Occupazione camere',
    });
    await expect(occupancyLabel).toBeVisible({ timeout: 15_000 });

    const occupancyText = page
      .locator('.ai-asst__source-text', { hasText: /letti occupati/i })
      .first();
    await expect(occupancyText).toBeVisible();
    // Aggregate shape: "<occupied>/<total> letti occupati; <rooms> camere censite".
    await expect(occupancyText).toHaveText(/^\d+\/\d+ letti occupati; \d+ camere censite$/);

    // AC2: no patient surname anywhere in the answer body (counts only).
    const drawerText =
      (await page.getByRole('dialog', { name: 'Agnos — Assistente ClinicOS' }).innerText()) ?? '';
    for (const surname of SEED_SURNAMES) {
      expect(drawerText, `occupancy answer must not leak patient name "${surname}"`).not.toContain(
        surname,
      );
    }

    await page.screenshot({ path: path.join(SHOTS, 'rooms-occupancy.png'), fullPage: true });

    // ── AC3: plural "terapie" with a patient in context → therapies intent ───────
    // Close the drawer (its scrim would intercept nav clicks), open a patient so
    // AgnosPanel receives currentPatientId, then re-open the panel.
    await closeAgnos(page);
    await page.getByText('Pazienti', { exact: false }).first().click();
    await page.getByText('Moretti, Elena', { exact: false }).first().click();
    await openAgnos(page);

    const [planResp2] = await Promise.all([
      page.waitForResponse(
        (r) => /\/ai\/actions\/plan$/.test(r.url()) && r.request().method() === 'POST',
      ),
      ask(page, 'che terapie ha in corso'),
    ]);
    expect(planResp2.status(), `POST ${planResp2.url()}`).toBe(200);

    // A therapies answer renders a result count and at least one source (not "Informazione non trovata").
    const notFound = page.locator('.ai-asst__muted', { hasText: 'Informazione non trovata' });
    const count = page.locator('.ai-asst__count').last();
    await expect(count).toBeVisible({ timeout: 15_000 });
    await expect(count).toHaveText(/\d+ risultat/);
    await expect(notFound).toHaveCount(0);

    await page.screenshot({ path: path.join(SHOTS, 'result.png'), fullPage: true });

    // ── AC4: no console errors, no unexpected 4xx/5xx ────────────────────────────
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(badResponses, `Unexpected HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);
  });
});
