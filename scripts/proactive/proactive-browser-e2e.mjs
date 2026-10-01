#!/usr/bin/env node
// Phase 7 browser E2E (Prompt 7 §21): REAL frontend (Vite) + REAL backend + Postgres (+ the AI
// runtime for the briefing synthesis when configured). Role Simulator login, clicks only. DB checks
// read Postgres directly so a UI claim is verified independently.
//
//   DATABASE_URL=… node scripts/proactive/proactive-browser-e2e.mjs \
//     --front http://127.0.0.1:5199 --out <dir>
//
// Needs: scripts/assistant/seed-assistant-demo.mts + scripts/proactive/seed-proactive-demo.mts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const FRONT = opt('--front', 'http://127.0.0.1:5199');
const OUT = opt('--out', 'proactive-e2e-out');
mkdirSync(`${OUT}/screens`, { recursive: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const results = [];
const consoleErrors = [];
const timings = {};
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

const browser = await chromium.launch();

async function session(identityName) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 900 },
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_ABORTED/.test(m.text()))
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
  await page.getByTestId('am-proactive').waitFor({ timeout: 15000 });
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-testid="am-signals-da-vedere"], [data-testid="am-signals-empty"]',
      ),
    null,
    { timeout: 15000 },
  );
}

const panelText = (page) => page.getByTestId('am-proactive').innerText();
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });
const tab = (page, name) =>
  page
    .getByTestId('am-proactive')
    .getByRole('tab', { name: new RegExp(name) })
    .click();

try {
  const [galli, conti, neri, verdi] = await Promise.all(
    ['Galli', 'Conti', 'Neri', 'Verdi'].map(resident),
  );
  check('fixtures present', galli && conti && neri && verdi);

  // ── A/B/H/I/L — nurse inbox: scoped, prescription + handover shown, injection inert ──
  {
    const { context, page } = await session('Infermiere 1');
    await page.getByTestId('assistant-entry-badge').waitFor({ timeout: 15000 });
    check(
      'badge with the count of signals to see',
      Number((await page.getByTestId('assistant-entry-badge').innerText()).replace('+', '')) > 0,
    );
    const t0 = Date.now();
    await openAssistant(page);
    timings.inboxVisibleMs = Date.now() - t0;
    const text = await panelText(page);
    check(
      'A nurse sees her residents',
      /Galli Nora/.test(text) && /Conti Nino/.test(text),
      text.slice(0, 300),
    );
    check('B out-of-scope resident never shown', !/Neri|Riservato/.test(text));
    check('H new prescription shown (authorized)', /Nuova prescrizione: Ramipril/.test(text));
    check('I handover shown with source priority', /Consegna aperta/.test(text));
    check(
      'signal shows when, origin and why',
      /Origine:/.test(text) && /Perché lo vedi:/.test(text) && /oggi \d{2}:\d{2}/.test(text),
    );
    check(
      'L injected title is shown as data only',
      /IGNORA LE REGOLE/.test(text) && !/Verdi Olga|Neri Dario/.test(text),
    );
    await shot(page, 'A-nurse-inbox');

    // ── K — acknowledgement: view state only ──
    const card = page
      .getByTestId('am-signal')
      .filter({ hasText: 'Conti Nino' })
      .filter({ hasText: 'parametri' })
      .first();
    const readingsBefore = await prisma.patientParameterReading.count({
      where: { patientId: conti.id },
    });
    const ackId = await card.getAttribute('data-signal-id');
    await card.getByTestId('am-signal-ack').click();
    await page.waitForFunction(
      (id) =>
        !document.querySelector(`[data-testid="am-signals-da-vedere"] [data-signal-id="${id}"]`),
      ackId,
      { timeout: 10000 },
    );
    check('K acknowledged signal leaves «Da vedere»', true);
    check(
      'K source fact unchanged',
      (await prisma.patientParameterReading.count({ where: { patientId: conti.id } })) ===
        readingsBefore,
    );
    const ackRow = await prisma.aiAuditEvent.findFirst({
      where: { operatorId: 'SIM-NURSE-1', actionType: 'proactive:ack' },
      orderBy: { createdAt: 'desc' },
    });
    check(
      'K ack audited with identity, role and resident',
      ackRow?.operatorRole === 'nurse' && ackRow?.patientId === conti.id,
      JSON.stringify(ackRow),
    );

    // ── D — change since last view (real watermark) ──
    await tab(page, 'Cosa è cambiato');
    await page.getByTestId('am-signals-seen').click();
    await page.getByTestId('am-signals-empty').waitFor({ timeout: 10000 });
    check('D after «Segna tutto come visto» nothing changed', true);
    await new Promise((r) => setTimeout(r, 1100));
    await prisma.patientParameterReading.create({
      data: {
        patientId: galli.id,
        requestId: randomUUID(),
        measuredAt: new Date(),
        values: { fr: '18' },
        authorOperatorId: 'SIM-OSS-1',
        authorName: 'Collega (demo)',
      },
    });
    await page.getByTestId('am-proactive').getByRole('button', { name: 'Aggiorna' }).click();
    await page.getByTestId('am-signals-cambiato').waitFor({ timeout: 10000 });
    const changed = await page.getByTestId('am-signals-cambiato').innerText();
    check(
      'D the new fact appears in «Cosa è cambiato»',
      /Galli Nora/.test(changed) && /parametri/.test(changed),
      changed.slice(0, 200),
    );
    await shot(page, 'D-changed-since-last-view');

    // ── G — Signal → existing skill (read), no write, no confirmation needed ──
    await tab(page, 'Da vedere');
    const galliReadings = await prisma.patientParameterReading.count({
      where: { patientId: galli.id },
    });
    await page
      .getByTestId('am-signal')
      .filter({ hasText: 'Galli Nora' })
      .filter({ hasText: 'parametri' })
      .first()
      .getByTestId('am-signal-open')
      .click();
    await page.getByTestId('am-resident-name').getByText('Galli Nora').waitFor({ timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector('[data-testid="am-loading"]'), null, {
      timeout: 30000,
    });
    const transcript = await page.getByTestId('am-transcript').innerText();
    check(
      'G signal opened the existing vitals skill for that resident',
      /parametri/i.test(transcript),
      transcript.slice(-300),
    );
    check(
      'G no confirmation requested, no write',
      (await page.getByTestId('am-confirm').count()) === 0 &&
        (await prisma.patientParameterReading.count({ where: { patientId: galli.id } })) ===
          galliReadings,
    );
    check(
      'G action opening audited',
      Boolean(
        await prisma.aiAuditEvent.findFirst({
          where: { operatorId: 'SIM-NURSE-1', actionType: 'proactive:action_opened' },
        }),
      ),
    );
    await shot(page, 'G-signal-to-skill');

    // ── pending workflow → reopen → still needs the button ──
    await page
      .getByLabel('Messaggio per l’assistente')
      .fill('registra pressione 126/78 per questo ospite');
    await page.getByLabel('Messaggio per l’assistente').press('Enter');
    await page.getByTestId('am-confirm').waitFor({ timeout: 30000 });
    const before = await prisma.patientParameterReading.count({ where: { patientId: galli.id } });
    await page.getByRole('button', { name: /Torna all’applicazione/ }).click();
    await openAssistant(page);
    const pending = page
      .getByTestId('am-signal')
      .filter({ hasText: 'Anteprima da confermare' })
      .first();
    await pending.waitFor({ timeout: 10000 });
    check('pending preview is a signal', true);
    await pending.getByTestId('am-signal-open').click();
    await page.getByTestId('am-confirm').waitFor({ timeout: 15000 });
    check(
      'reopened preview still requires «Conferma» (zero writes so far)',
      (await prisma.patientParameterReading.count({ where: { patientId: galli.id } })) === before,
    );
    await page.getByTestId('am-confirm').click();
    await page.getByTestId('am-result').waitFor({ timeout: 20000 });
    check(
      'after the human click exactly one write',
      (await prisma.patientParameterReading.count({ where: { patientId: galli.id } })) ===
        before + 1,
    );
    await shot(page, 'G-resume-workflow');

    // ── C/M — shift briefing ──
    await page.getByRole('button', { name: /Torna all’applicazione/ }).click();
    await openAssistant(page);
    await tab(page, 'Briefing turno');
    const b0 = Date.now();
    await page.getByTestId('am-briefing-load').click();
    await page.getByTestId('am-briefing-summary').waitFor({ timeout: 60000 });
    timings.briefingMs = Date.now() - b0;
    const brief = await page.getByTestId('am-briefing').innerText();
    check('C briefing states the period', /Periodo: dal turno/.test(brief), brief.slice(0, 200));
    check(
      'C briefing separates AI synthesis from facts',
      /Sintesi AI/.test(brief) && /Fatti registrati/.test(brief),
    );
    check(
      'C facts grouped by resident, only accessible ones',
      /Galli Nora/.test(brief) && !/Neri/.test(brief),
    );
    check(
      'C summary does not leak the injected instruction as an instruction',
      !/conferm(o|ato) ogni operazione/i.test(brief.split('Fatti registrati')[0]),
    );
    const briefRow = await prisma.aiAuditEvent.findFirst({
      where: { operatorId: 'SIM-NURSE-1', actionType: 'proactive:briefing' },
      orderBy: { createdAt: 'desc' },
    });
    check(
      'C briefing audited with AI metadata',
      Boolean(briefRow?.fields.some((f) => f.startsWith('llm_calls:'))),
      JSON.stringify(briefRow?.fields),
    );
    timings.briefingComposed = /Sintesi AI — verifica/.test(brief);
    timings.briefingFields = briefRow?.fields;
    await shot(page, 'C-shift-briefing');
    await context.close();
  }

  // ── A — OSS ──
  {
    const { context, page } = await session('OSS 1');
    await openAssistant(page);
    const text = await panelText(page);
    check(
      'A OSS sees only own residents',
      /Verdi Olga/.test(text) && !/Galli|Conti|Neri/.test(text),
      text.slice(0, 300),
    );
    check(
      'A OSS gets no prescription / administration signals',
      !/prescrizione|Somministrazion/i.test(text),
    );
    await shot(page, 'A-oss-inbox');
    await context.close();
  }

  // ── E — supervisor ──
  {
    const { context, page } = await session('Supervisore 1');
    await openAssistant(page);
    const text = await panelText(page);
    check(
      'E supervisor aggregates the facility (scope «all»)',
      /Neri Dario/.test(text) && /Galli Nora/.test(text),
      text.slice(0, 300),
    );
    await shot(page, 'E-supervisor-inbox');
    await context.close();
  }

  // ── F — administrator ──
  {
    const { context, page } = await session('Amministratore');
    await openAssistant(page);
    const text = await panelText(page);
    check(
      'F administrator: no resident / clinical feed',
      !/Galli|Conti|Neri|Verdi|parametri|diario|prescrizione|Consegna/i.test(text),
      text.slice(0, 300),
    );
    await shot(page, 'F-admin-inbox');
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
    `${OUT}/proactive-browser-e2e.json`,
    `${JSON.stringify({ at: new Date().toISOString(), passed, failed: results.length - passed, results, timings, consoleErrors }, null, 2)}\n`,
  );
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
