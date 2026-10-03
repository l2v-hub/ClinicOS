// Independent QA adversarial journeys (UX direct-access cycle). LOCAL synthetic stack only.
// Usage (worktree root): DATABASE_URL=<local> FRONT=... API=... node <this> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5205';
const API = process.env.API ?? 'http://127.0.0.1:3105';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux-direct-access-cycle/qa/adversarial';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('LOCAL DB only');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const NANNI = (
  await q(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
)[0]?.id;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const results = [];
let other = null;
function check(id, name, ok, detail = '') {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 500) });
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`,
  );
}
const tokens = {};
async function token(id) {
  if (!tokens[id]) {
    const r = await fetch(`${API}/auth/simulator/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityId: id }),
    });
    tokens[id] = (await r.json()).token;
  }
  return tokens[id];
}
async function api(who, method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token(who)}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await r.json();
  } catch {}
  return { status: r.status, json, headers: r.headers };
}
const N = 'SIM-NURSE-1',
  S = 'SIM-SUPERVISOR-1',
  D = 'SIM-DOCTOR-1',
  O = 'SIM-OSS-1',
  A = 'SIM-ADMIN';
const tid = async (patientId, name) =>
  (
    await q(
      `SELECT id FROM "PatientTherapy" WHERE "patientId"=$1 AND "farmacoNome"=$2 AND stato='attiva'`,
      [patientId, name],
    )
  )[0]?.id;

// ───────────────────────── API adversarial ─────────────────────────
try {
  const panto = await tid(NANNI, 'Pantoprazolo');
  const para = await tid(NANNI, 'Paracetamolo');
  // Supervisor confirmation on every administration route
  const c1 = await api(S, 'POST', '/therapy-slots/confirm', {
    patientId: NANNI,
    therapyId: panto,
    date: today,
    fascia: 'pranzo',
  });
  const c2 = await api(S, 'POST', '/therapy-slots/confirm', {
    patientId: NANNI,
    therapyId: panto,
    date: today,
    fascia: 'pranzo',
    confirmed: 'true',
  });
  const c3 = await api(S, 'POST', '/therapy-slots/not-administered', {
    patientId: NANNI,
    therapyId: panto,
    date: today,
    fascia: 'pranzo',
    motivo: 'rifiuto',
  });
  const c4 = await api(S, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'Dolore (sintetico)',
    requestId: randomUUID(),
  });
  const c5 = await api(S, 'POST', '/therapy-slots/confirm', {
    patientId: NANNI,
    therapyId: panto,
    date: today,
    fascia: 'pranzo',
    confirmed: false,
  });
  const written = await q(
    `SELECT 1 FROM "MedicationAdministration" WHERE "patientId"=$1 AND date=$2 AND "farmacoNome"='Pantoprazolo'`,
    [NANNI, today],
  );
  check(
    'QA-API-01',
    'Supervisor without confirmed → 428 on confirm / not-administered / prn; confirmed:false → 428; non-boolean → 400; nothing written',
    c1.status === 428 &&
      c1.json?.code === 'confirmation_required' &&
      c3.status === 428 &&
      c4.status === 428 &&
      c5.status === 428 &&
      c2.status === 400 &&
      written.length === 0,
    `confirm=${c1.status} str=${c2.status} notadm=${c3.status} prn=${c4.status} false=${c5.status} rows=${written.length}`,
  );

  // Nurse PRN: client cannot send dose/time; idempotency; conflict
  const bad = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'x',
    requestId: randomUUID(),
    farmacoDose: '5000 mg',
  });
  const bad2 = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'x',
    requestId: randomUUID(),
    administeredAt: '2020-01-01T00:00:00Z',
  });
  const blank = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: '   ',
    requestId: randomUUID(),
  });
  check(
    'QA-API-02',
    'PRN refuses client dose / time fields and blank indication (400)',
    bad.status === 400 && bad2.status === 400 && blank.status === 400,
    `${bad.status} ${bad2.status} ${blank.status}`,
  );
  const rid = randomUUID();
  const ind = '  Dolore 7/10  (sintetico, testo grezzo) ';
  const p1 = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: ind,
    requestId: rid,
  });
  const p2 = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: ind,
    requestId: rid,
  });
  const p3 = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'Altro',
    requestId: rid,
  });
  const p4 = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'Febbre (sintetico)',
    requestId: randomUUID(),
  });
  const rows = await q(
    `SELECT indicazione, "farmacoDose", "operatoreId", date FROM "PrnAdministration" WHERE "patientId"=$1 ORDER BY "administeredAt"`,
    [NANNI],
  );
  check(
    'QA-API-03',
    'PRN: 201, replay same requestId → 200 + Idempotent-Replayed, reuse with other body → 409, second dose 201; 2 rows; raw clinical text kept',
    p1.status === 201 &&
      p2.status === 200 &&
      p2.headers.get('idempotent-replayed') === 'true' &&
      p3.status === 409 &&
      p4.status === 201 &&
      rows.length === 2 &&
      rows[0].indicazione === ind &&
      rows.every((r) => r.operatoreId === N && r.date === today),
    `${p1.status} ${p2.status} ${p3.status} ${p4.status} rows=${JSON.stringify(rows)}`,
  );
  // PRN on a scheduled (non-PRN) therapy
  const p5 = await api(N, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: panto,
    indicazione: 'x',
    requestId: randomUUID(),
  });
  check(
    'QA-API-04',
    'PRN on a scheduled therapy is refused (409)',
    p5.status === 409,
    `${p5.status}`,
  );

  // Role gating
  const d1 = await api(D, 'POST', '/therapy-slots/confirm', {
    patientId: NANNI,
    therapyId: panto,
    date: today,
    fascia: 'pranzo',
    confirmed: true,
  });
  const d2 = await api(D, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'x',
    requestId: randomUUID(),
    confirmed: true,
  });
  const o1 = await api(O, 'GET', `/therapy-slots/prn?patientId=${NANNI}`);
  const o2 = await api(O, 'POST', '/therapy-slots/prn', {
    patientId: NANNI,
    therapyId: para,
    indicazione: 'x',
    requestId: randomUUID(),
  });
  const a1 = await api(A, 'GET', `/therapy-slots/prn?patientId=${NANNI}`);
  check(
    'QA-API-05',
    'Doctor cannot administer (403 confirm/prn); OSS and Admin cannot read/write PRN (403)',
    d1.status === 403 &&
      d2.status === 403 &&
      o1.status === 403 &&
      o2.status === 403 &&
      a1.status === 403,
    `doc=${d1.status}/${d2.status} oss=${o1.status}/${o2.status} admin=${a1.status}`,
  );

  // PRN resident scope (#389: facility-wide for every clinical identity)
  other = (
    await q(
      `SELECT id, "registeredById" FROM "Patient" WHERE "registeredById" IS DISTINCT FROM $1 AND "registeredById" IS NOT NULL LIMIT 1`,
      [N],
    )
  )[0];
  if (other) {
    const pr = await api(D, 'POST', `/patients/${other.id}/therapies`, {
      farmacoNome: 'Paracetamolo QA',
      dataInizio: today,
      commercialStrengthValue: 500,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'al_bisogno',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
    });
    const otherPara = pr.json?.id ?? (await tid(other.id, 'Paracetamolo QA'));
    const slots = await api(N, 'GET', `/therapy-slots?date=${today}`);
    const seesOther = JSON.stringify(slots.json ?? '').includes(other.id);
    const np = await api(N, 'POST', '/therapy-slots/prn', {
      patientId: other.id,
      therapyId: otherPara,
      indicazione: 'Dolore (sintetico)',
      requestId: randomUUID(),
    });
    const ng = await api(N, 'GET', `/therapy-slots/prn?patientId=${other.id}`);
    check(
      'QA-API-06',
      `PRN scope after #389: nurse can record PRN for a resident registered by ${other.registeredById} (facility scope) — same reach as the scheduled slots`,
      np.status === 201 && ng.status === 200,
      `therapyCreate=${pr.status} nurseSeesOtherInSlots=${seesOther} prnPost=${np.status} ${JSON.stringify(np.json).slice(0, 120)} prnGet=${ng.status} items=${ng.json?.items?.length}`,
    );
  } else check('QA-API-06', 'PRN scope', false, 'no patient registered by another operator');

  // Diary ack
  const urgent = (
    await q(
      `SELECT id FROM "PatientDiaryEntry" WHERE "patientId"=$1 AND priority='urgente' LIMIT 1`,
      [NANNI],
    )
  )[0]?.id;
  const normal = (
    await q(
      `SELECT id FROM "PatientDiaryEntry" WHERE "patientId"=$1 AND priority<>'urgente' LIMIT 1`,
      [NANNI],
    )
  )[0]?.id;
  const k1 = await api(N, 'POST', `/patients/${NANNI}/diary/${urgent}/ack`);
  const k2 = await api(N, 'POST', `/patients/${NANNI}/diary/${urgent}/ack`);
  const k3 = normal
    ? await api(N, 'POST', `/patients/${NANNI}/diary/${normal}/ack`)
    : { status: 'n/a' };
  const k4 = await api(A, 'POST', `/patients/${NANNI}/diary/${urgent}/ack`);
  const k5 = await api(N, 'POST', `/patients/${NANNI}/diary/not-an-entry/ack`);
  const sv = await api(S, 'GET', `/patients/${NANNI}/diary`);
  const svEntry = (sv.json?.entries ?? []).find((e) => e.id === urgent);
  const svJson = JSON.stringify(svEntry ?? {});
  check(
    'QA-API-07',
    'Ack: 201 then 200 (idempotent), non-urgent 409, admin 403, unknown 404; supervisor sees nurse ack as name+role, byMe=false, acknowledgedByMe=false, no operator id',
    k1.status === 201 &&
      k2.status === 200 &&
      (k3.status === 409 || k3.status === 'n/a') &&
      k4.status === 403 &&
      k5.status === 404 &&
      svEntry?.acknowledgedByMe === false &&
      svEntry?.acknowledgements?.length === 1 &&
      svEntry.acknowledgements[0].byMe === false &&
      !svJson.includes(N) &&
      !('operatorId' in (svEntry.acknowledgements[0] ?? {})),
    `${k1.status} ${k2.status} ${k3.status} ${k4.status} ${k5.status} sup=${JSON.stringify(svEntry?.acknowledgements)}`,
  );
  // Append-only
  let upd = 'allowed',
    del = 'allowed',
    trunc = 'allowed';
  try {
    await db.query(`UPDATE "DiaryEntryAcknowledgement" SET "operatorName"='x'`);
  } catch (e) {
    upd = e.code;
  }
  try {
    await db.query(`DELETE FROM "DiaryEntryAcknowledgement"`);
  } catch (e) {
    del = e.code;
  }
  try {
    await db.query(`TRUNCATE "DiaryEntryAcknowledgement"`);
  } catch (e) {
    trunc = e.code;
  }
  check(
    'QA-DB-01',
    'DiaryEntryAcknowledgement is append-only (UPDATE/DELETE/TRUNCATE refused)',
    upd !== 'allowed' && del !== 'allowed' && trunc !== 'allowed',
    `${upd} ${del} ${trunc}`,
  );
  let prnUpd = 'allowed';
  await db.query('BEGIN');
  try {
    await db.query(`UPDATE "PrnAdministration" SET "farmacoDose"='tampered' WHERE "patientId"=$1`, [
      NANNI,
    ]);
  } catch (e) {
    prnUpd = e.code;
  }
  await db.query('ROLLBACK');
  check(
    'QA-DB-02',
    'PrnAdministration UPDATE of a recorded dose is refused at DB level (append-only)',
    prnUpd !== 'allowed',
    `update=${prnUpd} (rolled back)`,
  );
} catch (error) {
  check('QA-API-ERR', 'API script error', false, error?.stack ?? error);
}

// ───────────────────────── Browser adversarial ─────────────────────────
const browser = await chromium.launch();
const consoleErrors = [];
const httpErrors = [];
async function login(role, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${role}: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => {
    const s = r.status();
    if (s >= 400 && !/\/auth\/|favicon/.test(r.url()))
      httpErrors.push(`${role} ${s} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(1200);
  return { context, page };
}
async function relogin(page, role) {
  const pick = page.getByRole('button', { name: new RegExp(role) }).first();
  const ready = await Promise.race([
    pick.waitFor({ timeout: 15000 }).then(() => 'picker'),
    page.waitForSelector('.teams-sidebar', { timeout: 15000 }).then(() => 'in'),
  ]).catch(() => 'none');
  if (ready === 'picker') await pick.click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(3500);
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });
const noHScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function chart(page, id) {
  await page.goto(`${FRONT}/#/dettaglio-paziente/${id}`);
  await page.waitForTimeout(1800);
}
async function section(page, label) {
  await page
    .locator('.top-nav__item')
    .filter({ hasText: new RegExp(`^${label}`) })
    .first()
    .click();
  await page.waitForTimeout(1200);
}

try {
  // 1. Turno → late drug → lands on that drug with administer buttons → administer → reload persists
  {
    const { context, page } = await login('Infermiere 1');
    await page.waitForSelector('.turno-pcard', { timeout: 20000 });
    const card = page.locator('.turno-pcard', { hasText: 'Nanni, Miriam' });
    const doses = await card.locator('.turno-pcard__dose').allInnerTexts();
    await shot(page, 'QA-01a-turno');
    const target = doses.find((d) => /Metformina|Ramipril/.test(d)) ?? doses[0];
    const drug = /Metformina/.test(target)
      ? 'Metformina'
      : /Ramipril/.test(target)
        ? 'Ramipril'
        : target?.split(/\s/)[0];
    await card.locator('.turno-pcard__dose', { hasText: drug }).first().click();
    await page.waitForTimeout(2500);
    const hashBefore = await page.evaluate(() => location.hash);
    const btn = page.getByRole('button', { name: new RegExp(`^Erogata: .*${drug}`) }).first();
    const visible = await btn.isVisible().catch(() => false);
    const inViewport =
      visible &&
      (await btn.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      }));
    await shot(page, 'QA-01b-landing');
    check(
      'QA-UI-01',
      `Turno late dose «${drug}» → therapy with «Erogata» for that drug visible in viewport without extra clicks`,
      visible && inViewport,
      `doses=${JSON.stringify(doses)} hash=${hashBefore}`,
    );
    // Back → Turno, Forward → same landing
    await page.goBack();
    await page.waitForTimeout(2000);
    const backHash = await page.evaluate(() => location.hash);
    const turnoBack = (await page.locator('.turno-pcard').count()) > 0;
    await shot(page, 'QA-01b2-back-turno');
    await page.goForward();
    await page.waitForTimeout(2500);
    const fwdHash = await page.evaluate(() => location.hash);
    check(
      'QA-UI-03',
      'Back from the landing returns to Turno; Forward returns to the exact drug landing',
      turnoBack && fwdHash === hashBefore,
      `back=${backHash} fwd=${fwdHash}`,
    );
    if (visible) {
      await btn.click();
      await page.waitForTimeout(1500);
      await page.reload();
      await relogin(page, 'Infermiere 1');
      const hashAfter = await page.evaluate(() => location.hash);
      const rows = await q(
        `SELECT stato, "operatoreId" FROM "MedicationAdministration" WHERE "patientId"=$1 AND date=$2 AND "farmacoNome"=$3`,
        [NANNI, today, drug],
      );
      const body = await page.locator('body').innerText();
      await shot(page, 'QA-01c-after-reload');
      check(
        'QA-UI-02',
        'Administered dose persisted (DB) and reload keeps the same place + shows it administered',
        rows.some((r) => r.stato === 'erogata' && r.operatoreId === N) &&
          hashAfter === hashBefore &&
          /Somministrata|registrata|Infermiere 1/.test(body),
        `rows=${JSON.stringify(rows)} hash ${hashBefore} → ${hashAfter}`,
      );
    }
    await context.close();
  }

  // 2. Calendar shows strength + status without tapping
  {
    const { context, page } = await login('Infermiere 1');
    await chart(page, NANNI);
    await section(page, 'Terapia');
    await page
      .locator('[id^="therapy-section"]')
      .filter({ hasText: /^Calendario/ })
      .first()
      .click();
    await page.waitForTimeout(2000);
    const evs = await page.getByTestId('ptc-event').allInnerTexts();
    const ok =
      evs.length > 0 &&
      evs.every(
        (t) =>
          /\d+\s?mg/.test(t) &&
          /(Da somministrare|In ritardo|Somministrata|Non somministrata|registrat)/i.test(t),
      );
    await shot(page, 'QA-02-calendar-nurse');
    check(
      'QA-UI-04',
      'Calendar: every event shows strength + status in words without a tap',
      ok,
      evs
        .map((t) => t.replace(/\s+/g, ' '))
        .join(' | ')
        .slice(0, 400),
    );
    await context.close();
  }

  // 3. Supervisor: cancel confirmation writes nothing
  {
    const { context, page } = await login('Supervisore 1');
    await chart(page, NANNI);
    await section(page, 'Terapia');
    await page
      .getByTestId('therapy-drug-toggle')
      .filter({ hasText: 'Pantoprazolo' })
      .first()
      .click();
    const panel = page.getByTestId('drug-dose-panel');
    await panel
      .getByRole('button', { name: /^Erogata: .*Pantoprazolo/ })
      .first()
      .click();
    const dialog = page.getByRole('alertdialog');
    await dialog.waitFor({ timeout: 5000 });
    await shot(page, 'QA-03-supervisor-dialog');
    await dialog.getByRole('button', { name: /Annulla/ }).click();
    await page.waitForTimeout(1200);
    const rows = await q(
      `SELECT 1 FROM "MedicationAdministration" WHERE "patientId"=$1 AND date=$2 AND "farmacoNome"='Pantoprazolo'`,
      [NANNI, today],
    );
    check(
      'QA-UI-05',
      'Supervisor: cancel in the confirmation dialog writes nothing',
      rows.length === 0,
      `rows=${rows.length}`,
    );
    await context.close();
  }

  // 4. Doctor cannot administer (facility-wide: nurse's resident)
  {
    const { context, page } = await login('Medico 1');
    await chart(page, NANNI);
    await section(page, 'Terapia');
    await page.getByTestId('therapy-drug-toggle').first().click();
    await page.waitForTimeout(1200);
    const n = await page
      .getByRole('button', { name: /^Erogata:|^Non erogata:|Somministra al bisogno/ })
      .count();
    await shot(page, 'QA-04-doctor-no-administer');
    check('QA-UI-06', 'Doctor: no administration buttons on a facility resident', n === 0, `${n}`);
    await context.close();
  }

  // 4b. Nurse records PRN in the browser on a resident registered by another operator (#389)
  if (other) {
    const { context, page } = await login('Infermiere 1');
    await chart(page, other.id);
    await section(page, 'Terapia');
    await page.getByTestId('therapy-drug-toggle').filter({ hasText: 'Paracetamolo QA' }).first().click();
    const panel = page.getByTestId('drug-dose-panel');
    await panel.waitFor({ timeout: 8000 });
    const before = Number((await q(`SELECT count(*)::int n FROM "PrnAdministration" WHERE "patientId"=$1`, [other.id]))[0].n);
    await panel.getByLabel('Indicazione (obbligatoria)').fill('Dolore 5/10 (sintetico, browser QA)');
    await panel.getByRole('button', { name: 'Somministra al bisogno' }).click();
    await panel.getByText(/Somministrazione al bisogno di Paracetamolo QA registrata/).waitFor({ timeout: 8000 });
    await page.waitForTimeout(800);
    const rows = await q(`SELECT indicazione, "operatoreId" FROM "PrnAdministration" WHERE "patientId"=$1 ORDER BY "administeredAt"`, [other.id]);
    const listed = await panel.locator('.drug-dose-panel__prn-list li').count();
    await shot(page, 'QA-04b-nurse-prn-doctor-resident');
    check('QA-UI-06b', `Browser: nurse records PRN on a resident registered by ${other.registeredById}; persisted and listed in the panel`,
      rows.length === before + 1 && rows.at(-1).operatoreId === N && /browser QA/.test(rows.at(-1).indicazione) && listed === rows.length,
      `before=${before} after=${rows.length} listed=${listed}`);
    await context.close();
  }

  // 5. OSS: no therapy, no «Nuova compilazione»
  {
    const { context, page } = await login('OSS 1');
    const sideTherapy = await page
      .locator('.teams-sidebar')
      .getByRole('button', { name: 'Terapia' })
      .count();
    await chart(page, NANNI);
    const tabs = await page.locator('.top-nav__item').allInnerTexts();
    const hasTherapy = tabs.some((t) => /^Terapia/.test(t.trim()));
    await shot(page, 'QA-05a-oss-chart');
    let creates = -1;
    if (tabs.some((t) => /^Moduli/.test(t.trim()))) {
      await section(page, 'Moduli');
      await page.locator('.assessment-catalog-row').first().waitFor({ timeout: 15000 });
      creates = await page.getByRole('button', { name: /Nuova compilazione/ }).count();
      await shot(page, 'QA-05b-oss-moduli');
    }
    await page.goto(`${FRONT}/#/terapie`);
    await page.waitForTimeout(1500);
    await shot(page, 'QA-05c-oss-terapia-direct-url');
    check(
      'QA-UI-07',
      'OSS: no Terapia in sidebar nor chart, no «Nuova compilazione» in Moduli',
      sideTherapy === 0 && !hasTherapy && creates === 0,
      `sidebar=${sideTherapy} tabs=${JSON.stringify(tabs)} creates=${creates}`,
    );
    await context.close();
  }

  // 6. Diary urgent ack per user + persistence
  {
    const { context, page } = await login('Supervisore 1');
    await page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}/diario`);
    await page.waitForTimeout(2500);
    await page.waitForTimeout(1500);
    const btn = page.getByRole('button', { name: /^Presa visione della voce urgente/ }).first();
    const before = await btn.count();
    const text0 = await page.locator('body').innerText();
    await shot(page, 'QA-06a-supervisor-diary-before');
    if (before) await btn.click();
    await page.waitForTimeout(1500);
    await page.reload();
    await relogin(page, 'Supervisore 1');
    const after = await page
      .getByRole('button', { name: /^Presa visione della voce urgente/ })
      .count();
    const text1 = await page.locator('body').innerText();
    await shot(page, 'QA-06b-supervisor-diary-after-reload');
    const dbRows = await q(
      `SELECT "operatorId","operatorRole" FROM "DiaryEntryAcknowledgement" WHERE "patientId"=$1 ORDER BY "acknowledgedAt"`,
      [NANNI],
    );
    check(
      'QA-UI-08',
      'Supervisor still had «Presa visione» although the nurse acked (per reader); after ack + reload the button is gone and both readers are recorded',
      before >= 1 &&
        after === before - 1 &&
        dbRows.some((r) => r.operatorId === N) &&
        dbRows.some((r) => r.operatorId === S) &&
        /Infermiere 1/.test(text1),
      `before=${before} after=${after} db=${JSON.stringify(dbRows)} nurseNameShownBefore=${/Infermiere 1/.test(text0)}`,
    );
    await context.close();
    const nurse = await login('Infermiere 1');
    await nurse.page.goto(`${FRONT}/#/dettaglio-paziente/${NANNI}/diario`);
    await nurse.page.waitForTimeout(2500);
    await nurse.page.waitForTimeout(1500);
    const nb = await nurse.page
      .getByRole('button', { name: /^Presa visione della voce urgente/ })
      .count();
    await shot(nurse.page, 'QA-06c-nurse-diary');
    check(
      'QA-UI-09',
      'Nurse (who acked via API) sees no «Presa visione» button for that entry',
      nb === before - 1,
      `${nb}`,
    );
    await nurse.context.close();
  }

  // 7. Tablet 820x1180: no horizontal scroll on the main pages
  {
    const { context, page } = await login('Infermiere 1', { width: 820, height: 1180 });
    const report = {};
    report.turno = await noHScroll(page);
    await shot(page, 'QA-07-820-turno');
    for (const [name, hash] of [
      ['pazienti', '#/pazienti'],
      ['terapie', '#/terapie'],
      ['agenda', '#/agenda-operatore'],
      ['consegne', '#/consegne'],
      ['note', '#/note'],
    ]) {
      await page.goto(`${FRONT}/${hash}`);
      await page.waitForTimeout(2000);
      report[name] = await noHScroll(page);
      await shot(page, `QA-07-820-${name}`);
    }
    await chart(page, NANNI);
    for (const s of ['Panoramica', 'Dati di ingresso', 'Clinica', 'Terapia', 'Parametri', 'Moduli', 'Documenti', 'Dimissione']) {
      const exists = await page
        .locator('.top-nav__item')
        .filter({ hasText: new RegExp(`^${s}`) })
        .count();
      if (!exists) {
        report[`chart-${s}`] = 'absent';
        continue;
      }
      await section(page, s);
      report[`chart-${s}`] = await noHScroll(page);
      await shot(page, `QA-07-820-chart-${s}`);
    }
    check(
      'QA-UI-10',
      '820x1180: no horizontal scroll on main pages and chart sections',
      Object.values(report).every((v) => v === true || v === 'absent'),
      JSON.stringify(report),
    );
    // Back/reload restore the exact sub-place (therapy sub-view)
    await section(page, 'Terapia');
    await page
      .locator('[id^="therapy-section"]')
      .filter({ hasText: /^Calendario/ })
      .first()
      .click();
    await page.waitForTimeout(1500);
    const h1 = await page.evaluate(() => location.hash);
    await page.reload();
    await relogin(page, 'Infermiere 1');
    const h2 = await page.evaluate(() => location.hash);
    const calVisible = await page
      .getByTestId('ptc-event')
      .first()
      .isVisible()
      .catch(() => false);
    await section(page, 'Clinica');
    await page.goBack();
    await page.waitForTimeout(2000);
    const h3 = await page.evaluate(() => location.hash);
    const calBack = await page
      .getByTestId('ptc-event')
      .first()
      .isVisible()
      .catch(() => false);
    await shot(page, 'QA-07-back-restore');
    check(
      'QA-UI-11',
      'Reload and Back restore Terapia › Calendario',
      h1 === h2 && calVisible && calBack,
      `h1=${h1} h2=${h2} h3=${h3} cal=${calVisible}/${calBack}`,
    );
    await context.close();
  }
} catch (error) {
  check('QA-UI-ERR', 'browser script error', false, error?.stack ?? error);
} finally {
  await browser.close();
}
check('QA-UI-CONSOLE', 'No console errors', consoleErrors.length === 0, consoleErrors.join(' || '));
check('QA-UI-HTTP', 'No 4xx/5xx from the UI', httpErrors.length === 0, httpErrors.join(' || '));
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify(
    { date: new Date().toISOString(), today, results, consoleErrors, httpErrors },
    null,
    2,
  ),
);
await db.end();
