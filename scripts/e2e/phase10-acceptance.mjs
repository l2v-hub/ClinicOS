// Phase 10 acceptance (AT-01..AT-15) against the LOCAL synthetic stack only.
// Prereq: backend :3099 (AUTH_MODE=demo, simulator on), vite :5199, DB seeded with
// scripts/assistant/seed-assistant-demo.mts + scripts/e2e/seed-phase10-demo.mts.
// Usage: DATABASE_URL=<local DB> node scripts/e2e/phase10-acceptance.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5199';
const OUT = process.argv[2] ?? 'artifacts/phase10-acceptance';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
if (!NANNI) throw new Error('seed Nanni Miriam first');

const results = [];
const httpErrors = [];
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
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${role}: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500 || (r.status() >= 400 && !/\/auth\/|favicon/.test(r.url())))
      httpErrors.push(`${role} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
  await page.waitForTimeout(1200);
  return { context, page };
}
const consoleErrors = [];
/** The chart rail item currently selected (asserts the section, not just the URL). */
const activeSection = (page) =>
  page
    .locator('.top-nav__item.is-active')
    .first()
    .innerText()
    .then((t) => t.trim())
    .catch(() => '');
/** A chart part is really in view (top inside the viewport), polling while lazy content mounts. */
async function partInView(page, part, timeout = 5000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const box = await page
      .locator(`[data-chart-part="${part}"]`)
      .first()
      .boundingBox()
      .catch(() => null);
    const vh = page.viewportSize()?.height ?? 0;
    if (box && box.y >= 0 && box.y < vh) return true;
    await page.waitForTimeout(250);
  }
  return false;
}
/** Facility local time «YYYY-MM-DDTHH:mm» (Europe/Rome), as the server stores entryDateTime. */
const romeNow = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date())
    .replace(' ', 'T');
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });
const side = (page, name) =>
  page.locator('.teams-sidebar').getByRole('button', { name }).first().click();
const sidebarLabels = async (page) =>
  (await page.locator('.teams-sidebar button').allInnerTexts())
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
async function openNanniFromTurno(page) {
  await side(page, 'Turno');
  await page.getByText('Nanni, Miriam').first().click();
  await page.waitForURL(new RegExp(NANNI), { timeout: 10000 });
  await page.waitForTimeout(1200);
}
async function done(context, name) {
  await context.tracing.stop({ path: `${OUT}/trace-${name}.zip` });
  await context.close();
}

try {
  // ── Nurse: deep links, calendar, administration, parameters, diary ──
  {
    const { context, page } = await login('Infermiere 1');
    await openNanniFromTurno(page);
    await side(page, 'Terapia');
    await page.getByText('Terapia Farmacologica').first().waitFor({ timeout: 10000 });
    const therapySection = await activeSection(page);
    check(
      'AT-03',
      'Sidebar Terapia from Nanni chart → Nanni Terapia (active section)',
      page.url().includes(NANNI) && therapySection === 'Terapia',
      therapySection,
    );
    await shot(page, 'AT-03-terapia');

    await page
      .locator('main [role=tab]:has-text("Calendario"), main button:has-text("Calendario")')
      .first()
      .click();
    const slot = page.getByRole('button', { name: /08:00 Ramipril/ });
    await slot.waitFor({ timeout: 10000 });
    const box = await slot.boundingBox();
    await slot.click();
    const detail = page.getByTestId('patient-therapy-slot-detail');
    await detail.waitFor({ timeout: 5000 });
    const detailText = await detail.innerText();
    check(
      'AT-04',
      'Calendar slot clickable → slot therapies of the same patient',
      /Ramipril/.test(detailText) && /Metformina/.test(detailText) && page.url().includes(NANNI),
      `touch target ${Math.round(box?.height ?? 0)}px`,
    );
    check('AT-15a', 'Calendar slot touch target ≥ 44px', (box?.height ?? 0) >= 44);
    await shot(page, 'AT-04-slot');

    const before = Number(
      (
        await db.query(`SELECT count(*) FROM "MedicationAdministration" WHERE "patientId"=$1`, [
          NANNI,
        ])
      ).rows[0].count,
    );
    await detail
      .getByRole('button', { name: /^Erogata: .*Ramipril/ })
      .first()
      .click();
    await page.waitForTimeout(2500);
    const after = Number(
      (
        await db.query(`SELECT count(*) FROM "MedicationAdministration" WHERE "patientId"=$1`, [
          NANNI,
        ])
      ).rows[0].count,
    );
    await shot(page, 'AT-05-administered');
    check(
      'AT-05',
      'Nurse administers from the patient therapy calendar (persisted)',
      after === before + 1,
      `${before}→${after}`,
    );

    // Parameters deep link
    await side(page, 'Parametri');
    await page.waitForTimeout(1500);
    const paramSection = await activeSection(page);
    check(
      'AT-02',
      'Sidebar Parametri from Nanni chart → Nanni Parametri (active section)',
      page.url().includes(NANNI) && paramSection === 'Parametri',
      paramSection,
    );
    await shot(page, 'AT-02-parametri');

    // Consegne deep link
    await side(page, 'Consegne');
    const consegneInView = await partInView(page, 'consegne');
    check(
      'AT-01',
      'Sidebar Consegne from Nanni chart → Nanni Consegne part in view',
      page.url().includes(NANNI) && consegneInView,
      await activeSection(page),
    );
    await shot(page, 'AT-01-consegne');

    // AT-14: Turno «Apri» on a Nanni therapy item lands on Nanni Terapia
    await side(page, 'Turno');
    await page.waitForTimeout(1500);
    await page
      .getByRole('button', { name: /^Apri Nanni/ })
      .first()
      .click();
    await page.waitForTimeout(2000);
    const onTherapy = (await activeSection(page)) === 'Terapia';
    check(
      'AT-14',
      'Turno «Apri» on a Nanni therapy keeps patient + Terapia section',
      page.url().includes(NANNI) && onTherapy,
    );
    await shot(page, 'AT-14-turno-apri');

    // Diary: no manual date, NORMAL/URGENT only, server timestamp, persistence
    await side(page, 'Pazienti');
    await page.getByText('Nanni').first().click();
    await page.waitForURL(new RegExp(NANNI));
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /^Aggiungi voce$/ }).click();
    const formShown = await page.locator('.cr-inline-form').count();
    const dateInputs = await page
      .locator('.cr-inline-form input[type="datetime-local"], .cr-inline-form input[type="date"]')
      .count();
    const prioritySelect = page.getByLabel('Priorità');
    const options = (await prioritySelect.locator('option').allInnerTexts()).map((s) => s.trim());
    check(
      'AT-06a',
      'Diary create form asks no manual date',
      formShown === 1 && dateInputs === 0,
      `form ${formShown}, date inputs ${dateInputs}`,
    );
    check(
      'AT-07',
      'Diary priority only Normale/Urgente',
      options.length === 2 && options.every((o) => /Normale|Urgente/.test(o)),
      options.join('/'),
    );
    const text = `P10 nota automatica ${Date.now()}`;
    await page.getByLabel(/Contenuto/).fill(text);
    await page.getByRole('button', { name: /^Salva$/ }).click();
    await page.waitForTimeout(2000);
    const row = (
      await db.query(
        `SELECT "entryDateTime", abs(extract(epoch from (now() at time zone 'UTC') - "createdAt")) AS skew FROM "PatientDiaryEntry" WHERE "patientId"=$1 AND content=$2`,
        [NANNI, text],
      )
    ).rows[0];
    const now = romeNow();
    const entry = row ? String(row.entryDateTime).slice(0, 16) : '';
    const skewMs = Math.abs(Date.parse(`${entry}:00Z`) - Date.parse(`${now}:00Z`));
    check(
      'AT-06',
      'Diary note saved with automatic timestamp (entryDateTime = facility now)',
      !!row && skewMs <= 120000,
      row
        ? `entryDateTime ${row.entryDateTime?.toISOString?.() ?? row.entryDateTime}`
        : 'not saved',
    );
    // The simulator session is memory-only (Phase 9): reload, sign in again, reopen the chart.
    await page.reload();
    await page
      .getByRole('button', { name: /Infermiere 1/ })
      .first()
      .click();
    await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
    await page.waitForTimeout(2500);
    check(
      'AT-06b',
      'Diary note persists after reload',
      await page
        .getByText(text)
        .first()
        .isVisible()
        .catch(() => false),
    );
    await shot(page, 'AT-06-diary');

    // Nurse cannot prescribe: no «Aggiungi farmaco» affordance.
    await side(page, 'Terapia');
    await page.waitForTimeout(1500);
    const addForNurse = await page
      .getByRole('button', { name: '+ Aggiungi farmaco', exact: true })
      .count();
    check(
      'AT-13',
      'Nurse sees no «Aggiungi farmaco» (no prescription capability)',
      addForNurse === 0,
    );
    await done(context, 'nurse');
  }

  // ── AT-01 cold: fresh session, first tap on «Consegne» right after opening the chart ──
  for (const via of ['turno', 'pazienti']) {
    const { context, page } = await login('Infermiere 1', { width: 1180, height: 820 });
    if (via === 'turno') await openNanniFromTurno(page);
    else {
      await side(page, 'Pazienti');
      await page.getByText('Nanni, Miriam').first().click();
      await page.waitForURL(new RegExp(NANNI), { timeout: 10000 });
    }
    await side(page, 'Consegne');
    const inView = await partInView(page, 'consegne', 6000);
    await page.waitForTimeout(1500);
    const stillInView = await partInView(page, 'consegne', 500);
    check(
      'AT-01',
      `Cold first «Consegne» tap (chart opened from ${via}) keeps the Consegne part in view`,
      inView && stillInView,
      await activeSection(page),
    );
    await shot(page, `AT-01-cold-${via}`);
    await done(context, `at01-cold-${via}`);
  }

  // ── Doctor: valid therapy creation ──
  {
    const { context, page } = await login('Medico 1');
    // Resident scope: the doctor's own synthetic resident.
    await side(page, 'Pazienti');
    await page.getByText('Neri, Dario').first().click();
    await page.waitForTimeout(2000);
    await side(page, 'Terapia');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: '+ Aggiungi farmaco', exact: true }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^Salva terapia$/ }).click();
    await page.waitForTimeout(1000);
    const invalid = await page.locator('[aria-invalid="true"]').count();
    const focusedInvalid = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-invalid') === 'true',
    );
    const err = await page
      .getByTestId('therapy-save-error')
      .innerText()
      .catch(() => '');
    check(
      'AT-11',
      'Invalid therapy form → field marked + focus + message',
      invalid > 0 && focusedInvalid && err.length > 0,
      `invalid fields ${invalid}; ${err.slice(0, 160)}`,
    );
    await shot(page, 'AT-11-therapy-invalid');
    const neri = (
      await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P4-Dario-Neri'`)
    ).rows[0].id;
    const count = async () =>
      Number(
        (await db.query(`SELECT count(*) FROM "PatientTherapy" WHERE "patientId"=$1`, [neri]))
          .rows[0].count,
      );
    const before = await count();
    await page.getByLabel('Cerca il farmaco per nome commerciale').fill('Paracetamolo P10');
    await page.locator('.campo-farmaco__usa-comunque').click({ timeout: 10000 });
    const time = page.getByLabel(/^Orario 1/);
    if ((await time.inputValue().catch(() => '')) === '') await time.fill('09:00');
    await page.getByRole('button', { name: /^Salva terapia$/ }).click();
    await page.waitForTimeout(2500);
    const after = await count();
    const err2 = await page
      .getByTestId('therapy-save-error')
      .innerText()
      .catch(() => '');
    check(
      'AT-12',
      'Valid therapy form (doctor) → saved',
      after === before + 1,
      `${before}→${after} ${err2.slice(0, 160)}`,
    );
    await shot(page, 'AT-12-therapy-valid');
    await done(context, 'doctor');
  }

  // ── Role isolation ──
  const expected = {
    'OSS 1': { absent: ['Terapia'], present: ['Parametri', 'Consegne'] },
    'Infermiere 1': { present: ['Terapia', 'Parametri', 'Consegne'] },
    'Medico 1': { present: ['Terapia', 'Parametri', 'Consegne'] },
    'Supervisore 1': { present: ['Terapia', 'Consegne'] },
    Amministratore: { absent: ['Terapia', 'Consegne', 'Assistente'] },
  };
  for (const [role, rule] of Object.entries(expected)) {
    const { context, page } = await login(role);
    const labels = await sidebarLabels(page);
    const ok =
      (rule.absent ?? []).every((l) => !labels.includes(l)) &&
      (rule.present ?? []).every((l) => labels.includes(l));
    check('AT-13', `Sidebar capabilities ${role}`, ok, labels.join(','));
    if (role === 'OSS 1') {
      // Resident scope: the OSS's own synthetic resident (Nanni is outside it → 404).
      const olga = (
        await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P4-Olga-Verdi'`)
      ).rows[0].id;
      await page.goto(`${FRONT}/#/dettaglio-paziente/${olga}`);
      await page.waitForTimeout(2500);
      await page.getByText('Verdi').first().waitFor({ timeout: 10000 });
      const rail = (
        await page.locator('.top-nav button, [role=tablist] button').allInnerTexts()
      ).map((s) => s.trim());
      check(
        'AT-13',
        'OSS chart rail hides Terapia/Documenti',
        !rail.includes('Terapia') && !rail.includes('Documenti'),
        rail.join(','),
      );
      await shot(page, 'AT-13-oss-chart');
    }
    if (role === 'Amministratore') {
      await page.waitForTimeout(2500);
      const stuck = await page
        .getByText(/Caricamento delle scadenze terapia|Aggiornamento…/)
        .count();
      check(
        'AT-13',
        'Admin dashboard has no stuck clinical widgets',
        stuck === 0,
        `stuck ${stuck}`,
      );
      await shot(page, 'AT-13-admin');
    }
    await done(context, `role-${role.replace(/\s/g, '')}`);
  }

  // ── Tablet portrait journey ──
  {
    const { context, page } = await login('Infermiere 1', { width: 820, height: 1180 });
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}`);
    await page.waitForTimeout(2500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(
      'AT-15',
      'Tablet portrait: no horizontal page scroll on chart',
      overflow <= 1,
      `overflow ${overflow}px`,
    );
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main button:not([disabled])')]
        .filter((b) => b.offsetParent)
        .map((b) => ({ t: b.textContent.trim().slice(0, 30), h: b.getBoundingClientRect().height }))
        .filter((b) => b.h > 0 && b.h < 32),
    );
    check(
      'AT-15b',
      'Tablet portrait: chart buttons ≥ 32px tall',
      small.length === 0,
      JSON.stringify(small.slice(0, 8)),
    );
    await shot(page, 'AT-15-tablet');
    await done(context, 'tablet');
  }
  // AT-13 strict: no role makes the UI issue 403/5xx calls, no console errors in the journeys.
  const denied = [...new Set(httpErrors.filter((h) => / (403|5\d\d) /.test(h)))];
  check(
    'AT-13',
    'No 403/5xx requests issued by the UI for any role',
    denied.length === 0,
    denied.join('; '),
  );
  check(
    'AT-15c',
    'No console errors during the journeys',
    consoleErrors.length === 0,
    consoleErrors.slice(0, 5).join('; '),
  );
} finally {
  writeFileSync(
    `${OUT}/results.json`,
    JSON.stringify({ results, httpErrors, consoleErrors }, null, 2),
  );
  await browser.close();
  await db.end();
}
