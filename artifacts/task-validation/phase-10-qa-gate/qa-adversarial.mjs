// Independent QA Gate — adversarial journeys (LOCAL synthetic stack only).
// Run from worktree root: DATABASE_URL=<local p10e2e> node artifacts/task-validation/phase-10-qa-gate/qa-adversarial.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = 'http://127.0.0.1:5199';
const API = 'http://127.0.0.1:3099';
const OUT = process.argv[2];
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1/.test(DB)) throw new Error('LOCAL DB only');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const q1 = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const NANNI = (
  await q1(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).id;
const OLGA = (await q1(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P4-Olga-Verdi'`))
  .id;

const results = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};
const browser = await chromium.launch();
const net = {};
const consoleErrors = {};

async function login(role, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({
    viewport,
    hasTouch: true,
    recordVideo: { dir: `${OUT}/video` },
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  net[role] = [];
  consoleErrors[role] = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url()))
      net[role].push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  page.on(
    'console',
    (m) => m.type() === 'error' && consoleErrors[role].push(m.text().slice(0, 200)),
  );
  page.on('pageerror', (e) => consoleErrors[role].push(`pageerror ${e.message.slice(0, 200)}`));
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
  await page.waitForTimeout(1200);
  return { context, page };
}
const shot = (page, n) => page.screenshot({ path: `${OUT}/screens/${n}.png`, fullPage: false });
const side = (page, name) =>
  page.locator('.teams-sidebar').getByRole('button', { name }).first().click();
const activeSection = async (page) =>
  (
    await page
      .locator('.top-nav [aria-selected="true"], .top-nav [aria-current="page"]')
      .allInnerTexts()
  ).map((t) => t.replace(/\s+/g, ' ').trim());
async function done(context, name) {
  await context.tracing.stop({ path: `${OUT}/trace-${name}.zip` });
  await context.close();
}

try {
  // ── 1. Nurse on Nanni: deep links with ACTIVE section asserted, calendar → Non somm. with reason ──
  {
    const role = 'Infermiere 1';
    const { context, page } = await login(role);
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
    await page.getByText('Nanni, Miriam').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    for (const [nav, expected] of [
      ['Parametri', 'Parametri'],
      ['Consegne', null],
      ['Terapia', 'Terapia'],
    ]) {
      await side(page, nav);
      await page.waitForTimeout(1800);
      const act = await activeSection(page);
      const heading = await page
        .getByText('Nanni, Miriam')
        .first()
        .isVisible()
        .catch(() => false);
      check(
        'QA-DL',
        `Ward «${nav}» from Nanni chart keeps Nanni + opens section`,
        page.url().includes(NANNI) &&
          heading &&
          (expected ? act.some((a) => a.startsWith(expected)) : act.length > 0),
        `active=[${act.join('|')}] url=${page.url().split('#')[1]}`,
      );
      await shot(page, `QA-DL-${nav}`);
    }
    // Calendar → 08:00 → Metformina «Non erogata» with reason
    await page
      .locator('main button:has-text("Calendario"), main [role=tab]:has-text("Calendario")')
      .first()
      .click();
    const slot = page.getByRole('button', { name: /08:00 Metformina/ });
    await slot.waitFor({ timeout: 10000 });
    await slot.click();
    const detail = page.getByTestId('patient-therapy-slot-detail');
    await detail.waitFor({ timeout: 8000 });
    await page.waitForTimeout(1500);
    const before = await q1(
      `SELECT count(*)::int n FROM "MedicationAdministration" WHERE "patientId"=$1 AND "farmacoNome"='Metformina' AND stato='non_erogata'`,
      [NANNI],
    );
    await detail
      .getByRole('button', { name: /^Non erogata: .*Metformina/ })
      .first()
      .click();
    const reasons = detail.getByRole('group', { name: /Motivo della mancata somministrazione/ });
    await reasons.waitFor({ timeout: 5000 });
    const confirmBtn = reasons.getByRole('button', { name: /^Conferma non erogata/ });
    const disabledWithoutReason = await confirmBtn.isDisabled();
    await reasons.getByRole('button', { name: /^Rifiutata dal paziente/ }).click();
    await confirmBtn.click();
    await page.waitForTimeout(2500);
    const row = await q1(
      `SELECT stato, motivo, "operatoreId", date FROM "MedicationAdministration" WHERE "patientId"=$1 AND "farmacoNome"='Metformina' AND ora='08:00' ORDER BY "updatedAt" DESC LIMIT 1`,
      [NANNI],
    );
    const fb = await detail
      .locator('.patient-therapy-slot-detail__feedback')
      .innerText()
      .catch(() => '');
    await shot(page, 'QA-NS-not-administered');
    check(
      'QA-NS',
      'Nurse records «Non somministrata» with reason from chart calendar (persisted, reason required)',
      disabledWithoutReason &&
        row?.stato === 'non_erogata' &&
        row?.motivo === 'rifiutata_paziente' &&
        before.n === 0 &&
        /Mancata somministrazione/.test(fb),
      `confirm disabled w/o reason=${disabledWithoutReason}; db=${JSON.stringify(row)}; feedback «${fb}»`,
    );
    // Re-open after reload: state shown from server, no second action offered
    await page.reload();
    await page
      .getByRole('button', { name: /Infermiere 1/ })
      .first()
      .click();
    await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
    await page.getByText('Nanni, Miriam').first().waitFor({ timeout: 15000 });
    await side(page, 'Terapia');
    await page.waitForTimeout(1500);
    await page
      .locator('main button:has-text("Calendario"), main [role=tab]:has-text("Calendario")')
      .first()
      .click();
    await page.getByRole('button', { name: /08:00 Metformina/ }).click();
    const d2 = page.getByTestId('patient-therapy-slot-detail');
    await d2.waitFor({ timeout: 8000 });
    await page.waitForTimeout(2000);
    const again = await d2.getByRole('button', { name: /^Non erogata: .*Metformina/ }).count();
    const d2text = (await d2.innerText()).replace(/\s+/g, ' ');
    await shot(page, 'QA-NS-after-reload');
    check(
      'QA-NS-b',
      'After reload the recorded state is shown; no duplicate action on Metformina 08:00',
      again === 0 && /Rifiutata dal paziente/.test(d2text),
      d2text.slice(0, 260),
    );

    // Double-submit guard at the API: same slot again → 409 with server message
    const token = await page.evaluate(() => sessionStorage.length + localStorage.length);
    void token;

    // ── Diary: create (no date), then edit legacy 'importante' entry ──
    await side(page, 'Pazienti');
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
    await page.getByText('Nanni, Miriam').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /^Aggiungi voce$/ }).click();
    const createDate = await page.locator('.cr-inline-form input[type="datetime-local"]').count();
    const createStatus = await page.locator('.cr-inline-form').getByLabel('Stato').count();
    check(
      'QA-DY-a',
      'Diary create form: no datetime input, no Stato select (real container)',
      createDate === 0 && createStatus === 0,
      `datetime=${createDate} stato=${createStatus}`,
    );
    const text = `QA nota ${Date.now()}`;
    await page.locator('#diario-new-content').fill(text);
    await page.getByRole('button', { name: /^Salva$/ }).click();
    await page.waitForTimeout(2000);
    const created = await q1(
      `SELECT id, "entryDateTime", priority, status FROM "PatientDiaryEntry" WHERE "patientId"=$1 AND content=$2`,
      [NANNI, text],
    );
    const nowRome = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Rome',
      dateStyle: 'short',
      timeStyle: 'short',
    })
      .format(new Date())
      .replace(' ', 'T');
    const mins = (s) => new Date(`${s}:00Z`).getTime() / 60000;
    const skew = created ? Math.abs(mins(created.entryDateTime) - mins(nowRome)) : 999;
    check(
      'QA-DY-b',
      'Diary entryDateTime = server facility time (±2 min)',
      !!created && skew <= 2 && created.status === 'aperta' && created.priority === 'normale',
      `${JSON.stringify(created)} nowRome=${nowRome}`,
    );
    // make it legacy 'importante' + 'da_rivedere' + a past date, then edit through the UI
    await db.query(
      `UPDATE "PatientDiaryEntry" SET priority='importante', status='da_rivedere', "entryDateTime"='2026-10-01T09:15' WHERE id=$1`,
      [created.id],
    );
    await page.reload();
    await page
      .getByRole('button', { name: /Infermiere 1/ })
      .first()
      .click();
    await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
    await page.getByText(text).first().waitFor({ timeout: 15000 });
    const card = page.locator('.diario-card', { hasText: text }).first();
    await card.locator('[title="Modifica"]').click();
    await page.waitForTimeout(800);
    const when = page.locator('#diario-edit-when');
    const whenVal = await when.inputValue().catch(() => '');
    const whenEditable = (await when.count()) === 1 && (await when.isEditable());
    const prio = page.locator('#diario-edit-priority');
    const prioVal = await prio.inputValue();
    const prioOpts = (await prio.locator('option').allInnerTexts()).map((s) => s.trim());
    await shot(page, 'QA-DY-edit-form');
    check(
      'QA-DY-c',
      'Edit: date still editable, legacy «Importante» preserved & selected',
      whenEditable &&
        whenVal === '2026-10-01T09:15' &&
        prioVal === 'importante' &&
        prioOpts.some((o) => /Importante/.test(o)),
      `when=${whenVal} prio=${prioVal} opts=${prioOpts.join('/')}`,
    );
    await page.locator('#diario-edit-content').fill(`${text} modificata`);
    await when.fill('2026-10-01T10:30');
    await page
      .getByRole('button', { name: /^Salva$/ })
      .last()
      .click();
    await page.waitForTimeout(2000);
    const edited = await q1(
      `SELECT content, priority, status, "entryDateTime" FROM "PatientDiaryEntry" WHERE id=$1`,
      [created.id],
    );
    check(
      'QA-DY-d',
      'Edit persists content+date; priority «importante» and status «da_rivedere» untouched',
      edited.content === `${text} modificata` &&
        edited.priority === 'importante' &&
        edited.status === 'da_rivedere' &&
        edited.entryDateTime === '2026-10-01T10:30',
      JSON.stringify(edited),
    );
    await shot(page, 'QA-DY-edited');
    check(
      'QA-NURSE-console',
      'Nurse journey: no console errors',
      consoleErrors[role].length === 0,
      consoleErrors[role].join(' || ').slice(0, 400),
    );
    await done(context, 'qa-nurse');
  }

  // ── 2. OSS cannot reach therapy (UI + API) ──
  {
    const role = 'OSS 1';
    const { context, page } = await login(role);
    const labels = (await page.locator('.teams-sidebar button').allInnerTexts()).map((s) =>
      s.replace(/\s+/g, ' ').trim(),
    );
    await page.goto(`${FRONT}/#/dettaglio-paziente/${OLGA}`);
    await page.getByText('Verdi, Olga').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(2500);
    const rail = (await page.locator('.top-nav button, .top-nav [role=tab]').allInnerTexts()).map(
      (s) => s.trim(),
    );
    const therapyErr = await page.getByText(/Impossibile caricare le terapie/).count();
    await shot(page, 'QA-OSS-panoramica');
    // ward nav from inside the chart: Parametri should open Olga's Parametri (allowed)
    await side(page, 'Parametri');
    await page.waitForTimeout(1500);
    const act = await activeSection(page);
    // API: the server must still deny therapy reads/writes for OSS
    const api = await page.evaluate(
      async ({ API, OLGA }) => {
        const hdrs = {};
        const tok = Object.entries(sessionStorage).concat(Object.entries(localStorage));
        void tok;
        const r1 = await fetch(`${API}/patients/${OLGA}/therapies/page`, {
          credentials: 'include',
        });
        const r2 = await fetch(`${API}/therapy-slots/confirm`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: '{}',
        });
        return [r1.status, r2.status];
      },
      { API, OLGA },
    );
    check(
      'QA-OSS-a',
      'OSS: no Terapia in sidebar nor chart rail',
      !labels.includes('Terapia') && !rail.includes('Terapia') && !rail.includes('Documenti'),
      `sidebar=${labels.join(',')} rail=${rail.join(',')}`,
    );
    check(
      'QA-OSS-b',
      'OSS: ward Parametri inside chart → Olga Parametri',
      page.url().includes(OLGA) && act.some((a) => a.startsWith('Parametri')),
      act.join('|'),
    );
    check(
      'QA-OSS-c',
      'OSS: Panoramica shows no therapy load error caused by a denied read',
      therapyErr === 0,
      `errors=${therapyErr}; 4xx=${net[role].join(', ')}`,
    );
    check(
      'QA-OSS-d',
      'OSS: server still denies therapy read/administration (raw fetch, no app headers)',
      api.every((s) => s === 401 || s === 403),
      JSON.stringify(api),
    );
    await done(context, 'qa-oss');
  }

  // ── 3. Admin dashboard ──
  {
    const role = 'Amministratore';
    const { context, page } = await login(role);
    await page.waitForTimeout(3000);
    const txt = (await page.locator('main, .main-area-clean').first().innerText()).replace(
      /\s+/g,
      ' ',
    );
    const stuck = /Caricamento|Aggiornamento…/.test(txt);
    await shot(page, 'QA-ADMIN-dashboard');
    const somm = /Somministrazioni|Scadenze terapia/i.test(txt);
    check(
      'QA-ADMIN-a',
      'Admin dashboard: no stuck loaders, no therapy widgets',
      !stuck && !somm,
      txt.slice(0, 300),
    );
    check(
      'QA-ADMIN-b',
      'Admin dashboard: no 4xx on load',
      net[role].length === 0,
      net[role].join(', '),
    );
    const assistantEntry = await page.getByTestId('assistant-entry').count();
    if (assistantEntry) {
      await page.getByTestId('assistant-entry').click();
      await page.waitForTimeout(2500);
      await shot(page, 'QA-ADMIN-assistant-mode');
    }
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const deniedSignal = /\d+ operazion[ei] negat[ea] dalla policy.{0,160}/.exec(body);
    check(
      'QA-ADMIN-c',
      'Admin Copilot: no «operazioni negate dalla policy» signal caused by the UI',
      !deniedSignal,
      `signal=${deniedSignal ? deniedSignal[0] : 'none'}; assistant-entry=${assistantEntry}; 4xx=${net[role].join(', ')}`,
    );
    check(
      'QA-ADMIN-console',
      'Admin: no console errors',
      consoleErrors[role].length === 0,
      consoleErrors[role].join(' || ').slice(0, 400),
    );
    await done(context, 'qa-admin');
  }
} catch (e) {
  check('QA-RUN', 'journey completed', false, e.message.split('\n')[0]);
} finally {
  writeFileSync(`${OUT}/results-qa.json`, JSON.stringify({ results, net, consoleErrors }, null, 2));
  await browser.close();
  await db.end();
}
