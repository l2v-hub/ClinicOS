#!/usr/bin/env node
// Phase 4 browser E2E (Prompt 4 §17–§18): the REAL frontend (Vite) + REAL backend + Postgres,
// Role Simulator login through the Login page, AI Assistant driven by clicks/typing only.
// DB checks read Postgres directly (never through the UI) so a UI claim is verified independently.
//
//   DATABASE_URL=… node scripts/assistant/assistant-browser-e2e.mjs \
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
const API = opt('--api', 'http://127.0.0.1:3099');
const OUT = opt('--out', 'assistant-e2e-out');
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

const browser = await chromium.launch();

async function session(identityName, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
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
  await page.getByTestId('am-identity').getByText(/\S/).first().waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="am-identity"]')?.textContent?.includes('Caricamento'),
  );
}

/** Runs a UI action and returns the LAST /skills/converse answer it produced (a prescription
 *  draft is followed by the automatic payload attach). */
async function turn(page, action) {
  const bodies = [];
  const listener = async (res) => {
    if (res.url().includes('/skills/converse')) bodies.push(res.json().catch(() => ({})));
  };
  page.on('response', listener);
  try {
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/skills/converse'), { timeout: 30000 }),
      action(),
    ]);
    await page.waitForFunction(() => !document.querySelector('[data-testid="am-loading"]'));
    await page.waitForTimeout(150);
  } finally {
    page.off('response', listener);
  }
  return (await Promise.all(bodies)).at(-1) ?? {};
}

async function say(page, text) {
  return turn(page, async () => {
    await page.getByLabel('Messaggio per l’assistente').fill(text);
    await page.getByLabel('Messaggio per l’assistente').press('Enter');
  });
}

async function pickResident(page, query, label) {
  await page.getByRole('button', { name: 'Cambia ospite' }).click();
  await page.getByLabel('Cerca ospite').fill(query);
  const item = page.locator('.am-picker__item', { hasText: label });
  await item.first().waitFor({ timeout: 10000 });
  await item.first().click();
  await page.getByTestId('am-resident-name').getByText(label).waitFor();
}

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/screens/${name}.png`, fullPage: false });

try {
  // ── A — OSS: only allowed skills; forbidden actions not executable ──
  {
    const { context, page } = await session('OSS 1');
    await openAssistant(page);
    const starters = await page.getByTestId('am-starters').locator('button').allInnerTexts();
    check(
      'A OSS starters come from real allowed skills',
      starters.length > 0,
      starters.join(' | '),
    );
    check(
      'A OSS: no prescription/administration starters',
      !starters.some((s) => /prescrizione|somministrazione/i.test(s)),
      starters.join(' | '),
    );
    await pickResident(page, 'Verdi', 'Verdi Olga');
    const r = await say(
      page,
      'prepara una prescrizione per questo ospite: Paracetamolo 1 g alle 8',
    );
    check('A OSS prescription → DENIED', r.status === 'DENIED', JSON.stringify(r).slice(0, 200));
    check('A no Conferma shown when denied', (await page.getByTestId('am-confirm').count()) === 0);
    await shot(page, 'A-oss-denied');
    await context.close();
  }

  // ── B + C — Doctor read, then sensitive write with preview/confirmation ──
  {
    const { context, page } = await session('Medico 1');
    await openAssistant(page);
    await pickResident(page, 'Neri', 'Neri Dario');
    await shot(page, 'B-doctor-starters');
    const read = await turn(page, () =>
      page
        .getByTestId('am-starters')
        .getByRole('button', { name: 'Dimmi tutto su questo ospite' })
        .click(),
    );
    check(
      'B doctor read skill COMPLETED',
      read.status === 'COMPLETED' && read.skillId === 'patient.overview',
      read.status,
    );
    check('B verified result card shown', await page.getByTestId('am-result').isVisible());
    const doc = await resident('Neri');
    const before = await prisma.patientTherapy.count({ where: { patientId: doc.id } });
    const draft = await say(
      page,
      'prescrivi Paracetamolo 1000 mg 1 compressa per os alle 8 e alle 20 per questo ospite',
    );
    check(
      'C preview shown (HIGH_RISK)',
      draft.status === 'NEEDS_CONFIRMATION' && (await page.getByTestId('am-preview').isVisible()),
      draft.status,
    );
    check(
      'C preview names the resident',
      (await page.getByTestId('am-preview-patient').innerText()).includes('Neri Dario'),
    );
    check(
      'C preview built from the exact payload (bound)',
      draft.preview?.therapyBound === true && draft.preview?.values?.Dosaggio === '1000 mg',
      JSON.stringify(draft.preview?.values),
    );
    check(
      'C nothing written by the preview',
      (await prisma.patientTherapy.count({ where: { patientId: doc.id } })) === before,
    );
    await shot(page, 'C-doctor-preview-tablet');
    await page.setViewportSize({ width: 820, height: 1180 });
    await shot(page, 'C-doctor-preview-portrait');
    await page.setViewportSize({ width: 1180, height: 820 });
    // UX: double click on Conferma → one write only.
    const done = await turn(page, async () => {
      await page.getByTestId('am-confirm').dblclick();
    });
    check(
      'C confirmed → COMPLETED',
      done.status === 'COMPLETED',
      JSON.stringify(done).slice(0, 300),
    );
    await page.getByTestId('am-result').waitFor();
    const after = await prisma.patientTherapy.findMany({
      where: { patientId: doc.id },
      include: { schedules: true },
    });
    check(
      'C exactly one therapy written (double click safe)',
      after.length === before + 1,
      `${before}→${after.length}`,
    );
    const created = after.find((t) => /paracetamolo/i.test(t.farmacoNome));
    check('C therapy from the classic mapper (2 schedules)', created?.schedules.length === 2);
    const audit = await prisma.aiAuditEvent.findFirst({
      where: {
        requestId: `skill-${draft.workflowId}`,
        actionType: 'skill:therapy.prescribe:execute',
      },
    });
    check(
      'C audit origin AI_ASSISTANT',
      audit?.channel === 'ai_assistant' && audit?.operatorRole === 'doctor',
      JSON.stringify(audit),
    );
    await shot(page, 'C-doctor-result');
    await context.close();
  }

  // ── D, E, G — Nurse: cancel, modify, change resident ──
  {
    const { context, page } = await session('Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const nora = await resident('Galli');
    // D — cancel
    const note = `annullata ${Date.now()}`;
    const d = await say(page, `crea una consegna per questo ospite: "${note}"`);
    check(
      'D handover preview (priority normale, type Assistente AI)',
      d.preview?.values?.['Priorità'] === 'normale' && d.preview?.values?.Tipo === 'Assistente AI',
    );
    const cancelled = await turn(page, () => page.getByTestId('am-cancel').click());
    check('D Annulla → CANCELLED', cancelled.status === 'CANCELLED');
    check('D no consegna written', (await prisma.consegna.count({ where: { note } })) === 0);
    // E — modify
    const beforeReadings = await prisma.patientParameterReading.count({
      where: { patientId: nora.id },
    });
    const p1 = await say(page, 'registra pressione 120/80 per questo ospite');
    check('E first preview 120/80', p1.preview?.values?.Pressione === '120/80');
    const mod = await turn(page, () => page.getByTestId('am-modify').click());
    check(
      'E Modifica → editable form',
      mod.pending === 'edit' && (await page.getByTestId('am-edit').isVisible()),
    );
    await page.getByTestId('am-edit').getByLabel('Pressione').fill('130/85');
    const p2 = await turn(page, () =>
      page.getByRole('button', { name: 'Prepara nuova anteprima' }).click(),
    );
    check(
      'E new preview id after edit',
      p2.preview?.previewId && p2.preview.previewId !== p1.preview.previewId,
    );
    check('E new preview shows 130/85', p2.preview?.values?.Pressione === '130/85');
    await shot(page, 'E-nurse-modified-preview');
    const ok = await turn(page, () => page.getByTestId('am-confirm').click());
    check('E confirm → COMPLETED', ok.status === 'COMPLETED');
    const readings = await prisma.patientParameterReading.findMany({
      where: { patientId: nora.id },
      orderBy: { createdAt: 'desc' },
    });
    check(
      'E only the modified values written',
      readings.length === beforeReadings + 1 && readings[0].values.pa === '130/85',
      JSON.stringify(readings[0]?.values),
    );
    // G — change resident during a sensitive workflow
    const beforeDiary = await prisma.patientDiaryEntry.count({ where: { patientId: nora.id } });
    const g = await say(
      page,
      'aggiungi un’osservazione nel diario di questo ospite: "respiro regolare"',
    );
    check(
      'G diary preview for Galli Nora',
      g.status === 'NEEDS_CONFIRMATION' && g.preview?.patient?.label === 'Galli Nora',
    );
    const switched = page.waitForResponse((r) => r.url().includes('/skills/converse'));
    await pickResident(page, 'Conti', 'Conti Nino');
    const switchedBody = await (await switched).json();
    check(
      'G change resident → workflow invalidated',
      switchedBody.status === 'CANCELLED' && switchedBody.error?.code === 'resident_changed',
      JSON.stringify(switchedBody).slice(0, 200),
    );
    check('G preview removed from screen', (await page.getByTestId('am-preview').count()) === 0);
    check(
      'G no diary written',
      (await prisma.patientDiaryEntry.count({ where: { patientId: nora.id } })) === beforeDiary,
    );
    await shot(page, 'G-nurse-resident-changed');
    // QA H1 — resident named in the text with NO resident context: multi-turn, then confirm
    await page.getByRole('button', { name: 'Chiudi contesto' }).click();
    await page.getByTestId('am-resident-name').getByText('Nessun ospite').waitFor();
    const nino = await resident('Conti');
    const ninoBefore = await prisma.patientParameterReading.count({ where: { patientId: nino.id } });
    const n1 = await say(page, 'registra i parametri per Nino Conti');
    check('H1 named resident → asks for values', n1.status === 'NEEDS_CLARIFICATION' && n1.pending === 'values', JSON.stringify(n1).slice(0, 200));
    const n2 = await say(page, 'fc 76');
    check('H1 preview targets the named resident', n2.preview?.patient?.label === 'Conti Nino');
    check('H1 operation target shown in the resident bar', (await page.getByTestId('am-operation-target').innerText()).includes('Conti Nino'));
    const n3 = await turn(page, () => page.getByTestId('am-confirm').click());
    check('H1 named-resident workflow completes (not cancelled)', n3.status === 'COMPLETED', JSON.stringify(n3).slice(0, 200));
    check('H1 one reading written', (await prisma.patientParameterReading.count({ where: { patientId: nino.id } })) === ninoBefore + 1);
    // F — out-of-scope resident is never offered by the picker
    await page.getByRole('button', { name: 'Cambia ospite' }).click();
    await page.getByLabel('Cerca ospite').fill('Verdi');
    await page.getByText('Nessun ospite tra quelli a cui hai accesso.').waitFor({ timeout: 10000 });
    check(
      'F out-of-scope resident not selectable (backend-filtered)',
      (await page.locator('.am-picker__item', { hasText: 'Verdi' }).count()) === 0,
    );
    await page.getByRole('button', { name: 'Cambia ospite' }).click();
    // I — transport failure on Conferma → no false success, no write
    await pickResident(page, 'Galli', 'Galli Nora');
    const adminsBefore = await prisma.medicationAdministration.count({
      where: { patientId: nora.id, stato: 'erogata' },
    });
    const adm = await say(page, 'Registra una somministrazione per questo ospite');
    check(
      'I administration prepared (HIGH_RISK preview)',
      adm.preview?.confirmationClass === 'HIGH_RISK' || adm.result?.recorded === false,
      adm.status,
    );
    if (adm.status === 'NEEDS_CONFIRMATION') {
      await page.route('**/skills/converse', (route) => route.abort('failed'), { times: 1 });
      await page.getByTestId('am-confirm').click();
      await page.getByRole('alert').waitFor({ timeout: 10000 });
      check(
        'I network failure → error shown, no success card',
        (await page.getByTestId('am-result').count()) === 0,
      );
      check(
        'I no administration written',
        (await prisma.medicationAdministration.count({
          where: { patientId: nora.id, stato: 'erogata' },
        })) === adminsBefore,
      );
      await shot(page, 'I-nurse-error');
      const confirmed = await turn(page, () => page.getByTestId('am-confirm').click());
      check(
        'I retry by the nurse → COMPLETED (explicit confirmation)',
        confirmed.status === 'COMPLETED',
      );
      check(
        'I one administration recorded',
        (await prisma.medicationAdministration.count({
          where: { patientId: nora.id, stato: 'erogata' },
        })) ===
          adminsBefore + 1,
      );
    }
    // J — back to the classic GUI, open a resident's chart, enter the assistant from the page
    await page.getByRole('button', { name: '← Torna all’applicazione' }).click();
    check(
      'J assistant closed, classic GUI back',
      (await page.getByRole('dialog', { name: 'Assistente AI' }).count()) === 0,
    );
    await page.getByLabel('Cerca paziente, camera, codice fiscale').click();
    await page.locator('.search-modal__input').fill('Galli');
    await page.locator('.search-modal__result-item', { hasText: 'Galli' }).first().click();
    await page.waitForTimeout(800);
    await shot(page, 'J-classic-patient-page');
    await openAssistant(page);
    await page.getByTestId('am-resident-name').getByText('Galli Nora').waitFor({ timeout: 10000 });
    check('J page resident carried into the assistant (server-verified)', true);
    await page.getByRole('button', { name: '← Torna all’applicazione' }).click();
    await page.getByTitle('Assistente', { exact: true }).click();
    await page.locator('.agnos-intro, .agnos-header-actions').first().waitFor({ timeout: 10000 });
    check('J legacy Agnos panel still opens (classic GUI regression)', true);
    await shot(page, 'J-classic-gui');
    await context.close();
  }

  // ── H — dynamic revocation by the Administrator (policy API), no restart ──
  {
    const { context, page } = await session('Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const pending = await say(page, 'registra fc 70 per questo ospite');
    check('H preview before revocation', pending.status === 'NEEDS_CONFIRMATION');
    const adminToken = (
      await (
        await fetch(`${API}/auth/simulator/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityId: 'SIM-ADMIN' }),
        })
      ).json()
    ).token;
    const auth = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const policy = await (await fetch(`${API}/authz/policy`, { headers: auth })).json();
    const doc = structuredClone(policy.active.document);
    doc.grants.nurse['parameters.create_reading'] = 'DENIED';
    await fetch(`${API}/authz/policy/versions`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        document: doc,
        basedOnVersion: policy.active.version,
        note: 'e2e revoca',
        apply: true,
      }),
    });
    try {
      const denied = await turn(page, () => page.getByTestId('am-confirm').click());
      check(
        'H revoked → DENIED without restart',
        denied.status === 'DENIED' && denied.error?.code === 'capability_revoked',
        JSON.stringify(denied).slice(0, 200),
      );
      await page.waitForTimeout(500);
      const starters = await page.getByTestId('am-starters').locator('button').allInnerTexts();
      check(
        'H revoked skill no longer suggested',
        !starters.some((s) => /Registra i parametri/.test(s)),
        starters.join(' | '),
      );
      await shot(page, 'H-nurse-revoked');
    } finally {
      const current = await (await fetch(`${API}/authz/policy`, { headers: auth })).json();
      const restored = structuredClone(current.active.document);
      restored.grants.nurse['parameters.create_reading'] = 'ALLOWED';
      await fetch(`${API}/authz/policy/versions`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          document: restored,
          basedOnVersion: current.active.version,
          note: 'e2e ripristino',
          apply: true,
        }),
      });
    }
    await context.close();
  }

  // ── Page context + phone layout + legacy Agnos panel regression ──
  {
    const { context, page } = await session('Infermiere 1', { width: 390, height: 844 });
    await openAssistant(page);
    await shot(page, 'phone-assistant');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    check('Phone: no horizontal scroll', !overflow);
    await page.getByRole('button', { name: '← Torna all’applicazione' }).click();
    await context.close();
  }
} catch (error) {
  check('script completed without exceptions', false, error?.stack ?? String(error));
} finally {
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' || '));
  await browser.close();
  await prisma.$disconnect();
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    `${OUT}/assistant-browser-e2e.json`,
    `${JSON.stringify({ at: new Date().toISOString(), passed, failed: results.length - passed, results, consoleErrors }, null, 2)}\n`,
  );
  console.log(`\n${passed}/${results.length} PASS`);
  process.exit(passed === results.length ? 0 : 1);
}
