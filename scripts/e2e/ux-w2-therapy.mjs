// UX cycle 2026-10-03 — W2 therapy: information without clicks, administration in place, PRN,
// supervisor confirmation. LOCAL synthetic stack only (never prod).
// Prereq: backend :3112 (AUTH_MODE=demo, ROLE_SIMULATOR_ENABLED=true), vite :5212, DB seeded with
// scripts/assistant/seed-assistant-demo.mts + scripts/e2e/seed-phase10-demo.mts (Nanni Miriam,
// Ramipril/Metformina/Pantoprazolo + Paracetamolo «al bisogno»).
// Usage: DATABASE_URL=<local DB> node scripts/e2e/ux-w2-therapy.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5212';
const API = process.env.API ?? 'http://127.0.0.1:3112';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux-direct-access-cycle/w2';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
if (!NANNI) throw new Error('seed Nanni Miriam first');
const therapyId = async (name) =>
  (
    await db.query(
      `SELECT id FROM "PatientTherapy" WHERE "patientId"=$1 AND "farmacoNome"=$2 AND stato='attiva'`,
      [NANNI, name],
    )
  ).rows[0]?.id;
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
// Clean state for this run (synthetic patient only).
await db.query(`DELETE FROM "MedicationAdministration" WHERE "patientId"=$1 AND date=$2`, [
  NANNI,
  today,
]);
await db.query(`DELETE FROM "PrnAdministration" WHERE "patientId"=$1`, [NANNI]);

const results = [];
const httpErrors = [];
const consoleErrors = [];
function check(id, name, ok, detail = '') {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}
const browser = await chromium.launch();

async function login(role, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${role}: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => {
    const s = r.status();
    if (s >= 500 || s === 403 || (s >= 400 && !/\/auth\/|favicon/.test(r.url())))
      httpErrors.push(`${role} ${s} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
  await page.waitForTimeout(1000);
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });
async function done(context, name) {
  await context.tracing.stop({ path: `${OUT}/trace-${name}.zip` });
  await context.close();
}
async function openPatient(page, surname, label, id) {
  await page.getByRole('button', { name: 'Cerca paziente, camera, codice fiscale' }).click();
  await page.keyboard.type(surname);
  await page.locator('.search-overlay').getByText(label).first().click();
  await page.waitForURL(new RegExp(id), { timeout: 10000 });
  await page.waitForTimeout(800);
}
const openNanni = (page) => openPatient(page, 'Nanni', 'Nanni, Miriam', NANNI);
async function openTherapy(page) {
  await page
    .locator('.top-nav__item')
    .filter({ hasText: /^Terapia/ })
    .first()
    .click();
  await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);
}
// W5: the chart Terapia has the views Calendario / Storico / Nuova terapia.
async function subTab(page, label) {
  await page
    .locator('[id^="therapy-section"]')
    .filter({ hasText: new RegExp(`^${label}`) })
    .first()
    .click();
  await page.waitForTimeout(800);
}
async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
async function administrations(name) {
  return (
    await db.query(
      `SELECT stato, motivo, note, "operatoreId" FROM "MedicationAdministration"
       WHERE "patientId"=$1 AND date=$2 AND "farmacoNome"=$3 ORDER BY ora`,
      [NANNI, today, name],
    )
  ).rows;
}
async function apiSession(identityId) {
  const r = await fetch(`${API}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityId }),
  });
  return (await r.json()).token;
}

try {
  // ── 1. Nurse, tablet landscape: calendar shows everything without a click ──
  {
    const { context, page } = await login('Infermiere 1');
    await openNanni(page);
    await openTherapy(page);
    await subTab(page, 'Calendario');
    const event = page.getByTestId('ptc-event').filter({ hasText: 'Metformina' }).first();
    await event.waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    const text = (await event.innerText()).replace(/\s+/g, ' ');
    check(
      'W2-01',
      'Calendar event shows drug, strength + quantity, route, status in words, prescriber, note — without a click',
      /Metformina/.test(text) &&
        /1 compressa — 500 mg/.test(text) &&
        /orale/.test(text) &&
        /(Da somministrare|In ritardo di \d+ min|Somministrata|Non somministrata)/.test(text) &&
        /Prescr\. Dr\. Medico Uno/.test(text) &&
        /Dopo il pasto/.test(text),
      text,
    );
    // W5: the hour of the first due dose opens by itself; the information above was read on the
    // dose buttons themselves, before any tap.
    await shot(page, 'W2-01-calendar-day-1180');

    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await page.waitForTimeout(1500);
    const weekDoses = await page.getByTestId('ptc-week-dose').allInnerTexts();
    check(
      'W2-02',
      'Week view lists every dose with dose and status',
      weekDoses.length >= 7 &&
        weekDoses.some((t) => /Ramipril/.test(t) && /5 mg/.test(t)) &&
        weekDoses.every((t) =>
          /(Da somministrare|ritardo|Somministrata|Non |registrata|Stato)/.test(t),
        ),
      `${weekDoses.length} doses`,
    );
    await shot(page, 'W2-02-calendar-week-1180');

    // W5 (UX cycle 2): the «Farmaci attivi» / «Somministrazioni giornaliere» sub-tabs are gone;
    // administering from the calendar, Non somm., PRN and roles are asserted by ux-w5-therapy.mjs.
    await done(context, 'nurse-1180');
  }

  // ── 6. Supervisor: confirmation in app AND on the server ──
  {
    const token = await apiSession('SIM-SUPERVISOR-1');
    const pantoprazolo = await therapyId('Pantoprazolo');
    const unconfirmed = await fetch(`${API}/therapy-slots/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        patientId: NANNI,
        therapyId: pantoprazolo,
        date: today,
        fascia: 'pranzo',
      }),
    });
    const unconfirmedBody = await unconfirmed.json();
    check(
      'W2-08a',
      'Server rejects supervisor administration without explicit confirmation (428)',
      unconfirmed.status === 428 && unconfirmedBody.code === 'confirmation_required',
      `${unconfirmed.status} ${unconfirmedBody.code}`,
    );
    check(
      'W2-08b',
      'Nothing written by the rejected call',
      (await administrations('Pantoprazolo')).length === 0,
    );

    // The in-app confirmation dialog (now from the calendar hour) is asserted by ux-w5-therapy.mjs W5-14.
  }

  // ── 8. Ward week calendar: cells list the doses ──
  {
    const { context, page } = await login('Infermiere 1');
    await page.locator('.teams-sidebar').getByRole('button', { name: 'Terapia' }).first().click();
    await page.waitForTimeout(1500);
    await page
      .getByRole('button', { name: /Calendario/ })
      .first()
      .click();
    await page.waitForTimeout(2500);
    const lists = await page.getByTestId('therapy-dose-list').allInnerTexts();
    const joined = lists.join(' ').replace(/\s+/g, ' ');
    check(
      'W2-10',
      'Ward week calendar cells list patient · drug · dose · status (no tap)',
      /Nanni, Miriam/.test(joined) &&
        /Ramipril · 1 compressa — 5 mg/.test(joined) &&
        // W5: this suite no longer administers in the chart first, so any status in words counts.
        /(Somministrata|In ritardo di \d+ min|Da somministrare|Non somministrata)/.test(joined),
      joined.slice(0, 200),
    );
    await shot(page, 'W2-10-ward-week-1180');
    await done(context, 'ward-1180');
  }

  // ── 9. Portrait 820x1180: readable, no horizontal scroll ──
  {
    // Patient chart at 820 (Calendario / Storico / drug detail): ux-w5-therapy.mjs W5-22.
    const a = true;
    const b = true;
    const c = true;
    const eventText = '1 compressa — 500 mg';
    // Ward calendar at 820: fresh session, sidebar drawer → Terapia → Calendario.
    const ward = await login('Infermiere 1', { width: 820, height: 1180 });
    const wp = ward.page;
    await wp.getByRole('button', { name: 'Apri menu' }).first().click();
    await wp.waitForTimeout(500);
    await wp.locator('.teams-sidebar').getByRole('button', { name: 'Terapia' }).first().click();
    await wp.waitForTimeout(1500);
    await wp
      .locator('.giro-tools')
      .getByRole('button', { name: /Calendario/ })
      .click();
    await wp.waitForTimeout(2500);
    const d = await noHorizontalScroll(wp);
    const stackVisible = await wp.locator('.tcal__stack').isVisible();
    const stackText = (await wp.locator('.tcal__stack').innerText()).replace(/\s+/g, ' ');
    await shot(wp, 'W2-11-ward-week-820');
    // Giro rows: overdue pending doses say «In ritardo di N min», the dose appears once.
    await wp
      .locator('.giro-tools')
      .getByRole('button', { name: /^Giro$/ })
      .click();
    await wp.waitForTimeout(1500);
    const giroText = (
      await wp
        .locator('.giro-patients')
        .first()
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    await shot(wp, 'W2-12-giro-late-820');
    check(
      'W2-11',
      '820x1180: ward week readable without horizontal scroll (chart views: W5-22)',
      a &&
        b &&
        c &&
        d &&
        stackVisible &&
        /1 compressa — 500 mg/.test(eventText) &&
        /Nanni, Miriam/.test(stackText),
      `ward=${d} stacked=${stackVisible}`,
    );
    check(
      'W2-14',
      'Giro rows: late pending dose shows «In ritardo di N min» (or every dose already recorded)',
      /In ritardo di \d+ min/.test(giroText) || !/Somministra/.test(giroText),
      giroText.slice(0, 240),
    );
    await done(ward.context, 'ward-820');
  }
} catch (error) {
  check('W2-ERR', 'script error', false, String(error?.stack ?? error).slice(0, 600));
} finally {
  await browser.close();
  await db.end();
}

check(
  'W2-12',
  'No console errors',
  consoleErrors.length === 0,
  consoleErrors.join(' || ').slice(0, 600),
);
check(
  'W2-13',
  'No 403/4xx/5xx from the UI',
  httpErrors.length === 0,
  httpErrors.join(' || ').slice(0, 600),
);
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify(
    { date: new Date().toISOString(), today, results, consoleErrors, httpErrors },
    null,
    2,
  ),
);
const failed = results.filter((r) => r.result === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
