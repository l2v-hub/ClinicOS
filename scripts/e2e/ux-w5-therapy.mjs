// UX cycle 2 — W5: patient Terapia restructured into Calendario (default) / Storico / Nuova terapia.
// Asserts the real UI: active view chip, dose actions visible on landing (no extra taps), DB
// persistence, view kept after reload/Back, legacy deep links, prescriber actions by role, no
// horizontal scroll / no cut-off button at 1180x820 and 820x1180, no console errors / 403 / 5xx.
// Tap counts of the core journeys are recorded in results.json.
// LOCAL synthetic stack only (never prod). Prereq: backend (AUTH_MODE=demo, simulator on), vite
// preview, DB seeded with scripts/assistant/seed-assistant-demo.mts + scripts/e2e/seed-phase10-demo.mts.
// Usage: DATABASE_URL=<local DB> FRONT=… API=… node scripts/e2e/ux-w5-therapy.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5221';
const API = process.env.API ?? 'http://127.0.0.1:3121';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux2-cycle/w5';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
if (!NANNI) throw new Error('seed Nanni Miriam first');
const therapyId = async (patientId, name) =>
  (
    await db.query(
      `SELECT id FROM "PatientTherapy" WHERE "patientId"=$1 AND "farmacoNome"=$2 ORDER BY "createdAt" LIMIT 1`,
      [patientId, name],
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
const taps = {};
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
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(800);
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
/** Tap 1 of every journey: the Terapia chip of the chart. */
async function openTherapy(page) {
  await page
    .locator('.chart-sections .top-nav__item, .top-nav__item')
    .filter({ hasText: /^Terapia/ })
    .first()
    .click();
  await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
}
const viewChips = (page) => page.locator('[id^="therapy-section"]');
async function activeView(page) {
  return (
    await page
      .locator('[id^="therapy-section"][aria-selected="true"]')
      .first()
      .innerText({ timeout: 5000 })
      .catch(() => '')
  ).trim();
}
async function showView(page, label) {
  await viewChips(page)
    .filter({ hasText: new RegExp(`^${label}`) })
    .first()
    .click();
  await page.waitForTimeout(900);
}
const drugLine = (page, name) =>
  page.getByTestId('therapy-drug-line').filter({ hasText: name }).first();
const hash = (page) => page.evaluate(() => decodeURIComponent(location.hash));
async function inViewport(locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return false;
  const vp = locator.page().viewportSize();
  return (
    box.y >= 0 && box.y + box.height <= vp.height && box.x >= 0 && box.x + box.width <= vp.width
  );
}
/** QA F8: no horizontal page scroll and no visible button of the therapy panel cut off. */
async function layoutOk(page) {
  return page.evaluate(() => {
    const noScroll = document.documentElement.scrollWidth <= window.innerWidth + 1;
    const root = document.querySelector('#patient-tab-panel') ?? document.body;
    const cut = [];
    for (const b of root.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(b);
      if (style.visibility === 'hidden') continue;
      // the button itself inside the viewport, and its text not clipped
      let clipped = r.left < -1 || r.right > window.innerWidth + 1;
      if (b.scrollWidth > b.clientWidth + 2 && style.overflow !== 'visible') clipped = true;
      // clipped by an overflow ancestor (e.g. a scroll region narrower than the button)
      for (let el = b.parentElement; el && el !== document.body; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.overflowX === 'visible' && cs.overflow === 'visible') continue;
        const pr = el.getBoundingClientRect();
        if (r.right > pr.right + 1 || r.left < pr.left - 1) clipped = true;
        break;
      }
      if (clipped)
        cut.push((b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 50));
    }
    return { noScroll, cut };
  });
}
async function administrations(name) {
  return (
    await db.query(
      `SELECT stato, motivo, note, "operatoreId", ora FROM "MedicationAdministration"
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
  // ── 1. Nurse 1180x820: Calendario is the default; the due dose's actions are already open ──
  {
    const { context, page } = await login('Infermiere 1');
    await openNanni(page);
    let count = 0;
    await openTherapy(page); // tap 1
    count += 1;
    const view = await activeView(page);
    const labels = (await viewChips(page).allInnerTexts()).map((t) => t.trim());
    check(
      'W5-01',
      'Terapia opens on «Calendario»; views are only Calendario / Storico (nurse: no Nuova terapia)',
      view === 'Calendario' && labels.join('|') === 'Calendario|Storico',
      `active=${view} views=${labels.join('|')}`,
    );
    const old = await page
      .getByText(/^(Farmaci attivi|Programmazione|Somministrazioni giornaliere|Sospese\/concluse)$/)
      .locator('xpath=ancestor-or-self::*[@role="tab"]')
      .count();
    check('W5-01b', 'Old sub-tabs are gone', old === 0, `${old}`);
    const lines = await page.getByTestId('therapy-drug-line').allInnerTexts();
    const flat = lines.map((t) => t.replace(/\s+/g, ' '));
    check(
      'W5-02',
      'Compact active-drug list: one line per drug with strength, schedule, route, prescriber; PRN marked',
      flat.length === 4 &&
        flat.some(
          (t) =>
            /Metformina/.test(t) &&
            /08:00/.test(t) &&
            /20:00/.test(t) &&
            /orale/.test(t) &&
            /Prescr\./.test(t),
        ) &&
        flat.some((t) => /Paracetamolo/.test(t) && /Al bisogno/.test(t)),
      flat.join(' || ').slice(0, 300),
    );
    // The first dose to give today is open with its actions, without a tap.
    const detail = page.getByTestId('patient-therapy-slot-detail');
    await detail.waitFor({ timeout: 10000 });
    const administer = detail.getByRole('button', { name: /^Erogata: .*Ramipril/ });
    await administer.waitFor({ timeout: 10000 });
    const visible = await inViewport(administer);
    check(
      'W5-03',
      'Landing: the hour of the first due dose is open, «Somministra» visible without extra taps',
      visible,
      `inViewport=${visible}`,
    );
    await shot(page, 'W5-03-nurse-landing-1180');
    const l1180 = await layoutOk(page);
    await administer.click(); // tap 2
    count += 1;
    await detail.getByText('Somministrazione di Ramipril registrata.').waitFor({ timeout: 10000 });
    const ramipril = await administrations('Ramipril');
    check(
      'W5-04',
      'Nurse: open therapy → Somministra (2 taps) → persisted erogata by Infermiere 1',
      count === 2 &&
        ramipril.length === 1 &&
        ramipril[0].stato === 'erogata' &&
        ramipril[0].operatoreId === 'SIM-NURSE-1',
      `taps=${count} ${JSON.stringify(ramipril)}`,
    );
    taps.nurseAdministerDueDose = { before: 3, after: count };
    // The hour stays open after recording (no jump), the status reads in words.
    const stillOpen = await detail.getByText('Somministrazione di Ramipril registrata.').count();
    const event = page.getByTestId('ptc-event').filter({ hasText: 'Ramipril' }).first();
    await page.waitForTimeout(1200);
    const eventText = (await event.innerText()).replace(/\s+/g, ' ');
    check(
      'W5-04b',
      'After recording the hour stays open and the calendar dose says «Somministrata … da Infermiere 1»',
      stillOpen === 1 && /Somministrata .*Infermiere 1/.test(eventText),
      eventText,
    );
    await shot(page, 'W5-04-administered');

    // ── 2. Not given with reason, then «Somministra ora» from the same calendar hour ──
    await detail
      .getByRole('button', { name: /^Non erogata: .*Metformina/ })
      .first()
      .click();
    await detail
      .getByRole('button', { name: /^Altro:/ })
      .first()
      .click();
    await detail
      .getByRole('textbox', { name: /Motivo della mancata erogazione/ })
      .fill('Paziente nauseata (sintetico W5)');
    await detail
      .getByRole('button', { name: /^Conferma non erogata:/ })
      .first()
      .click();
    await detail
      .getByText('Mancata somministrazione di Metformina registrata.')
      .waitFor({ timeout: 10000 });
    const notGiven = await administrations('Metformina');
    const again = detail.getByRole('button', { name: /^Somministra ora: Metformina/ });
    await again.waitFor({ timeout: 8000 });
    check(
      'W5-05',
      'Non somm. «Altro» + note persisted; the same hour offers «Somministra ora»',
      notGiven.some(
        (r) => r.stato === 'non_erogata' && r.motivo === 'altro' && /W5/.test(r.note ?? ''),
      ),
      JSON.stringify(notGiven),
    );
    await shot(page, 'W5-05-not-given-somministra-ora');
    await again.click();
    await detail
      .getByText('Somministrazione di Metformina registrata.')
      .waitFor({ timeout: 10000 });
    const regiven = (await administrations('Metformina')).find((r) => r.ora === '08:00');
    check(
      'W5-05b',
      '«Somministra ora» in the calendar records the not-given dose of today (erogata)',
      regiven?.stato === 'erogata',
      JSON.stringify(regiven),
    );

    // ── 3. Tap a drug → its prescription detail (nurse: no prescriber actions) ──
    await drugLine(page, 'Metformina').click();
    const presc = page.getByTestId('therapy-prescription-detail');
    await presc.waitFor({ timeout: 5000 });
    const prescText = (await presc.innerText()).replace(/\s+/g, ' ');
    const prescriberButtons = await page
      .getByRole('button', { name: /^(Modifica|Sospendi|Elimina|Riattiva) / })
      .count();
    check(
      'W5-06',
      'Drug tap → prescription detail (schedule, start, note); nurse sees no Modifica/Sospendi/Elimina',
      /Inizio/.test(prescText) &&
        /Dopo il pasto/.test(prescText) &&
        /20:00/.test(prescText) &&
        prescriberButtons === 0,
      `buttons=${prescriberButtons} ${prescText.slice(0, 160)}`,
    );
    await shot(page, 'W5-06-drug-detail-nurse');
    await drugLine(page, 'Metformina').click();

    // ── 4. PRN from the calendar ──
    const prnOpen = page.getByRole('button', { name: /Somministra al bisogno · dosi di oggi/ });
    await prnOpen.click();
    const prnPanel = page.getByTestId('drug-dose-panel');
    await prnPanel.getByLabel('Indicazione (obbligatoria)').fill('Dolore 6/10 (sintetico W5)');
    await prnPanel.getByRole('button', { name: 'Somministra al bisogno' }).click();
    await prnPanel
      .getByText(/Somministrazione al bisogno di Paracetamolo registrata/)
      .waitFor({ timeout: 10000 });
    const prnRows = (
      await db.query(
        `SELECT indicazione, "operatoreId" FROM "PrnAdministration" WHERE "patientId"=$1`,
        [NANNI],
      )
    ).rows;
    check(
      'W5-07',
      'PRN from the calendar persisted (dose from the prescription, nurse)',
      prnRows.length === 1 && prnRows[0].operatoreId === 'SIM-NURSE-1',
      JSON.stringify(prnRows),
    );

    // ── 5. Storico: how it went, with filters; view kept in the URL ──
    await showView(page, 'Storico');
    const h1 = await hash(page);
    await page.getByTestId('therapy-history-row').first().waitFor({ timeout: 10000 });
    const rows = (await page.getByTestId('therapy-history-row').allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' '),
    );
    check(
      'W5-08',
      'Storico lists given / PRN doses of today with operator (URL sv=storico)',
      /sv=storico/.test(h1) &&
        rows.some((t) => /Ramipril/.test(t) && /Somministrata da Infermiere 1/.test(t)) &&
        rows.some(
          (t) => /Paracetamolo/.test(t) && /Al bisogno/.test(t) && /Indicazione: Dolore/.test(t),
        ),
      `${h1} | ${rows.join(' || ').slice(0, 300)}`,
    );
    await shot(page, 'W5-08-storico');
    await page.locator('.tf-history__drug select').selectOption('Ramipril');
    await page.waitForTimeout(400);
    const onlyRamipril = (await page.getByTestId('therapy-history-row').allInnerTexts()).every(
      (t) => /Ramipril/.test(t),
    );
    await page.getByRole('button', { name: 'Al bisogno', exact: true }).click();
    await page.waitForTimeout(300);
    const prnEmptyForRamipril = await page.getByTestId('therapy-history-row').count();
    await page.locator('.tf-history__drug select').selectOption('');
    await page.waitForTimeout(300);
    const prnOnly = (await page.getByTestId('therapy-history-row').allInnerTexts()).every((t) =>
      /Al bisogno/.test(t),
    );
    check(
      'W5-09',
      'Storico filters: drug and status (Al bisogno) narrow the rows',
      onlyRamipril && prnEmptyForRamipril === 0 && prnOnly,
      `ramipril=${onlyRamipril} prnRamipril=${prnEmptyForRamipril} prnOnly=${prnOnly}`,
    );
    await page.getByRole('button', { name: 'Prescrizioni sospese/concluse' }).click();
    await page.waitForTimeout(500);
    const h2 = await hash(page);
    check(
      'W5-10',
      '«Sospese/concluse» is a Storico filter (URL sv=sospese)',
      /sv=sospese/.test(h2),
      h2,
    );
    // Reload keeps the view and the filter.
    // The simulator session is memory-only: reload, sign in again — the app reopens the hash target.
    await page.reload();
    await page
      .getByRole('button', { name: /Infermiere 1/ })
      .first()
      .click();
    await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
    await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const afterReload = await activeView(page);
    const pressed = await page
      .getByRole('button', { name: 'Prescrizioni sospese/concluse' })
      .getAttribute('aria-pressed')
      .catch(() => null);
    check(
      'W5-11',
      'Reload keeps Storico › Sospese/concluse (QA F2)',
      afterReload === 'Storico' && pressed === 'true',
      `active=${afterReload} pressed=${pressed}`,
    );
    // Another page, then Back: the view is kept.
    await page.getByRole('button', { name: 'Tutte', exact: true }).click();
    await page.waitForTimeout(400);
    await page.locator('.teams-sidebar').getByRole('button', { name: /Turno/ }).first().click();
    await page.waitForTimeout(1500);
    await page.goBack();
    await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const afterBack = await activeView(page);
    check(
      'W5-12',
      'Back from another page reopens Storico (QA F2)',
      afterBack === 'Storico',
      `active=${afterBack} ${await hash(page)}`,
    );
    await done(context, 'nurse-1180');
    check(
      'W5-13a',
      '1180x820: no horizontal scroll, no cut-off button (landing with actions open)',
      l1180.noScroll && l1180.cut.length === 0,
      JSON.stringify(l1180),
    );
  }

  // ── 6. Supervisor: confirmation dialog from the calendar ──
  {
    const { context, page } = await login('Supervisore 1');
    await openNanni(page);
    await openTherapy(page);
    const detail = page.getByTestId('patient-therapy-slot-detail');
    const button = detail.getByRole('button', { name: /^Erogata: .*Pantoprazolo/ });
    await button.waitFor({ timeout: 10000 });
    await button.click();
    const dialog = page.getByRole('alertdialog');
    await dialog.waitFor({ timeout: 5000 });
    const before = (await administrations('Pantoprazolo')).length;
    await shot(page, 'W5-14-supervisor-confirm');
    await dialog.getByRole('button', { name: /Conferma somministrazione/ }).click();
    await detail
      .getByText('Somministrazione di Pantoprazolo registrata.')
      .waitFor({ timeout: 10000 });
    const pan = await administrations('Pantoprazolo');
    check(
      'W5-14',
      'Supervisor: landing opens 12:00 (next due), Somministra asks confirmation, then persisted',
      before === 0 && pan.length === 1 && pan[0].operatoreId === 'SIM-SUPERVISOR-1',
      JSON.stringify(pan),
    );
    const supButtons = await page
      .getByRole('button', { name: /^(Modifica|Sospendi|Elimina) / })
      .count();
    check('W5-14b', 'Supervisor sees no prescriber actions', supButtons === 0, `${supButtons}`);
    await done(context, 'supervisor');
  }

  // ── 7. Legacy deep links land on the new views ──
  {
    const { context, page } = await login('Infermiere 1');
    const metformina = await therapyId(NANNI, 'Metformina');
    const ramiprilId = await therapyId(NANNI, 'Ramipril');
    await page.goto(
      `${FRONT}/#/dettaglio-paziente/${NANNI}/terapia-farmacologica?sv=giornaliere&t=${metformina}&d=${today}&f=sera`,
    );
    await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 20000 });
    const detail = page.getByTestId('patient-therapy-slot-detail');
    await detail.waitFor({ timeout: 10000 });
    await page.waitForTimeout(1200);
    const head = (await detail.locator('h4').first().innerText()).trim();
    const focus = await page.locator(`[data-therapy-id="${metformina}"].is-focus`).count();
    const actions = await detail.getByRole('button', { name: /^Erogata: .*Metformina/ }).count();
    check(
      'W5-15',
      'Legacy sv=giornaliere&f=sera → Calendario, 20:00 open with Metformina actions, dose focused',
      (await activeView(page)) === 'Calendario' &&
        /Ore 20:00/.test(head) &&
        focus >= 1 &&
        actions === 1,
      `head=${head} focus=${focus} actions=${actions}`,
    );
    await shot(page, 'W5-15-legacy-giornaliere');
    await page.goto(
      `${FRONT}/#/dettaglio-paziente/${NANNI}/terapia-farmacologica?sv=attivi&t=${ramiprilId}`,
    );
    await page.getByTestId('therapy-prescription-detail').waitFor({ timeout: 20000 });
    const openLine = await page
      .locator(`.tf-drugs__item.is-open[data-therapy-id="${ramiprilId}"]`)
      .count();
    check(
      'W5-16',
      'Legacy sv=attivi&t=… → Calendario with that drug’s prescription opened',
      (await activeView(page)) === 'Calendario' && openLine === 1,
      `open=${openLine}`,
    );
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}/terapia-farmacologica?sv=sospese`);
    await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    const sosp = await page
      .getByRole('button', { name: 'Prescrizioni sospese/concluse' })
      .getAttribute('aria-pressed')
      .catch(() => null);
    check(
      'W5-17',
      'Legacy sv=sospese → Storico on the suspended/concluded filter',
      (await activeView(page)) === 'Storico' && sosp === 'true',
      `pressed=${sosp}`,
    );
    await done(context, 'legacy-links');
  }

  // ── 8. Doctor: prescriber actions from the drug detail; Nuova terapia ──
  {
    const NERI = (
      await db.query(`SELECT id FROM "Patient" WHERE "firstName"='Dario' AND "lastName"='Neri'`)
    ).rows[0]?.id;
    const token = await apiSession('SIM-DOCTOR-1');
    if (!(await therapyId(NERI, 'Ramipril'))) {
      const created = await fetch(`${API}/patients/${NERI}/therapies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmacoNome: 'Ramipril',
          dataInizio: today,
          commercialStrengthValue: 5,
          commercialStrengthUnit: 'mg',
          pharmaceuticalForm: 'compressa',
          viaSomministrazione: 'orale',
          tipo: 'periodica',
          schedules: [
            {
              time: '08:00',
              quantityNumerator: 1,
              quantityDenominator: 1,
              administrationUnit: 'compressa',
            },
          ],
        }),
      });
      if (created.status !== 201) throw new Error(`doctor therapy seed ${created.status}`);
    }
    const neriRamipril = await therapyId(NERI, 'Ramipril');
    await db.query(`UPDATE "PatientTherapy" SET stato='attiva' WHERE id=$1`, [neriRamipril]);
    const { context, page } = await login('Medico 1');
    await openPatient(page, 'Neri', 'Neri, Dario', NERI);
    let count = 0;
    await openTherapy(page);
    count += 1;
    const labels = (await viewChips(page).allInnerTexts()).map((t) => t.trim());
    const administerButtons = await page
      .getByRole('button', { name: /^Erogata:|^Somministra al bisogno$/ })
      .count();
    await drugLine(page, 'Ramipril').click();
    count += 1;
    const presc = page.getByTestId('therapy-prescription-detail');
    await presc.waitFor({ timeout: 5000 });
    const actions = await presc.getByRole('button').allInnerTexts();
    check(
      'W5-18',
      'Doctor: views include Nuova terapia; drug detail has Modifica / Sospendi / Elimina; no Somministra',
      labels.includes('Nuova terapia') &&
        ['Modifica', 'Sospendi', 'Elimina'].every((a) => actions.some((t) => t.trim() === a)) &&
        administerButtons === 0,
      `views=${labels.join('|')} actions=${actions.join('|')} administer=${administerButtons}`,
    );
    await shot(page, 'W5-18-doctor-detail');
    await presc.getByRole('button', { name: /^Sospendi Ramipril/ }).click();
    count += 1;
    const dialog = page.getByRole('alertdialog');
    await dialog.waitFor({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Sospendi terapia' }).click();
    count += 1;
    await page.waitForTimeout(1500);
    const suspended = (
      await db.query(`SELECT stato FROM "PatientTherapy" WHERE id=$1`, [neriRamipril])
    ).rows[0]?.stato;
    taps.doctorSuspendDrug = { before: 3, after: count };
    check(
      'W5-19',
      'Sospendi from the detail (confirmation) → DB sospesa',
      suspended === 'sospesa',
      `${suspended} taps=${count}`,
    );
    await showView(page, 'Storico');
    await page.getByRole('button', { name: 'Prescrizioni sospese/concluse' }).click();
    await drugLine(page, 'Ramipril').click();
    await page.getByRole('button', { name: /^Riattiva Ramipril/ }).click();
    await page.waitForTimeout(1800);
    const reactivated = (
      await db.query(`SELECT stato FROM "PatientTherapy" WHERE id=$1`, [neriRamipril])
    ).rows[0]?.stato;
    const backOnCalendar = await activeView(page);
    check(
      'W5-20',
      'Storico › Sospese/concluse → Riattiva → DB attiva, back on the Calendario',
      reactivated === 'attiva' && backOnCalendar === 'Calendario',
      `${reactivated} view=${backOnCalendar}`,
    );
    await showView(page, 'Nuova terapia');
    const h = await hash(page);
    await page.getByRole('button', { name: 'Salva terapia' }).click();
    await page.waitForTimeout(500);
    const err = await page
      .getByTestId('therapy-save-error')
      .innerText()
      .catch(() => '');
    const invalid = await page.locator('[aria-invalid="true"]').count();
    check(
      'W5-21',
      'Nuova terapia: registration form with field-level validation (URL sv=nuova)',
      /sv=nuova/.test(h) && err.length > 0 && invalid > 0,
      `${h} invalid=${invalid} err=${err.slice(0, 80)}`,
    );
    await shot(page, 'W5-21-nuova-terapia');
    await done(context, 'doctor');
  }

  // ── 9. Portrait 820x1180: layout of every view ──
  {
    const { context, page } = await login('Infermiere 1', { width: 820, height: 1180 });
    await openNanni(page);
    await openTherapy(page);
    await page.waitForTimeout(1500);
    const cal = await layoutOk(page);
    await shot(page, 'W5-22-calendar-820');
    await drugLine(page, 'Metformina').click();
    await page.waitForTimeout(500);
    const det = await layoutOk(page);
    await shot(page, 'W5-22-drug-detail-820');
    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await page.waitForTimeout(1500);
    const week = await layoutOk(page);
    await shot(page, 'W5-22-week-820');
    await showView(page, 'Storico');
    await page.waitForTimeout(1200);
    const hist = await layoutOk(page);
    await shot(page, 'W5-22-storico-820');
    const all = [cal, det, week, hist];
    check(
      'W5-22',
      '820x1180: Calendario, drug detail, week, Storico — no horizontal scroll, no cut-off button (QA F8)',
      all.every((r) => r.noScroll && r.cut.length === 0),
      JSON.stringify(all),
    );
    await done(context, 'nurse-820');
  }
} catch (error) {
  check('W5-ERR', 'script error', false, String(error?.stack ?? error).slice(0, 700));
} finally {
  await browser.close();
  await db.end();
}

check(
  'W5-23',
  'No console errors',
  consoleErrors.length === 0,
  consoleErrors.join(' || ').slice(0, 600),
);
check(
  'W5-24',
  'No 403/4xx/5xx from the UI',
  httpErrors.length === 0,
  httpErrors.join(' || ').slice(0, 600),
);
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify(
    { date: new Date().toISOString(), today, taps, results, consoleErrors, httpErrors },
    null,
    2,
  ),
);
const failed = results.filter((r) => r.result === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
console.log('taps', JSON.stringify(taps));
process.exit(failed ? 1 : 0);
