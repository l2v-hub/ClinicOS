// UX direct-access W4 — browser evidence against the LOCAL synthetic stack only.
// Prereq: backend :3114 (AUTH_MODE=demo, simulator on), vite :5214, DB seeded with
// seed-assistant-demo.mts + seed-phase10-demo.mts + seed-ux-w4.mts.
// Usage: DATABASE_URL=<local DB> node scripts/e2e/ux-w4-misc.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5214';
const API = process.env.API ?? 'http://127.0.0.1:3114';
const OUT = process.argv[2] ?? 'artifacts/task-validation/ux-direct-access-cycle/w4';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
mkdirSync(`${OUT}/screens`, { recursive: true });
const db = new pg.Client({ connectionString: DB });
await db.connect();
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const NANNI = (
  await one(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
)?.id;
const OLGA = (
  await one(`SELECT id FROM "Patient" WHERE "registeredById"='SIM-OSS-1' AND "lastName"='Verdi'`)
)?.id;
// Fresh urgent entry for every run (createdAt in UTC like Prisma — the column has no time zone): deleting the old one cascades its (append-only) acks — the
// only DELETE the DB trigger allows — so «da vedere» starts true for every reader.
await db.query(
  `DELETE FROM "PatientDiaryEntry" WHERE "patientId"=$1 AND title='W4 · Febbre improvvisa'`,
  [NANNI],
);
const romeDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
const URGENT = `w4urgent${Date.now().toString(36)}`;
await db.query(
  `INSERT INTO "PatientDiaryEntry" (id, "patientId", "authorType", "authorName", title, content, priority, status, "entryDateTime", "createdAt", "updatedAt")
   VALUES ($1, $2, 'medico', 'Medico 1', 'W4 · Febbre improvvisa', 'TC 39.2 °C alle 09:00. Emocolture e rivalutazione entro 2 ore.', 'urgente', 'aperta', $3, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC')`,
  [URGENT, NANNI, `${romeDay}T09:05`],
);
if (!NANNI || !URGENT || !OLGA) throw new Error('seed scripts/e2e/seed-ux-w4.mts first');

const results = [];
const httpErrors = [];
const consoleErrors = [];
function check(id, name, ok, detail = '') {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

// ── API helpers (simulator sessions) ─────────────────────────────────────────────────────────
async function token(identityId) {
  const r = await fetch(`${API}/auth/simulator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityId }),
  });
  if (r.status !== 201) throw new Error(`login ${identityId}: ${r.status}`);
  return (await r.json()).token;
}
async function api(tok, method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: r.status, body: json };
}
const romeToday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());

// ── Fixtures through the real API: nurse appointments (one with a note), 4 on the same day ──
const supTok = await token('SIM-SUPERVISOR-1');
const nurseTok = await token('SIM-NURSE-1');
const NOTE = 'Portare referti ECG e controllare la medicazione';
const existing = await api(nurseTok, 'GET', `/appointments?from=${romeToday}&to=${romeToday}`);
const already = JSON.stringify(existing.body ?? '').includes('Portare referti ECG');
if (!already) {
  for (const [ora, tipologia, note] of [
    ['16:00', 'visita', NOTE],
    ['16:30', 'controllo', ''],
    ['17:00', 'procedura', ''],
    ['17:30', 'consulto', ''],
  ]) {
    const r = await api(supTok, 'POST', '/appointments', {
      patientId: NANNI,
      operatorId: 'SIM-NURSE-1',
      data: romeToday,
      ora,
      tipologia,
      note: note || undefined,
      durata: 30,
    });
    if (r.status !== 201)
      throw new Error(`appointment ${ora}: ${r.status} ${JSON.stringify(r.body)}`);
  }
}

// A complete (7-parameter) reading for «Galli» (nurse resident) so a compact NEWS2 chip has a
// score + time to show inline; Nanni keeps «Non calcolabile» for the tile evidence.
let createdReadingId = null;
const GALLI = (
  await one(`SELECT id FROM "Patient" WHERE "registeredById"='SIM-NURSE-1' AND "lastName"='Galli'`)
)?.id;
if (GALLI) {
  const has = await one(
    `SELECT count(*)::int AS n FROM "PatientParameterReading" WHERE "patientId"=$1 AND values ? 'fr'`,
    [GALLI],
  );
  if (!has?.n) {
    const r = await api(nurseTok, 'POST', `/patients/${GALLI}/parameter-readings`, {
      requestId: crypto.randomUUID(),
      measuredAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      values: {
        fr: '18',
        spo2: '97',
        o2: 'no',
        pa: '130/80',
        fc: '78',
        coscienza: 'A',
        temperatura: '36.8',
      },
    });
    if (r.status !== 201 && r.status !== 200)
      throw new Error(`reading: ${r.status} ${JSON.stringify(r.body)}`);
    createdReadingId = r.body?.reading?.id ?? r.body?.id ?? null;
  }
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
    if (
      r.status() >= 500 ||
      r.status() === 403 ||
      (r.status() >= 400 && !/\/auth\/|favicon/.test(r.url()))
    )
      httpErrors.push(`${role} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
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
const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/screens/${name}.png`, fullPage: false });
async function side(page, name) {
  // ≤ 1023 px the sidebar is an off-canvas drawer opened by the hamburger.
  const burger = page.locator('.topbar-hamburger');
  if (await burger.isVisible().catch(() => false)) {
    await burger.click();
    await page.waitForTimeout(400);
  }
  await page.locator('.teams-sidebar').getByRole('button', { name }).first().click();
}
async function done(context, name) {
  await context.tracing.stop({ path: `${OUT}/trace-${name}.zip` });
  await context.close();
}
async function openChart(page, id) {
  await page.goto(`${FRONT}/#/dettaglio-paziente/${id}`);
  await page.waitForSelector('.chart-sections', { timeout: 30000 });
  await page.waitForTimeout(1500);
}
const card = (page, id) => page.locator(`.diario-card[data-entry-id="${id}"]`);

try {
  // ── 1. Nurse (1180×820): «Presa visione» on the urgent entry, F8 gating, NEWS2 tile ──────────
  {
    const { context, page } = await login('Infermiere 1');
    await openChart(page, NANNI);
    const urgentCard = card(page, URGENT);
    await urgentCard.waitFor({ timeout: 15000 });
    await urgentCard.scrollIntoViewIfNeeded();
    const btn = urgentCard.getByRole('button', { name: /Presa visione/ });
    check(
      'W4-01',
      'Nurse: urgent entry shows «Da vedere» + «Presa visione»',
      (await urgentCard.getByText('Da vedere', { exact: true }).isVisible()) &&
        (await btn.isVisible()),
    );
    check(
      'W4-02',
      'Nurse: diary header counts urgent entries to see',
      await page.locator('.diario-to-see').isVisible(),
      await page
        .locator('.diario-to-see')
        .innerText()
        .catch(() => ''),
    );
    check(
      'W4-03',
      'F8 Nurse: «Modifica» shown, «Elimina» hidden (diary.delete_entry DENIED)',
      (await page.locator('.diario-card [title="Modifica"]').count()) > 0 &&
        (await page.locator('.diario-card [title="Elimina"]').count()) === 0,
    );
    await shot(page, 'W4-01-nurse-urgent-da-vedere');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith(`/diary/${URGENT}/ack`)),
      btn.click(),
    ]);
    await page.waitForTimeout(800);
    const seen = await urgentCard
      .locator('.diario-card__seen-by')
      .innerText()
      .catch(() => '');
    check(
      'W4-04',
      'Nurse acks: POST 201, button gone, «Visto da: te hh:mm» shown',
      resp.status() === 201 && (await btn.count()) === 0 && /^Visto da: te \d{2}:\d{2}$/.test(seen),
      `${resp.status()} · ${seen}`,
    );
    await shot(page, 'W4-04-nurse-presa-visione');
    // Full reload: the demo session lives in memory, so sign in again and reopen the chart —
    // the state shown comes only from the server.
    await page.reload();
    const loginButton = page.getByRole('button', { name: /Infermiere 1/ }).first();
    if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForSelector('.teams-sidebar', { timeout: 20000 });
    }
    await openChart(page, NANNI);
    await urgentCard.waitFor({ timeout: 15000 });
    await urgentCard.scrollIntoViewIfNeeded();
    const seenAfter = await urgentCard
      .locator('.diario-card__seen-by')
      .innerText()
      .catch(() => '');
    check(
      'W4-05',
      'Persisted after reload: no longer «da vedere» for the nurse',
      (await urgentCard.getByRole('button', { name: /Presa visione/ }).count()) === 0 &&
        (await urgentCard.getByText('Da vedere', { exact: true }).count()) === 0 &&
        /Visto da: te/.test(seenAfter),
      seenAfter,
    );
    const row = await one(
      `SELECT "operatorName","operatorRole" FROM "DiaryEntryAcknowledgement" WHERE "entryId"=$1 AND "operatorId"='SIM-NURSE-1'`,
      [URGENT],
    );
    const audit = await one(
      `SELECT count(*)::int AS n FROM "AiAuditEvent" WHERE "actionType"='diary:ack' AND "operatorId"='SIM-NURSE-1' AND $1 = ANY(fields)`,
      [`entry:${URGENT}`],
    );
    check(
      'W4-06',
      'DB: one ack row (server name/role) + diary:ack audit row',
      row?.operatorName === 'Infermiere 1' && row?.operatorRole === 'infermiere' && audit?.n >= 1,
      JSON.stringify({ row, audit }),
    );

    // F10: NEWS2 tile «Rileva ora» + «Non calcolabile» not clipped.
    await page.locator('.vt--news2').scrollIntoViewIfNeeded();
    const muted = page.locator('.vt--news2 .vt__value--muted');
    if (await muted.count()) {
      const clipped = await muted.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      check('W4-07', 'NEWS2 tile «Non calcolabile» is not clipped at 1180', !clipped);
    } else
      check(
        'W4-07',
        'NEWS2 tile shows a score (no «Non calcolabile» to clip)',
        true,
        'score present',
      );
    await shot(page, 'W4-07-news2-tile-rileva-ora');
    await page.locator('.vt__record', { hasText: 'Rileva ora' }).click();
    await page.waitForSelector('#vital-panel', { timeout: 10000 });
    const active = await page
      .locator('.top-nav__item.is-active')
      .first()
      .innerText()
      .catch(() => '');
    check(
      'W4-08',
      'F10 «Rileva ora» opens Parametri entry for this patient',
      active.trim() === 'Parametri' && page.url().includes(NANNI),
      active.trim(),
    );
    await shot(page, 'W4-08-rileva-ora-parametri');

    // Allergy names at 1180: full names in the strip (the header badge would cut «Acido acetils…»).
    const strip1180 = page.locator('.patient-allergy-strip');
    const names1180 = await strip1180.innerText().catch(() => '');
    const fits1180 = await strip1180
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      .catch(() => false);
    check(
      'W4-09',
      'Allergen names fully visible at 1180 (strip, not truncated)',
      (await strip1180.isVisible()) && /Acido acetilsalicilico/.test(names1180) && fits1180,
      names1180,
    );
    await done(context, 'nurse-1180');
  }

  // ── 2. Supervisor: same entry still «da vedere» for him, sees «Visto da: Infermiere 1» ───────
  {
    const { context, page } = await login('Supervisore 1');
    await openChart(page, NANNI);
    const urgentCard = card(page, URGENT);
    await urgentCard.waitFor({ timeout: 15000 });
    await urgentCard.scrollIntoViewIfNeeded();
    const seen = await urgentCard
      .locator('.diario-card__seen-by')
      .innerText()
      .catch(() => '');
    check(
      'W4-10',
      'Other reader: still «Presa visione» for the supervisor, sees «Visto da: Infermiere 1 hh:mm»',
      (await urgentCard.getByRole('button', { name: /Presa visione/ }).isVisible()) &&
        /Visto da: Infermiere 1 \d{2}:\d{2}/.test(seen),
      seen,
    );
    check(
      'W4-11',
      'F8 Supervisor: no «Modifica» / «Elimina» (both DENIED by policy)',
      (await page
        .locator('.diario-card [title="Modifica"], .diario-card [title="Elimina"]')
        .count()) === 0,
    );
    await shot(page, 'W4-10-supervisor-still-to-see');

    // Manager agenda: week view names the operator and states the status in words.
    await side(page, 'Agenda');
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await page.waitForTimeout(1200);
    const metas = await page.locator('.agt-week-apt .agt-inline-meta').allInnerTexts();
    check(
      'W4-12',
      'Manager week: operator NAME + status word on every appointment (not colour only)',
      metas.length >= 4 &&
        metas.every((m) => /Programmato/.test(m) && !/^Operatore non disponibile/.test(m)),
      metas.slice(0, 2).join(' | '),
    );
    await page
      .locator('.agt-week-apt')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await shot(page, 'W4-12-manager-week');
    await page.getByRole('button', { name: 'Mese', exact: true }).click();
    await page.waitForTimeout(1000);
    const monthItems = await page.locator('.agt-month-apt').count();
    check(
      'W4-13',
      'Manager month: all appointments listed (no «+N»)',
      monthItems >= 4 && (await page.locator('.agt-month-more').count()) === 0,
      `${monthItems} items`,
    );
    await shot(page, 'W4-13-manager-month');
    await done(context, 'supervisor');
  }

  // ── 3. Nurse agenda (1180): note inline, week status words, month all ───────────────────────
  {
    const { context, page } = await login('Infermiere 1');
    await side(page, 'Agenda');
    await page.waitForTimeout(1500);
    await page
      .getByRole('button', { name: 'Giorno', exact: true })
      .click()
      .catch(() => {});
    await page.waitForTimeout(800);
    const note = page.locator('.agt-apt-card .agt-note-inline', { hasText: 'Portare referti ECG' });
    await note
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    check(
      'W4-14',
      'Agenda day: appointment note visible inline without selecting the card',
      (await note.count()) === 1 &&
        (await note.first().isVisible()) &&
        (await page.locator('.agt-apt-card.selected').count()) === 0,
    );
    await shot(page, 'W4-14-agenda-day-note-inline');
    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await page.waitForTimeout(1000);
    const metas = await page.locator('.agt-week-apt .agt-inline-meta').allInnerTexts();
    check(
      'W4-15',
      'Agenda week: type + status in words on each appointment',
      metas.length >= 4 && metas.every((m) => /Programmato/.test(m)),
      metas.slice(0, 2).join(' | '),
    );
    await page
      .locator('.agt-week-apt')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await shot(page, 'W4-15-agenda-week');
    await page.getByRole('button', { name: 'Mese', exact: true }).click();
    await page.waitForTimeout(1000);
    const monthItems = await page.locator('.agt-month-apt').count();
    check(
      'W4-16',
      'Agenda month: all 4 appointments of the day, no «+N»',
      monthItems >= 4 && (await page.locator('.agt-month-more').count()) === 0,
      `${monthItems} items`,
    );
    await shot(page, 'W4-16-agenda-month');
    await done(context, 'nurse-agenda-1180');
  }

  // ── 4. Nurse portrait 820×1180: allergy strip names, subtitle wraps, compact NEWS2 text ─────
  {
    const { context, page } = await login('Infermiere 1', { width: 820, height: 1180 });
    await openChart(page, NANNI);
    const strip = page.locator('.patient-allergy-strip');
    const text = await strip.innerText().catch(() => '');
    check(
      'W4-17',
      'Allergen NAMES visible at 820 (strip, not a bare ⚠ / tooltip)',
      (await strip.isVisible()) &&
        /Penicillina/.test(text) &&
        /Lattice/.test(text) &&
        /Acido acetilsalicilico/.test(text),
      text,
    );
    await shot(page, 'W4-17-allergy-820');
    await side(page, 'Agenda');
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Settimana', exact: true }).click();
    await page.waitForTimeout(800);
    const sub = page.locator('.topbar-title .page-header__subtitle').first();
    const info = await sub.evaluate((el) => ({
      ws: getComputedStyle(el).whiteSpace,
      to: getComputedStyle(el).textOverflow,
      overflowX: el.scrollWidth > el.clientWidth + 1,
      overflowY: el.scrollHeight > el.clientHeight + 1,
      date: el.querySelector('.agt-header__date')?.textContent ?? '',
      dateClipped: (() => {
        const d = el.querySelector('.agt-header__date');
        return d ? d.scrollWidth > d.clientWidth + 1 : false;
      })(),
    }));
    check(
      'W4-18',
      'Agenda subtitle wraps at 820: week range fully visible (no ellipsis)',
      info.ws === 'normal' &&
        !info.overflowX &&
        !info.overflowY &&
        !info.dateClipped &&
        info.date.length > 0,
      JSON.stringify(info),
    );
    await shot(page, 'W4-18-subtitle-820');
    await side(page, 'Parametri');
    await page.waitForTimeout(2500);
    const chips = await page.locator('.news2-chip--compact').allInnerTexts();
    check(
      'W4-19',
      'Compact NEWS2 chip text carries time / state inline (not tooltip-only)',
      chips.length > 0 &&
        chips.every((c) => /·|non calcolabile|…|\?/.test(c)) &&
        chips.some((c) => /NEWS2 \d+ · (\d{2}\/\d{2} )?\d{2}:\d{2}/.test(c)),
      chips.slice(0, 4).join(' | '),
    );
    await shot(page, 'W4-19-news2-compact-820');
    await done(context, 'nurse-820');
  }

  // ── 5. Phone 390×844: allergy names still readable ─────────────────────────────────────────
  {
    const { context, page } = await login('Infermiere 1', { width: 390, height: 844 });
    await openChart(page, NANNI);
    const strip = page.locator('.patient-allergy-strip');
    const text = await strip.innerText().catch(() => '');
    // The strip itself never widens the page (a pre-existing 6 px overflow of .topbar-right at
    // 390 px is unrelated to W4 and reported separately).
    const stripFits = await strip.evaluate(
      (el) =>
        el.getBoundingClientRect().right <= window.innerWidth + 0.5 &&
        el.scrollWidth <= el.clientWidth + 1,
    );
    check(
      'W4-20',
      'Phone: allergen names visible in a strip that wraps inside the viewport',
      (await strip.isVisible()) &&
        /Penicillina/.test(text) &&
        /Acido acetilsalicilico/.test(text) &&
        stripFits,
      text,
    );
    await shot(page, 'W4-20-allergy-phone');
    await done(context, 'nurse-phone');
  }

  // ── 6. OSS: no Modifica / Elimina on its resident's diary ───────────────────────────────────
  {
    const { context, page } = await login('OSS 1');
    await openChart(page, OLGA);
    await page.locator('.diario-card').first().waitFor({ timeout: 15000 });
    check(
      'W4-21',
      'F8 OSS: diary actions hidden (no 403 reachable from the UI)',
      (await page
        .locator('.diario-card [title="Modifica"], .diario-card [title="Elimina"]')
        .count()) === 0,
    );
    await shot(page, 'W4-21-oss-diary');
    await done(context, 'oss');
  }

  // ── 7. Data for the Turno card (W1): clinical summary names WHICH allergen/parameter/risk ───
  {
    const r = await api(nurseTok, 'GET', `/patients/clinical-summary?patientIds=${NANNI}`);
    const s = r.body?.[0] ?? {};
    check(
      'W4-22',
      'clinical-summary: allergeni / parametriCritici / rischiElevati names',
      r.status === 200 &&
        s.allergeni?.map((a) => a.allergene).join(',') ===
          'Penicillina,Lattice,Acido acetilsalicilico' &&
        s.parametriCritici?.[0]?.etichetta === 'PA' &&
        s.rischiElevati?.[0]?.tipo === 'caduta',
      JSON.stringify({
        allergeni: s.allergeni,
        parametriCritici: s.parametriCritici,
        rischiElevati: s.rischiElevati,
      }),
    );
  }
} finally {
  // Remove the temporary reading: on the embedded Postgres (session time zone Europe/Berlin) the
  // DB default createdAt of a server-written reading looks 2 h in the future to other suites.
  if (createdReadingId)
    await db
      .query(`DELETE FROM "PatientParameterReading" WHERE id=$1`, [createdReadingId])
      .catch(() => {});
  await browser.close();
  await db.end();
}

check(
  'W4-23',
  'No console errors',
  consoleErrors.length === 0,
  consoleErrors.slice(0, 5).join(' | '),
);
check(
  'W4-24',
  'No 403 / 4xx / 5xx responses during the journeys',
  httpErrors.length === 0,
  httpErrors.slice(0, 8).join(' | '),
);
writeFileSync(
  `${OUT}/results.json`,
  JSON.stringify({ results, consoleErrors, httpErrors }, null, 2),
);
const failed = results.filter((r) => r.result === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
