// UX direct-access cycle — W1 deep navigation. Every rewired entry point must land on the exact
// section + sub-view + item, asserted in the DOM (active chart section, focused item inside the
// viewport), never just by URL. LOCAL synthetic stack only.
// Prereq: backend :3111 (AUTH_MODE=demo, simulator on), vite :5211, DB seeded with
// scripts/assistant/seed-assistant-demo.mts + scripts/e2e/seed-phase10-demo.mts.
// Usage: DATABASE_URL=<local DB> [TRACE=1] node scripts/e2e/ux-w1-navigation.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const API = process.env.API ?? 'http://127.0.0.1:3111';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux-direct-access-cycle/w1';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const NANNI = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
if (!NANNI) throw new Error('seed Nanni Miriam first');

// Re-runs: previous W1 appointments would collide with the 23:00 slot (409).
await db.query(`DELETE FROM "Appointment" WHERE "notes" LIKE 'W1-E2E%'`).catch(() => {});
// …and previous W1 handovers are closed, so the Adesso queue shows this run's rows only.
await db
  .query(`UPDATE "Consegna" SET stato='completata' WHERE note LIKE 'W1-E2E%'`)
  .catch(() => {});

const results = [];
const consoleErrors = [];
const httpErrors = [];
const MARK = `W1-E2E ${Date.now()}`;

function check(id, name, ok, detail = '', status) {
  const result = status ?? (ok ? 'PASS' : 'FAIL');
  results.push({ id, name, result, detail });
  console.log(`${result} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();
let authHeader = null;
const rosters = {};

async function login(role, viewport = { width: 1180, height: 820 }, url = FRONT) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  if (process.env.TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${role}: ${m.text().slice(0, 240)}`);
  });
  page.on('request', (r) => {
    const h = r.headers().authorization;
    if (h && r.url().startsWith(API) && role === 'Infermiere 1') authHeader = h;
  });
  page.on('response', (r) => {
    if (!r.url().startsWith(API)) return;
    if (r.url().includes('/patients/page?') && r.ok())
      r.json()
        .then((j) => (rosters[role] = j))
        .catch(() => {});
    if (r.status() >= 500 || r.status() === 403)
      httpErrors.push(`${role} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(url);
  await pickRole(page, role);
  return { context, page };
}

async function pickRole(page, role) {
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(800);
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });
const side = (page, name) =>
  page.locator('.teams-sidebar').getByRole('button', { name }).first().click();

/** Active section of the chart rail (the selected chip, not the URL). */
async function activeSection(page, timeout = 8000) {
  const loc = page.locator('.chart-sections .top-nav__item.is-active').first();
  await loc.waitFor({ timeout }).catch(() => {});
  return (await loc.innerText().catch(() => '')).replace(/\s+\d+$/, '').trim();
}

/** Active sub-view inside the chart panel (e.g. Terapia sub-tabs). */
async function activeSubView(page) {
  return (
    await page
      .locator('#patient-tab-panel .top-nav__item.is-active')
      .first()
      .innerText({ timeout: 4000 })
      .catch(() => '')
  ).trim();
}

/** The element is inside the viewport (polls while lazy content mounts). */
async function inView(page, selector, timeout = 9000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const box = await page
      .locator(selector)
      .first()
      .boundingBox()
      .catch(() => null);
    const vh = page.viewportSize()?.height ?? 0;
    if (box && box.y + Math.min(box.height, 40) > 0 && box.y < vh - 20) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

async function waitTurno(page) {
  await page.waitForSelector('.turno-pcard', { timeout: 90000 });
  await page.waitForSelector('.adesso-queue__row', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function backToTurno(page) {
  await page.goBack();
  await page.waitForTimeout(600);
  if (!(await page.locator('.turno-pcard').count())) await side(page, 'Turno');
  await waitTurno(page);
}

/** W2 implements the Terapia sub-view + row focus; until merged the sub-view check is pending. */
async function therapyLanding(page, id, name, expectedView, therapyId, inChart = false) {
  const section = await activeSection(page);
  const hash = decodeURIComponent(await page.evaluate(() => location.hash));
  check(
    id,
    `${name}: section`,
    section === 'Terapia' && hash.includes(NANNI_OR(hash)),
    `active="${section}" hash=${hash}`,
  );
  const target =
    hash.includes(`sv=${expectedView.key}`) && (!therapyId || hash.includes(`t=${therapyId}`));
  // In-chart actions (anomaly banner) seed the focus directly, without a new URL.
  if (!inChart) check(`${id}.target`, `${name}: target carries sub-view + drug`, target, hash);
  const sub = await activeSubView(page);
  const subOk = sub.startsWith(expectedView.label);
  check(
    `${id}.subview`,
    `${name}: Terapia sub-view "${expectedView.label}"`,
    subOk,
    `active sub-view="${sub}"`,
    subOk ? 'PASS' : 'PENDING-W2',
  );
  if (therapyId) {
    const row = await inView(
      page,
      `[data-therapy-focus], .therapy-list-row--focus, [data-therapy-id="${therapyId}"].is-focus`,
      4000,
    );
    check(
      `${id}.item`,
      `${name}: drug row highlighted in view`,
      row,
      '',
      row ? 'PASS' : 'PENDING-W2',
    );
  }
}
const NANNI_OR = (hash) => (hash.includes('dettaglio-paziente/') ? 'dettaglio-paziente/' : NANNI);
const GIORNALIERE = { key: 'giornaliere', label: 'Somministrazioni' };
const ATTIVI = { key: 'attivi', label: 'Farmaci attivi' };

async function consegnaLanding(page, id, name) {
  const section = await activeSection(page);
  const focused = await inView(page, '[data-consegna-id][data-chart-focus]');
  const text = focused
    ? await page.locator('[data-consegna-id][data-chart-focus]').first().innerText()
    : '';
  check(
    id,
    `${name}: Clinica → the handover highlighted in view`,
    section === 'Clinica' && focused && text.includes(MARK),
    `active="${section}" focused=${focused}`,
  );
}

async function apiJson(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const romeToday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());

try {
  // ── Nurse ────────────────────────────────────────────────────────────────────────────────
  let { context, page } = await login('Infermiere 1');
  await waitTurno(page);
  if (!authHeader) throw new Error('no auth header captured');
  const me = await apiJson('GET', '/auth/me');
  const myId = me.user?.id ?? me.id ?? me.operator?.id;
  // Synthetic data for this run: an overdue urgent handover, a severe allergy, an appointment,
  // a note — all on Nanni (synthetic patient).
  const consegna = await apiJson('POST', '/consegne', {
    pazienteId: NANNI,
    priorita: 'urgente',
    tipo: 'Medicazione',
    note: `${MARK}: controllo medicazione sacrale`,
    scadenza: romeToday,
    oraScadenza: '09:00',
  });
  const cart = await apiJson('GET', `/patients/${NANNI}/cartella`);
  const data = cart.data ?? {};
  data.allergie = [
    ...(Array.isArray(data.allergie) ? data.allergie : []),
    {
      id: `w1-${Date.now()}`,
      allergene: 'Penicillina',
      reazione: 'Orticaria',
      gravita: 'grave',
      documentato: romeToday,
    },
  ];
  await apiJson('PUT', `/patients/${NANNI}/cartella`, { data });
  let appointmentOk = true;
  try {
    await apiJson('POST', '/appointments', {
      patientId: NANNI,
      operatorId: myId,
      operatorName: 'Infermiere 1',
      data: romeToday,
      ora: '23:00',
      durata: 30,
      tipologia: 'consulto',
      note: MARK,
      stato: 'programmato',
    });
  } catch (error) {
    appointmentOk = false;
    console.log('appointment seed failed:', String(error).slice(0, 200));
  }
  let noteOk = true;
  try {
    await apiJson('POST', '/notes', {
      destinatarioId: 'tutti',
      pazienteId: NANNI,
      priorita: 'normale',
      messaggio: `${MARK}: nota con paziente`,
    });
  } catch (error) {
    noteOk = false;
    console.log('note seed failed:', String(error).slice(0, 200));
  }
  // Fresh session so every dashboard source re-reads the seeded data.
  await page.reload();
  await pickRole(page, 'Infermiere 1');
  await waitTurno(page);

  const nanniCard = page.locator('.turno-pcard', { hasText: 'Nanni, Miriam' });
  // 1. Turno card: every late drug listed, no ellipsis, each one a link.
  const doses = await nanniCard.locator('.turno-pcard__dose').allInnerTexts();
  const clipped = await page.$$eval('.turno-pcard__next', (els) =>
    els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
  );
  check(
    'T1',
    'Turno card lists ALL late drugs as links, no "(+N)", no ellipsis (1180)',
    doses.length >= 2 &&
      !(await nanniCard.innerText()).includes('(+') &&
      clipped.length === 0 &&
      doses.some((d) => d.includes('Metformina')),
    `doses=${JSON.stringify(doses)} clipped=${clipped.length}`,
  );
  await shot(page, 'T1-turno-card-late-doses-1180');

  // 2. A late dose → Terapia / giornaliere on that drug.
  const metforminaId = await nanniCard
    .locator('.turno-pcard__dose', { hasText: 'Metformina' })
    .getAttribute('data-turno-dose');
  await nanniCard.locator('.turno-pcard__dose', { hasText: 'Metformina' }).click();
  await therapyLanding(page, 'T2', 'Turno late dose', GIORNALIERE, metforminaId);
  await shot(page, 'T2-turno-dose-terapia');
  await backToTurno(page);
  check(
    'T2.back',
    'Back from the chart returns to Turno',
    (await page.locator('.turno-pcard').count()) > 0,
  );

  // 3. Turno badges → their place.
  const badge = (key) => nanniCard.locator(`[data-turno-badge="${key}"]`);
  if (await badge('consegne').count()) {
    await badge('consegne').click();
    // A count badge (no single handover) lands on the chart's Consegne part.
    {
      const section = await activeSection(page);
      const ok = await inView(page, '[data-chart-part="consegne"]');
      check(
        'T3',
        'Turno badge «Consegne N» → Clinica / Consegne part in view',
        section === 'Clinica' && ok,
        `active="${section}"`,
      );
    }
    await shot(page, 'T3-turno-badge-consegne');
    await backToTurno(page);
  } else check('T3', 'Turno badge «Consegne» present', false, 'badge missing');
  if (await badge('allergia').count()) {
    await badge('allergia').click();
    const section = await activeSection(page);
    const ok = await inView(page, '[data-chart-anchor="allergie"][data-chart-focus]');
    check(
      'T4',
      'Turno badge «Allergia» → Clinica, allergy table highlighted in view',
      section === 'Clinica' && ok,
      `active="${section}"`,
    );
    await shot(page, 'T4-turno-badge-allergia');
    await backToTurno(page);
  } else check('T4', 'Turno badge «Allergia» present', false, 'badge missing');

  // 4. Adesso queue.
  const row = (text) => page.locator('.adesso-queue__row', { hasText: text });
  await row('Pantoprazolo').first().getByRole('button', { name: /Apri/ }).click();
  await therapyLanding(page, 'A1', 'Adesso late therapy row', GIORNALIERE);
  await shot(page, 'A1-adesso-terapia');
  await backToTurno(page);

  const anomaly = row('farmaci da verificare').filter({ hasText: 'Nanni' }).first();
  const anomalyText = (await anomaly.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check(
    'A2.info',
    'Adesso anomaly row names the drugs (not just the count)',
    /farmaci da verificare: .*Metformina/.test(anomalyText),
    anomalyText,
  );
  await anomaly.getByRole('button', { name: /Apri/ }).click();
  await therapyLanding(page, 'A2', 'Adesso anomaly row', ATTIVI);
  await shot(page, 'A2-adesso-anomalia');
  await backToTurno(page);

  const handoverRow = row(MARK).first();
  if (await handoverRow.count()) {
    await handoverRow.getByRole('button', { name: /Apri/ }).click();
    await consegnaLanding(page, 'A3', 'Adesso handover row');
    await shot(page, 'A3-adesso-consegna');
    // Reload: the hash restores section + item after the role picker.
    const hashBefore = await page.evaluate(() => location.hash);
    await page.reload();
    await pickRole(page, 'Infermiere 1');
    await page.waitForTimeout(1500);
    const hashAfter = await page.evaluate(() => location.hash);
    check(
      'A3.hash',
      'Chart hash carries section + handover',
      /\/consegne\?c=/.test(hashBefore),
      hashBefore,
    );
    await consegnaLanding(page, 'A3.reload', 'Reload of a handover link');
    check('A3.reload.hash', 'Hash survives reload', hashAfter === hashBefore, hashAfter);
    await shot(page, 'A3-reload-consegna');
    await side(page, 'Turno');
    await waitTurno(page);
  } else check('A3', 'Adesso handover row present', false, 'row missing');

  // 5. Segnalazioni (notification center) row → the late dose.
  await page.locator('.dashboard-notification-compact').first().click();
  await page.waitForSelector('.dashboard-notifications-modal', { timeout: 8000 });
  await page
    .locator('.dashboard-notifications-modal .anomalie-reparto__riga--rosso', { hasText: 'Nanni' })
    .first()
    .click();
  await therapyLanding(page, 'N1', 'Segnalazioni late-dose row', GIORNALIERE);
  await shot(page, 'N1-segnalazioni-ritardo');
  await backToTurno(page);

  // 6. Next appointment → chart part that documents it.
  if (appointmentOk) {
    const appt = page.locator('.turno-appt', { hasText: 'Nanni' }).first();
    if (await appt.count()) {
      await appt.locator('button').first().click();
      const section = await activeSection(page);
      const ok = await inView(page, '[data-chart-part="esami-consulenze"]');
      check(
        'P1',
        'Turno appointment (consulto) → Clinica / Esami e consulenze in view',
        section === 'Clinica' && ok,
        `active="${section}"`,
      );
      await shot(page, 'P1-turno-appuntamento');
      await backToTurno(page);
    } else check('P1', 'Turno appointment present', false, 'appointment not listed');
  } else check('P1', 'Turno appointment', false, 'seed failed', 'BLOCKED');

  // 7. Patient list signal chips.
  await side(page, 'Pazienti');
  await page.waitForSelector('.patient-roster__row, .patient-card', { timeout: 30000 });
  await page.waitForTimeout(2500);
  const nanniRow = page.locator('.patient-roster__row', { hasText: 'Nanni' }).first();
  const anomalyChip = nanniRow.locator('[data-signal="drug-anomaly"]');
  const chipText = (await anomalyChip.innerText().catch(() => '')).trim();
  check(
    'L1.info',
    'Patient list anomaly chip shows the drug names inline',
    /da sanare: .*Metformina/.test(chipText),
    chipText,
  );
  await shot(page, 'L1-lista-segnalazioni');
  await anomalyChip.click();
  await therapyLanding(page, 'L1', 'Patient list anomaly chip', ATTIVI);
  await page.goBack();
  await page.waitForSelector('.patient-roster__row', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page
    .locator('.patient-roster__row', { hasText: 'Nanni' })
    .first()
    .locator('[data-signal="handover"]')
    .click();
  {
    const section = await activeSection(page);
    const ok = await inView(page, '[data-chart-part="consegne"]');
    check(
      'L2',
      'Patient list «Consegne N» chip → Clinica / Consegne part in view',
      section === 'Clinica' && ok,
      `active="${section}"`,
    );
  }
  await page.goBack();
  await page.waitForSelector('.patient-roster__row', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page
    .locator('.patient-roster__row', { hasText: 'Nanni' })
    .first()
    .locator('[data-signal="allergy"]')
    .click();
  {
    const section = await activeSection(page);
    const ok = await inView(page, '[data-chart-anchor="allergie"][data-chart-focus]');
    check(
      'L3',
      'Patient list «Allergie» chip → allergy table highlighted',
      section === 'Clinica' && ok,
      `active="${section}"`,
    );
    await shot(page, 'L3-lista-allergie');
  }

  // 8. Consegne feed «Apri cartella» → that handover.
  // From a chart the ward sidebar stays on the patient (Phase 10): leave the chart first.
  await side(page, 'Turno');
  await waitTurno(page);
  await side(page, 'Consegne');
  await page.getByRole('button', { name: 'Feed consegne' }).click();
  await page.waitForSelector(`[data-consegna-open="${consegna.id}"]`, { timeout: 20000 });
  await page.locator(`[data-consegna-open="${consegna.id}"]`).click();
  await consegnaLanding(page, 'C1', 'Consegne feed «Apri cartella»');
  await shot(page, 'C1-feed-apri-cartella');

  // 9. Notes: patient name is a link.
  if (noteOk) {
    await side(page, 'Note');
    const link = page.locator('.nm-row', { hasText: MARK }).locator('.nm-patient').first();
    await link.waitFor({ timeout: 20000 }).catch(() => {});
    if (await link.count()) {
      await link.click();
      const section = await activeSection(page);
      const ok = await inView(page, '[data-chart-part="note"]');
      check(
        'M1',
        'Note patient name → Clinica / Note e visite in view',
        section === 'Clinica' && ok,
        `active="${section}"`,
      );
      await shot(page, 'M1-note-paziente');
    } else check('M1', 'Note with patient link listed', false, 'link missing');
  } else check('M1', 'Note patient link', false, 'seed failed', 'BLOCKED');

  // 10. Anomaly banner in the chart → Terapia on the drug to fix.
  await side(page, 'Pazienti');
  await page.waitForSelector('.patient-roster__row', { timeout: 20000 });
  // Click the identity cell (the row's middle can be a chip or the NEWS2 button).
  await page
    .locator('.patient-roster__row', { hasText: 'Nanni' })
    .first()
    .locator('.patient-roster__identity')
    .click();
  await page.waitForTimeout(1500);
  const banner = page.getByRole('button', { name: 'Vai alla terapia' });
  await banner
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  if (await banner.count()) {
    await banner.first().click();
    await therapyLanding(page, 'B1', 'Anomaly banner «Vai alla terapia»', ATTIVI, undefined, true);
    await shot(page, 'B1-banner-anomalie');
  } else check('B1', 'Anomaly banner present', false, 'banner missing');

  // 11. Portrait: no ellipsis on the Turno therapy line.
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace-nurse.zip` });
  await context.close();
  ({ context, page } = await login('Infermiere 1', { width: 820, height: 1180 }));
  await waitTurno(page);
  {
    const clippedP = await page.$$eval(
      '.turno-pcard__next',
      (els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length,
    );
    const dosesP = await page
      .locator('.turno-pcard', { hasText: 'Nanni, Miriam' })
      .locator('.turno-pcard__dose')
      .count();
    check(
      'T1.portrait',
      'Turno late doses wrap at 820x1180 (no ellipsis)',
      clippedP === 0 && dosesP >= 2,
      `clipped=${clippedP} doses=${dosesP}`,
    );
    await page.locator('.turno-pcard', { hasText: 'Nanni, Miriam' }).scrollIntoViewIfNeeded();
    await shot(page, 'T1-turno-card-late-doses-820');
  }
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace-nurse-portrait.zip` });
  await context.close();

  // ── Supervisor ──────────────────────────────────────────────────────────────────────────
  ({ context, page } = await login('Supervisore 1'));
  await page.waitForSelector('.admin-dashboard', { timeout: 90000 });
  await page.waitForSelector('.therapy-deadlines__row', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const late = page.locator('.therapy-deadlines__overdue [data-deadline-patient]').first();
  if (await late.count()) {
    await late.click();
    await therapyLanding(page, 'S1', 'Supervisor deadline row name', GIORNALIERE);
    await shot(page, 'S1-supervisore-scadenze');
    await page.goBack();
    await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
    await page.waitForTimeout(1500);
  } else check('S1', 'Supervisor overdue deadline row present', false, 'row missing');

  const urgentLink = page.locator(`[data-consegna-link="${consegna.id}"]`);
  if (await urgentLink.count()) {
    await urgentLink.click();
    await consegnaLanding(page, 'S2', 'Admin «Consegne urgenti» card');
    await shot(page, 'S2-supervisore-consegna-urgente');
    await page.goBack();
    await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
    await page.waitForTimeout(1500);
  } else check('S2', 'Admin urgent handover card present', false, 'card missing');

  const kpi = (label) => page.locator('.dashboard-kpi-card', { hasText: label }).first();
  await kpi('Dimessi in archivio').click();
  await page.waitForSelector('.plist-views', { timeout: 20000 });
  {
    const pressed = await page
      .locator('.plist-views [aria-pressed="true"]')
      .first()
      .innerText()
      .catch(() => '');
    check(
      'S3',
      'KPI «Dimessi in archivio» → list on the Dimessi view',
      pressed.startsWith('Dimessi'),
      `pressed="${pressed}"`,
    );
    await shot(page, 'S3-kpi-dimessi');
  }
  await page.goBack();
  await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await kpi('Parametri critici').click();
  await page.waitForSelector('.plist-views', { timeout: 20000 });
  {
    const note = await page
      .locator('[data-list-signal="critici"]')
      .innerText()
      .catch(() => '');
    check(
      'S4',
      'KPI «Parametri critici» → list filtered on critical vitals',
      note.includes('Parametri critici'),
      note.replace(/\s+/g, ' '),
    );
    await shot(page, 'S4-kpi-critici');
  }
  await page.goBack();
  await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await kpi('Consegne in corso').click();
  await page.waitForTimeout(2500);
  {
    const pressed = await page
      .locator('[aria-label="Filtra per stato"] [aria-pressed="true"]')
      .first()
      .innerText()
      .catch(() => '');
    check(
      'S5',
      'KPI «Consegne in corso» → feed filtered In corso',
      pressed === 'In corso',
      `pressed="${pressed}"`,
    );
    await shot(page, 'S5-kpi-consegne-in-corso');
  }
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace-supervisor.zip` });
  await context.close();

  // ── OSS: a Terapia deep link falls back to the overview (no dead end) ─────────────────────
  // OSS sees only its own residents: take the first one of its roster, then paste a Terapia link
  // while the app is running (the «shared link» path).
  ({ context, page } = await login('OSS 1'));
  for (let i = 0; i < 60 && !rosters['OSS 1']; i++) await page.waitForTimeout(500);
  const ossPatient = rosters['OSS 1']?.items?.[0]?.id;
  if (!ossPatient) throw new Error('OSS roster empty');
  await page.goto(
    `${FRONT}/#/dettaglio-paziente/${ossPatient}/terapia-farmacologica?sv=giornaliere`,
  );
  await page.waitForTimeout(3000);
  {
    const section = await activeSection(page, 20000);
    const denied = await page.locator('[data-testid="chart-section-denied"]').count();
    check(
      'O1',
      'OSS Terapia link → Panoramica, no «Sezione non disponibile»',
      section === 'Panoramica' && denied === 0,
      `active="${section}" denied=${denied}`,
    );
    await shot(page, 'O1-oss-fallback');
  }
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace-oss.zip` });
  await context.close();
} catch (error) {
  check('RUN', 'script completed', false, String(error?.stack ?? error).slice(0, 600));
} finally {
  await browser.close();
  await db.end();
}

const fatalHttp = httpErrors.filter((e) => !/^OSS 1 403 /.test(e));
check(
  'NET',
  'No 5xx / 403 responses (OSS 403s listed separately)',
  fatalHttp.length === 0,
  fatalHttp.slice(0, 10).join(' | '),
);
check(
  'CONSOLE',
  'No console errors',
  consoleErrors.length === 0,
  consoleErrors.slice(0, 10).join(' | '),
);
const summary = {
  pass: results.filter((r) => r.result === 'PASS').length,
  fail: results.filter((r) => r.result === 'FAIL').length,
  pendingW2: results.filter((r) => r.result === 'PENDING-W2').length,
  blocked: results.filter((r) => r.result === 'BLOCKED').length,
};
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify(
    { at: new Date().toISOString(), summary, results, httpErrors, consoleErrors },
    null,
    2,
  ),
);
console.log(JSON.stringify(summary));
process.exit(summary.fail ? 1 : 0);
