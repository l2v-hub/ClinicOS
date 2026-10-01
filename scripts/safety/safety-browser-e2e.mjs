#!/usr/bin/env node
// Phase 6 browser E2E (Prompt 6 §12 result integrity, §8 idempotency, §14–§15 session
// transitions): REAL frontend (Vite) + REAL backend + Postgres, Role Simulator login, clicks only.
// Network faults are injected with Playwright routing (the request reaches the server, the answer
// is dropped — «timeout after commit»); DB checks read Postgres directly.
//
//   DATABASE_URL=… node scripts/safety/safety-browser-e2e.mjs \
//     --front http://127.0.0.1:5199 --api http://127.0.0.1:3099 --out <dir>
//
// Needs synthetic residents: scripts/assistant/seed-assistant-demo.mts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const FRONT = opt('--front', 'http://127.0.0.1:5199');
const OUT = opt('--out', 'safety-e2e-out');
mkdirSync(`${OUT}/screens`, { recursive: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const results = [];
const consoleErrors = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail: String(detail).slice(0, 300) });
  console.log(
    `${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : `  → ${String(detail).slice(0, 300)}`}`,
  );
}
const resident = (lastName) =>
  prisma.patient.findFirst({
    where: { lastName, medicalRecordNumber: { startsWith: 'DEMO-P4-' } },
  });
const readings = (patientId) => prisma.patientParameterReading.count({ where: { patientId } });

const browser = await chromium.launch();

async function session(identityName) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    // Dropped responses are injected on purpose: the browser logs them as failed fetches.
    if (
      m.type() === 'error' &&
      !/Failed to load resource|net::ERR_ABORTED|net::ERR_FAILED|Failed to fetch/.test(m.text())
    )
      consoleErrors.push(`${identityName}: ${m.text()}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(identityName) })
    .first()
    .click();
  await page.getByTestId('assistant-entry').waitFor({ timeout: 20000 });
  return { context, page };
}

async function openAssistant(page) {
  await page.getByTestId('assistant-entry').click();
  await page.getByRole('dialog', { name: 'Assistente AI' }).waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="am-identity"]')?.textContent?.includes('Caricamento'),
  );
}

async function pickResident(page, query, label) {
  await page.getByRole('button', { name: 'Cambia ospite' }).click();
  await page.getByLabel('Cerca ospite').fill(query);
  const item = page.locator('.am-picker__item', { hasText: label });
  await item.first().waitFor({ timeout: 10000 });
  await item.first().click();
  await page.getByTestId('am-resident-name').getByText(label).waitFor();
}

async function draftVitals(page, text) {
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/skills/converse'), { timeout: 30000 }),
    (async () => {
      await page.getByLabel('Messaggio per l’assistente').fill(text);
      await page.getByLabel('Messaggio per l’assistente').press('Enter');
    })(),
  ]);
  await page.getByTestId('am-confirm').waitFor({ timeout: 15000 });
}

/** Drops the answer of the NEXT confirm: `mode` 'after' lets it reach the server first
 *  (commit happens, answer lost); 'before' aborts it before it leaves the browser. Optionally
 *  also breaks the reconciliation GET. */
async function dropNextConfirm(page, mode, { breakReconcile = false } = {}) {
  let armed = true;
  await page.route('**/skills/converse', async (route) => {
    const body = route.request().postDataJSON?.() ?? {};
    if (armed && body.action === 'confirm') {
      armed = false;
      if (mode === 'after') await route.fetch().catch(() => undefined);
      return route.abort('failed');
    }
    return route.continue();
  });
  if (breakReconcile) await page.route('**/skills/workflows/**', (route) => route.abort('failed'));
}

const transcript = (page) => page.getByTestId('am-transcript').innerText();
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });

try {
  const galli = await resident('Galli');
  const conti = await resident('Conti');
  check('fixtures: seeded residents present', galli && conti);

  // ── R1 — confirm reaches the server, answer lost → reconciled «verificato», exactly one write ──
  {
    const { context, page } = await session('Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = await readings(galli.id);
    await draftVitals(page, 'registra pressione 131/81 per questo ospite');
    await dropNextConfirm(page, 'after');
    const reconcile = page.waitForResponse((r) => r.url().includes('/skills/workflows/'), {
      timeout: 20000,
    });
    await page.getByTestId('am-confirm').click();
    const rec = await reconcile;
    check('R1 UI asks the server for the real outcome', rec.status() === 200, rec.status());
    await page
      .getByText('Esito verificato dopo un problema di rete')
      .first()
      .waitFor({ timeout: 10000 });
    check(
      'R1 shows «Esito verificato… completata»',
      /Esito verificato dopo un problema di rete/.test(await transcript(page)),
    );
    check(
      'R1 exactly one reading written',
      (await readings(galli.id)) === before + 1,
      `${before} → ${await readings(galli.id)}`,
    );
    check(
      'R1 no Conferma left to press again',
      (await page.getByTestId('am-confirm').count()) === 0,
    );
    await shot(page, 'R1-lost-answer-verified');
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // ── R2 — confirm never reaches the server → «nessuna registrazione», preview still confirmable ──
    const before2 = await readings(conti.id);
    await pickResident(page, 'Conti', 'Conti Nino');
    await draftVitals(page, 'registra pressione 132/82 per questo ospite');
    await dropNextConfirm(page, 'before');
    await page.getByTestId('am-confirm').click();
    await page
      .getByText('La conferma non è arrivata al sistema')
      .first()
      .waitFor({ timeout: 10000 });
    check(
      'R2 says nothing was recorded',
      /nessuna registrazione eseguita/.test(await transcript(page)),
    );
    check('R2 zero writes', (await readings(conti.id)) === before2);
    check(
      'R2 Conferma still available (same preview)',
      (await page.getByTestId('am-confirm').count()) === 1,
    );
    await shot(page, 'R2-confirm-not-delivered');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.getByTestId('am-confirm').click();
    await page.getByTestId('am-result').waitFor({ timeout: 15000 });
    check('R2 second press records exactly once', (await readings(conti.id)) === before2 + 1);

    // ── R3 — answer lost AND server unreachable → «Esito NON verificato», no retry offered ──
    const before3 = await readings(galli.id);
    await pickResident(page, 'Galli', 'Galli Nora');
    await draftVitals(page, 'registra pressione 133/83 per questo ospite');
    await dropNextConfirm(page, 'after', { breakReconcile: true });
    await page.getByTestId('am-confirm').click();
    await page.getByText('Esito NON verificato').first().waitFor({ timeout: 15000 });
    check('R3 outcome unknown is said explicitly', true);
    check(
      'R3 the commit did happen server-side (one reading)',
      (await readings(galli.id)) === before3 + 1,
    );
    check(
      'R3 never claims success',
      !/registrat[ia] per|completata dal sistema/.test(
        (await transcript(page)).split('133/83').at(-1) ?? '',
      ),
    );
    await shot(page, 'R3-outcome-unknown');
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // ── S1 — logout / identity change: the Assistant closes and shows nothing of the old user ──
    // Logout while the Assistant is OPEN (session end from any source): DOM clicks reach the
    // user menu underneath the modal.
    check(
      'S1 Assistant open before logout',
      await page.getByRole('dialog', { name: 'Assistente AI' }).isVisible(),
    );
    await page.locator('.topbar-avatar').dispatchEvent('click');
    await page.locator('.topbar-user-menu__logout').waitFor({ state: 'attached', timeout: 5000 });
    await page.locator('.topbar-user-menu__logout').dispatchEvent('click');
    await page.getByRole('button', { name: /OSS 1/ }).first().click();
    await page.getByTestId('assistant-entry').waitFor({ timeout: 20000 });
    check(
      'S1 after identity change the Assistant is closed',
      !(await page
        .getByRole('dialog', { name: 'Assistente AI' })
        .isVisible()
        .catch(() => false)),
    );
    await openAssistant(page);
    const t = await transcript(page).catch(() => '');
    check(
      'S1 no previous conversation visible to the new user',
      !/131\/81|132\/82|133\/83|Galli|Conti/.test(t),
      t.slice(0, 200),
    );
    await shot(page, 'S1-after-identity-change');
    await context.close();
  }

  // ── D1 — Diario: answer lost after commit, operator presses Salva again → ONE entry ──
  {
    const { context, page } = await session('Infermiere 1');
    await page
      .locator('.teams-sidebar')
      .getByRole('button', { name: 'Pazienti', exact: true })
      .first()
      .click();
    await page.getByText('Galli', { exact: false }).first().click();
    // The resident overview embeds the Diario Paziente card.
    await page.getByRole('button', { name: 'Aggiungi voce', exact: true }).first().click();
    const text = `Nota sicurezza fase 6 ${Date.now()}`;
    await page.getByPlaceholder('Descrizione, note cliniche…').fill(text);
    const sent = [];
    let drop = true;
    await page.route('**/patients/*/diary', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      sent.push(route.request().postDataJSON()?.requestId);
      if (drop) {
        drop = false;
        await route.fetch().catch(() => undefined);
        return route.abort('failed');
      }
      return route.continue();
    });
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await page.getByText('Errore nel salvataggio della voce.').first().waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await page.waitForFunction(
      (t) =>
        !document.querySelector('.diario-form__actions') || document.body.innerText.includes(t),
      text,
      { timeout: 10000 },
    );
    await page.waitForTimeout(500);
    const count = await prisma.patientDiaryEntry.count({
      where: { patientId: galli.id, content: text },
    });
    check(
      'D1 the retry reused the same requestId',
      sent.length === 2 && sent[0] && sent[0] === sent[1],
      JSON.stringify(sent),
    );
    check('D1 exactly one diary entry after lost answer + retry', count === 1, `count=${count}`);
    await shot(page, 'D1-diary-retry-one-entry');
    await context.close();
  }
} catch (error) {
  check('script completed without exceptions', false, error?.stack ?? String(error));
} finally {
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' || '));
  await prisma.$disconnect();
  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    `${OUT}/safety-browser-e2e.json`,
    `${JSON.stringify({ at: new Date().toISOString(), passed, failed: results.length - passed, results, consoleErrors }, null, 2)}\n`,
  );
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
