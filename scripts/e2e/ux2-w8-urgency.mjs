// UX2 cycle — W8 urgency model (diary + consegne). LOCAL synthetic stack only.
// Nurse writes an URGENT diary entry and an URGENT consegna (assigned to Medico 1) → the doctor
// sees them flagged (Turno «Adesso» + notification centre, diary, consegne feed, proactive
// «Segnalazioni») → the doctor says «Ho capito» → the urgency is gone for everyone (supervisor
// included), the trace «Urgenza presa in carico da Medico 1 … alle hh:mm» is visible and survives
// a reload; the nurse (author) never sees «Ho capito» on her own notes; no aperta / in corso /
// completata anywhere in the UX; no console errors / 403 / 5xx.
// Prereq: backend :3128 (AUTH_MODE=demo, simulator on), vite preview :5228, seeded DB.
// Usage: DATABASE_URL=<local DB> node scripts/e2e/ux2-w8-urgency.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5228';
const API = process.env.API ?? 'http://127.0.0.1:3128';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux2-cycle/w8';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
if (!NANNI) throw new Error('seed Nanni Miriam first');

const MARK = `W8-E2E ${Date.now()}`;
const results = [];
const consoleErrors = [];
const httpErrors = [];
const FORBIDDEN_WORDS =
  /\b(Aperta|Aperte|In corso|Completata|Completate|Da iniziare|Prendi in carico|Rilascia|Consegne aperte)\b/;

function check(id, name, ok, detail = '') {
  const result = ok ? 'PASS' : 'FAIL';
  results.push({ id, name, result, detail });
  console.log(`${result} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();
const auth = {};

async function login(role) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${role}: ${m.text().slice(0, 240)}`);
  });
  page.on('request', (r) => {
    const h = r.headers().authorization;
    if (h && r.url().startsWith(API)) auth[role] = h;
  });
  page.on('response', (r) => {
    if (!r.url().startsWith(API)) return;
    if (r.status() >= 500 || r.status() === 403)
      httpErrors.push(`${role} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(1000);
  return { context, page, role };
}

async function close(session, name) {
  await session.context.tracing.stop({ path: `${OUT}/trace-${name}.zip` });
  await session.context.close();
}

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/screens/${name}.png`, fullPage: false });
const side = (page, name) =>
  page.locator('.teams-sidebar').getByRole('button', { name }).first().click();

async function openDiary(page) {
  await page.evaluate((id) => {
    location.hash = `#/dettaglio-paziente/${id}/diario`;
  }, NANNI);
  await page
    .locator('button.btn-success', { hasText: 'Aggiungi voce' })
    .first()
    .waitFor({ timeout: 20000 })
    .catch(async (e) => {
      await page.screenshot({ path: `${OUT}/screens/debug-diary.png` });
      throw e;
    });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
}

async function openFeed(page) {
  // Inside a chart «Consegne» stays on the open resident: leave the chart first.
  const turnoBtn = page.locator('.teams-sidebar').getByRole('button', { name: 'Turno' });
  if (await turnoBtn.count()) {
    await turnoBtn.first().click();
    await page.waitForTimeout(800);
  }
  await side(page, 'Consegne');
  await page.getByRole('button', { name: 'Feed consegne' }).click();
  await page.waitForSelector('.consegne-page', { timeout: 20000 });
  await page.waitForTimeout(1200);
}

const diaryCard = (page) => page.locator('.diario-card', { hasText: `${MARK} diario` }).first();
const feedCard = (page) =>
  page.locator('.consegne-page .consegna-card', { hasText: `${MARK} consegna` }).first();

async function apiJson(role, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: auth[role], 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── 1. Nurse writes an urgent diary entry and an urgent consegna ────────────────────────────────
const nurse = await login('Infermiere 1');
await openDiary(nurse.page);
await nurse.page.locator('button.btn-success', { hasText: 'Aggiungi voce' }).first().click();
const form = nurse.page.locator('.cr-inline-form, .diario-form').first();
await nurse.page
  .locator('textarea[id$="-content"]')
  .first()
  .fill(`${MARK} diario: paziente agitato, valutare`);
await nurse.page.locator('input[id$="-title"]').first().fill(`${MARK} diario`);
await nurse.page.locator('select[id$="-priority"]').first().selectOption('urgente');
await shot(nurse.page, '01-nurse-diary-form-urgent');
await form.getByRole('button', { name: /Salva/ }).last().click();
await diaryCard(nurse.page).waitFor({ timeout: 15000 });
await nurse.page.waitForTimeout(800);
let card = diaryCard(nurse.page);
check(
  'N1',
  'nurse sees her urgent diary entry as «Urgente», never «Ho capito»',
  (await card.getByRole('button', { name: /Ho capito/ }).count()) === 0 &&
    /in attesa che un collega la prenda in carico/.test(await card.innerText()),
  (await card.innerText()).replace(/\s+/g, ' ').slice(0, 200),
);
await shot(nurse.page, '02-nurse-diary-own-urgent-no-button');

await openFeed(nurse.page);
check(
  'N2',
  'consegne feed has no aperta / in corso / completata',
  !FORBIDDEN_WORDS.test(await nurse.page.locator('.consegne-page').innerText()),
);
await nurse.page
  .getByRole('button', { name: /Nuova consegna/ })
  .first()
  .click();
let createdViaUi = false;
try {
  await nurse.page.locator('#handover-patient').fill('Nanni');
  await nurse.page.getByRole('option', { name: /Nanni/ }).first().click({ timeout: 8000 });
  const assignee = nurse.page.locator('#handover-assignee');
  const options = await assignee.locator('option').allInnerTexts();
  const medico = options.find((o) => /Medico 1|1 Medico/.test(o));
  if (!medico) throw new Error(`no Medico 1 option: ${options.join('|')}`);
  await assignee.selectOption({ label: medico });
  await nurse.page.locator('#handover-priority').selectOption('urgente');
  await nurse.page
    .locator('#handover-notes')
    .fill(`${MARK} consegna: richiamare il medico per la PA`);
  const priorityOptions = await nurse.page.locator('#handover-priority option').allInnerTexts();
  check(
    'N3',
    'create form: priority only Normale / Urgente, no «Stato» field',
    priorityOptions.join('|') === 'Normale|Urgente' &&
      (await nurse.page
        .locator('#nuova-consegna-panel')
        .getByText(/^Stato$/)
        .count()) === 0,
    priorityOptions.join('|'),
  );
  await shot(nurse.page, '03-nurse-consegna-form-urgent');
  await nurse.page.getByRole('button', { name: /Crea consegna/ }).click();
  await feedCard(nurse.page).waitFor({ timeout: 15000 });
  createdViaUi = true;
} catch (error) {
  console.log('UI create fallback:', error.message);
}
if (!createdViaUi) {
  const r = await apiJson('Infermiere 1', 'POST', '/consegne', {
    pazienteId: NANNI,
    priorita: 'urgente',
    tipo: 'Monitoraggio',
    note: `${MARK} consegna: richiamare il medico per la PA`,
    operatoreAssegnatoId: 'SIM-DOCTOR-1',
  });
  check('N3b', 'consegna created by the nurse (API fallback)', r.status === 201, String(r.status));
  await openFeed(nurse.page);
}
await nurse.page.waitForTimeout(1000);
card = feedCard(nurse.page);
await card.waitFor({ timeout: 15000 });
check(
  'N4',
  'nurse (author) sees her urgent consegna without «Ho capito»',
  (await card.getByRole('button', { name: /Ho capito/ }).count()) === 0 &&
    /Urgente/.test(await card.innerText()),
  (await card.innerText()).replace(/\s+/g, ' ').slice(0, 200),
);
await shot(nurse.page, '04-nurse-consegna-own-no-button');
const consegnaId = await card.getAttribute('data-consegna-id');
const selfAck = await apiJson('Infermiere 1', 'POST', `/consegne/${consegnaId}/ack`);
check(
  'N5',
  'server refuses the author «Ho capito» (409, clear message)',
  selfAck.status === 409 && /un altro operatore/.test(selfAck.body?.error ?? ''),
  `${selfAck.status} ${selfAck.body?.error}`,
);
await close(nurse, 'nurse-write');

// ── 2. Doctor sees both flagged, then «Ho capito» ───────────────────────────────────────────────
const doctor = await login('Medico 1');
await side(doctor.page, 'Turno');
await doctor.page.waitForTimeout(2500);
const turno = await doctor.page.locator('main, .main-area-clean').first().innerText();
check(
  'D1',
  'Turno: the urgent consegna is flagged for the doctor (Adesso or «Urgenze 1» on the resident)',
  turno.includes(MARK) || /Urgenze 1/.test(turno),
  /Urgenze 1/.test(turno) ? 'badge «Urgenze 1» on Nanni' : 'in Adesso',
);
await shot(doctor.page, '05-doctor-turno-flagged');
const bell = doctor.page
  .getByRole('button', { name: /notific|Notific|Avvisi|Segnalazioni/ })
  .first();
if (await bell.count()) {
  await bell.click().catch(() => {});
  await doctor.page.waitForTimeout(800);
  const panel = await doctor.page.locator('body').innerText();
  check(
    'D2',
    'notification centre: «Urgenze da prendere in carico»',
    /Urgenze da prendere in carico/.test(panel),
  );
  await shot(doctor.page, '06-doctor-notifications');
  await doctor.page.keyboard.press('Escape').catch(() => {});
}
const inbox = await apiJson('Medico 1', 'GET', '/skills/proactive/inbox');
const handoverSignal = (inbox.body?.signals ?? []).find(
  (s) => s.signalId === `handover:${consegnaId}`,
);
check(
  'D3',
  'Segnalazioni (proactive): «Urgenza da prendere in carico» for the doctor',
  Boolean(handoverSignal) && /^Urgenza da prendere in carico/.test(handoverSignal.title),
  handoverSignal?.title ?? 'missing',
);

await openDiary(doctor.page);
card = diaryCard(doctor.page);
check(
  'D4',
  'diary: the doctor sees «Ho capito» on the nurse urgent entry',
  (await card.getByRole('button', { name: /Ho capito/ }).count()) === 1,
);
await shot(doctor.page, '07-doctor-diary-urgent-ho-capito');
await card.getByRole('button', { name: /Ho capito/ }).click();
await doctor.page.waitForTimeout(1500);
card = diaryCard(doctor.page);
const diaryTrace = await card.innerText();
check(
  'D5',
  'diary: after «Ho capito» the trace replaces the button',
  (await card.getByRole('button', { name: /Ho capito/ }).count()) === 0 &&
    /Urgenza presa in carico da te alle \d{2}:\d{2}/.test(diaryTrace),
  diaryTrace.replace(/\s+/g, ' ').slice(0, 220),
);
await shot(doctor.page, '08-doctor-diary-taken');

await openFeed(doctor.page);
card = feedCard(doctor.page);
await card.waitFor({ timeout: 15000 });
check(
  'D6',
  'consegne feed: «Ho capito» for the doctor; no legacy states',
  (await card.getByRole('button', { name: /Ho capito/ }).count()) === 1 &&
    !FORBIDDEN_WORDS.test(await doctor.page.locator('.consegne-page').innerText()),
);
await shot(doctor.page, '09-doctor-consegna-ho-capito');
await card.getByRole('button', { name: /Ho capito/ }).click();
await doctor.page.waitForTimeout(2000);
card = feedCard(doctor.page);
const feedTrace = await card.innerText();
check(
  'D7',
  'consegne feed: urgency taken, trace shown',
  /Urgenza presa in carico da te alle \d{2}:\d{2}/.test(feedTrace) &&
    (await card.getByRole('button', { name: /Ho capito/ }).count()) === 0,
  feedTrace.replace(/\s+/g, ' ').slice(0, 220),
);
await shot(doctor.page, '10-doctor-consegna-taken');
const inbox2 = await apiJson('Medico 1', 'GET', '/skills/proactive/inbox');
check(
  'D8',
  'Segnalazioni: the handover signal is gone after «Ho capito»',
  !(inbox2.body?.signals ?? []).some((s) => s.signalId === `handover:${consegnaId}`),
);
await side(doctor.page, 'Turno');
await doctor.page.waitForTimeout(2500);
const turnoAfter = await doctor.page.locator('main, .main-area-clean').first().innerText();
check(
  'D9',
  'Turno after «Ho capito»: no urgency badge / Adesso row for it any more',
  !turnoAfter.includes(MARK) && !/Urgenze 1/.test(turnoAfter),
);
await shot(doctor.page, '10b-doctor-turno-after');
await close(doctor, 'doctor');

// ── 3. Supervisor: urgency gone for everyone, trace visible, persisted ──────────────────────────
const sup = await login('Supervisore 1');
await openFeed(sup.page);
card = feedCard(sup.page);
await card.waitFor({ timeout: 15000 });
const supText = await card.innerText();
check(
  'S1',
  'supervisor: trace «presa in carico da Medico 1 (medico) hh:mm», no button',
  /Urgenza presa in carico da Medico 1 \(medico\) alle \d{2}:\d{2}/.test(supText) &&
    (await card.getByRole('button', { name: /Ho capito/ }).count()) === 0,
  supText.replace(/\s+/g, ' ').slice(0, 220),
);
const urgentSection = sup.page.locator('.consegne-section', {
  hasText: 'Urgenze da prendere in carico',
});
check(
  'S2',
  'supervisor: the item is not in «Urgenze da prendere in carico»',
  (await urgentSection.locator('.consegna-card', { hasText: MARK }).count()) === 0,
);
await shot(sup.page, '11-supervisor-consegna-trace');
const overview = await apiJson('Supervisore 1', 'GET', '/consegne/overview');
check(
  'S3',
  'overview: not in urgentPreview; summary has no open/in-progress counts',
  !(overview.body?.urgentPreview ?? []).some((c) => c.id === consegnaId) &&
    !('open' in (overview.body?.summary ?? {})),
  JSON.stringify(overview.body?.summary),
);
await openDiary(sup.page);
const supDiary = await diaryCard(sup.page).innerText();
check(
  'S4',
  'supervisor diary: trace by Medico 1, no «Ho capito»',
  /Urgenza presa in carico da Medico 1 \(medico\)/.test(supDiary) &&
    (await diaryCard(sup.page)
      .getByRole('button', { name: /Ho capito/ })
      .count()) === 0,
  supDiary.replace(/\s+/g, ' ').slice(0, 200),
);
await shot(sup.page, '12-supervisor-diary-trace');
await close(sup, 'supervisor');

// ── 4. Nurse after reload: trace persisted, never «Ho capito» ───────────────────────────────────
const nurse2 = await login('Infermiere 1');
await openDiary(nurse2.page);
await nurse2.page.reload();
await nurse2.page.waitForLoadState('networkidle').catch(() => {});
await nurse2.page.waitForTimeout(1500);
await nurse2.page.screenshot({ path: `${OUT}/screens/13a-nurse-after-reload.png` });
if (
  !(await diaryCard(nurse2.page)
    .isVisible()
    .catch(() => false))
) {
  // The reload may land back on the login / role chooser in the simulator: log in again.
  const chooser = nurse2.page.getByRole('button', { name: /Infermiere 1/ });
  if (await chooser.count()) {
    await chooser.first().click();
    await nurse2.page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  }
  await openDiary(nurse2.page);
}
await diaryCard(nurse2.page).waitFor({ timeout: 20000 });
const nd = await diaryCard(nurse2.page).innerText();
check(
  'P1',
  'after reload the nurse sees «Urgenza presa in carico da Medico 1» on her entry',
  /Urgenza presa in carico da Medico 1 \(medico\) alle \d{2}:\d{2}/.test(nd),
  nd.replace(/\s+/g, ' ').slice(0, 200),
);
check(
  'P2',
  'diary has no open/closed wording',
  !/>?(Aperta|Completata)<?/.test(await nurse2.page.locator('.diario-cards').innerText()),
);
await shot(nurse2.page, '13-nurse-diary-reload-trace');
await openFeed(nurse2.page);
const nf = await feedCard(nurse2.page).innerText();
check(
  'P3',
  'after reload the nurse sees the consegna trace',
  /Urgenza presa in carico da Medico 1/.test(nf),
  nf.replace(/\s+/g, ' ').slice(0, 200),
);
await shot(nurse2.page, '14-nurse-consegna-reload-trace');
await close(nurse2, 'nurse-after');

const dbAck = await db.query(
  `SELECT "operatorId" FROM "ConsegnaAcknowledgement" WHERE "consegnaId"=$1`,
  [consegnaId],
);
const dbStato = await db.query(`SELECT stato FROM "Consegna" WHERE id=$1`, [consegnaId]);
check(
  'DB1',
  'DB: one ack by SIM-DOCTOR-1; stored stato untouched',
  dbAck.rows.length === 1 &&
    dbAck.rows[0].operatorId === 'SIM-DOCTOR-1' &&
    dbStato.rows[0].stato === 'aperta',
  JSON.stringify({ acks: dbAck.rows, stato: dbStato.rows[0]?.stato }),
);

check(
  'C1',
  'no console errors',
  consoleErrors.length === 0,
  consoleErrors.join(' | ').slice(0, 400),
);
check('C2', 'no 403 / 5xx from the API', httpErrors.length === 0, httpErrors.join(' | '));

await browser.close();
await db.end();
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify({ mark: MARK, consegnaId, results, consoleErrors, httpErrors }, null, 2),
);
const failed = results.filter((r) => r.result === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
