// #446 — Turno per ruolo sullo stesso stato dei dati: medico («Serve una tua decisione», nessuna
// somministrazione), OSS (urgenze altrui in cima con «Ho capito», giro parametri «X di N» con
// «Rileva»), infermiere (Turno #445). Badge Consegne = totale «Da leggere» per ognuno. «Niente in
// sospeso» solo quando tutte le fonti dicono niente (verificato anche con le fonti a zero).
// LOCAL synthetic stack only (backend AUTH_MODE=demo + simulator, DB seeded with Nanni Miriam).
// Usage (repo root): DATABASE_URL=<local DB> [TRACE=1] node scripts/e2e/issue-446-turno-ruoli.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const API = process.env.API ?? 'http://127.0.0.1:3111';
const OUT = process.argv[2] ?? 'artifacts/task-validation/446-turno-per-ruolo-medico-oss';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
for (const d of ['screenshots', 'trace', 'test-results'])
  mkdirSync(`${OUT}/${d}`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const nanni = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
const results = [];
const consoleErrors = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};
const browser = await chromium.launch();
/** Una pagina della coda coerente con la validazione del client: conteggi per paziente ricalcolati. */
const queuePage = (body, entries, more) => {
  const counts = new Map();
  for (const e of entries) counts.set(e.patientId, (counts.get(e.patientId) ?? 0) + 1);
  return {
    ...body,
    entries,
    filteredUnread: entries.length,
    hasMore: more,
    nextCursor: more ? 'qa-page-2' : null,
    patientCounts: [...counts].map(([patientId, total]) => ({ patientId, total })),
  };
};

async function login(role, routes = async () => {}) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
  });
  if (process.env.TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  await routes(page);
  let auth = null;
  page.on('request', (r) => {
    if (r.headers().authorization && r.url().startsWith(API)) auth = r.headers().authorization;
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      consoleErrors.push(`${role}: ${m.text().slice(0, 200)}`);
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(role) })
    .first()
    .click();
  await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await page.waitForTimeout(4000);
  return { context, page, auth: () => auth };
}
const state = (page) =>
  page.evaluate(() => {
    const badge = [...document.querySelectorAll('.teams-sidebar button, .teams-sidebar a')]
      .find((el) => /Consegne/.test(el.textContent))
      ?.querySelector('.teams-sidebar__badge')
      ?.textContent.trim();
    return {
      badge: badge ? Number(badge) : 0,
      daLeggere: Number(
        document.querySelector('[data-unread-total]')?.getAttribute('data-unread-total') ?? 0,
      ),
      daLeggereIds: [...document.querySelectorAll('.turno-handovers [data-unread-id]')].map((e) =>
        e.getAttribute('data-unread-id'),
      ),
      urgentiIds: [
        ...document.querySelectorAll(
          '.turno-urgente[data-unread-id], .turno-decisione[data-unread-id]',
        ),
      ].map((e) => e.getAttribute('data-unread-id')),
      urgentiTop: document.querySelector('.turno-urgenti')
        ? document.querySelector('.turno-urgenti').getBoundingClientRect().top <
          (document.querySelector('.turno-grid')?.getBoundingClientRect().top ?? Infinity)
        : null,
      decisioni: [...document.querySelectorAll('.turno-decisione__kind')].map((e) =>
        e.textContent.trim(),
      ),
      giro: document.querySelector('.turno-giro h2')?.textContent.trim() ?? null,
      giroFirst: document.querySelector('.turno-giro__row')?.textContent.trim() ?? null,
      rileva: [...document.querySelectorAll('.turno-giro button')].filter((b) =>
        /^Rileva$/.test(b.textContent.trim()),
      ).length,
      somministra: [...document.querySelectorAll('button')].filter((x) =>
        /^Somministra/.test(x.textContent.trim()),
      ).length,
      adesso: !!document.querySelector('.adesso-queue'),
      niente:
        !!document.querySelector('.turno-niente') ||
        /Niente in sospeso/.test(document.body.innerText),
    };
  });

// Fixture: un'urgenza dell'infermiere (per medico e OSS) — una voce altrui da prendere in carico.
const MARK = `E2E-446 ${Date.now()}`;
{
  const nurse = await login('Infermiere 1');
  const res = await fetch(`${API}/consegne`, {
    method: 'POST',
    headers: { authorization: nurse.auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: nanni,
      priorita: 'urgente',
      tipo: 'Monitoraggio',
      note: `${MARK} saturazione 89%: rivalutare`,
    }),
  });
  console.log('fixture: urgent consegna by Infermiere 1 →', res.status);
  await nurse.context.close();
}

// ── Medico ───────────────────────────────────────────────────────────────────────────────────────
{
  const { context, page } = await login('Medico 1');
  const s = await state(page);
  await page.screenshot({ path: `${OUT}/screenshots/01-medico.png`, fullPage: true });
  const order = s.decisioni.map((k) =>
    /^Urgente/i.test(k)
      ? 0
      : /Terapia da verificare/i.test(k)
        ? 1
        : /Dosi non registrate/i.test(k)
          ? 2
          : 9,
  );
  check(
    'AC1a',
    'doctor: no administration buttons and no administration queue',
    s.somministra === 0 && !s.adesso,
    JSON.stringify({ somministra: s.somministra, adesso: s.adesso }),
  );
  check(
    'AC1b',
    'doctor: decisions first, ordered urgent → therapy to verify → doses (info)',
    s.decisioni.length > 0 &&
      order[0] === 0 &&
      order.every((v, i) => i === 0 || v >= order[i - 1]) &&
      !order.includes(9),
    JSON.stringify(s.decisioni),
  );
  check(
    'AC4-medico',
    'doctor: sidebar badge equals «Da leggere» total',
    s.badge === s.daLeggere && s.badge > 0,
    `badge ${s.badge} · da leggere ${s.daLeggere}`,
  );
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/medico.zip` });
  await context.close();
}

// ── OSS ──────────────────────────────────────────────────────────────────────────────────────────
{
  const { context, page } = await login('OSS 1');
  const s = await state(page);
  await page.screenshot({ path: `${OUT}/screenshots/02-oss.png`, fullPage: true });
  check(
    'AC2a',
    'OSS: urgent items not taken in charge are on top, with «Ho capito»',
    s.urgentiIds.length > 0 &&
      s.urgentiTop === true &&
      (await page
        .locator('.turno-urgenti')
        .getByRole('button', { name: /^Ho capito/ })
        .count()) === s.urgentiIds.length,
    `${s.urgentiIds.length} urgenti`,
  );
  check(
    'AC2b',
    "OSS: today's vitals round «X di N» with «Rileva», critical first",
    /Giro parametri di oggi · \d+ di \d+/.test(s.giro ?? '') &&
      s.rileva > 0 &&
      /parametro critico/.test(s.giroFirst ?? ''),
    `${s.giro} · first: ${s.giroFirst}`,
  );
  check('AC3a', 'OSS: no «Niente in sospeso» while things are pending', !s.niente);
  check(
    'AC4-oss',
    'OSS: sidebar badge equals «Da leggere» total; badge items visible on the home',
    s.badge === s.daLeggere &&
      s.badge > 0 &&
      s.urgentiIds.length + s.daLeggereIds.length >= Math.min(s.badge, 5),
    `badge ${s.badge} · da leggere ${s.daLeggere} · visibili ${s.urgentiIds.length + s.daLeggereIds.length}`,
  );
  // «Ho capito» sulla prima urgenza: badge e home scendono insieme
  await page
    .locator('.turno-urgenti')
    .getByRole('button', { name: /^Ho capito/ })
    .first()
    .click();
  await page.waitForTimeout(2500);
  const after = await state(page);
  check(
    'AC4-ack',
    'after «Ho capito» badge and home move together',
    after.badge === after.daLeggere && after.urgentiIds.length === s.urgentiIds.length - 1,
    `badge ${s.badge}→${after.badge} · da leggere ${s.daLeggere}→${after.daLeggere} · urgenti ${s.urgentiIds.length}→${after.urgentiIds.length}`,
  );
  // «Rileva» atterra sui parametri del paziente
  await page
    .locator('.turno-giro')
    .getByRole('button', { name: /^Rileva/ })
    .first()
    .click();
  await page.waitForTimeout(2500);
  const tab = await page.evaluate(() =>
    document
      .querySelector('.patient-record-view .top-nav--level2 [role=tab][aria-selected=true]')
      ?.textContent.trim(),
  );
  check(
    'AC2c',
    "«Rileva» opens that patient's Parametri",
    tab === 'Parametri',
    `active tab: ${tab}`,
  );
  await page.screenshot({ path: `${OUT}/screenshots/03-oss-rileva.png` });
  if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/oss.zip` });
  await context.close();
}

// ── QA: note proprie, allineamento live, urgenze oltre la prima pagina, dimessi fuori dal giro ──
{
  const nurse = await login('Infermiere 1');
  const { context, page } = await login('OSS 1');
  // nessun «Letta» sulle note scritte da chi legge (il server le rifiuterebbe: 409)
  const own = await page.evaluate(() =>
    [...document.querySelectorAll('.turno-handovers__item')]
      .filter((li) => /Scritta da te/.test(li.textContent))
      .map(
        (li) =>
          !![...li.querySelectorAll('button')].find((b) => /^Letta$/.test(b.textContent.trim())),
      ),
  );
  check(
    'QA1',
    'own notes show «Scritta da te» and never «Letta»',
    own.every((hasLetta) => !hasLetta),
    `${own.length} own notes`,
  );
  // badge e home restano allineati quando una nota arriva da un collega e la finestra torna attiva
  const before = await state(page);
  const res = await fetch(`${API}/consegne`, {
    method: 'POST',
    headers: { authorization: nurse.auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: nanni,
      priorita: 'normale',
      tipo: 'Monitoraggio',
      note: `${MARK} nota normale`,
    }),
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(3000);
  const after = await state(page);
  check(
    'QA2',
    "a colleague's new note moves badge and home together (focus)",
    res.status === 201 && after.badge === after.daLeggere && after.badge === before.badge + 1,
    `badge ${before.badge}→${after.badge} · home ${before.daLeggere}→${after.daLeggere}`,
  );
  // «Letta» su una nota altrui: nessun errore, badge e home scendono insieme
  const letta = page
    .locator('.turno-handovers')
    .getByRole('button', { name: /^Letta:/ })
    .first();
  if ((await letta.count()) > 0) {
    await letta.click();
    await page.waitForTimeout(2500);
    const read = await state(page);
    const alert = await page.locator('.turno-handovers [role=alert]').count();
    check(
      'QA3',
      "«Letta» on a colleague's note works and keeps badge = home",
      alert === 0 && read.badge === read.daLeggere && read.badge === after.badge - 1,
      `badge ${after.badge}→${read.badge} · alert ${alert}`,
    );
  } else check('QA3', "«Letta» on a colleague's note", false, 'no «Letta» button found');
  await context.close();
  await nurse.context.close();
}
{
  // urgenze solo nella seconda pagina della coda: il Turno le trova lo stesso
  const { context, page } = await login('OSS 1', async (p) => {
    await p.route('**/patients/diary-unread?*', async (r) => {
      const url = new URL(r.request().url());
      if (url.searchParams.get('cursor') === 'qa-page-2') {
        const res = await r.fetch({ url: `${API}/patients/diary-unread?limit=20` });
        const body = await res.json();
        const urgent = body.entries.filter((e) => e.priority === 'urgente');
        return r.fulfill({ response: res, json: queuePage(body, urgent, false) });
      }
      const res = await r.fetch();
      const body = await res.json();
      const normal = body.entries.filter((e) => e.priority !== 'urgente');
      return r.fulfill({ response: res, json: queuePage(body, normal, true) });
    });
  });
  const s = await state(page);
  check(
    'QA4',
    'urgencies beyond the first queue page still reach the top of the Turno',
    s.urgentiIds.length > 0,
    `${s.urgentiIds.length} urgenti`,
  );
  await context.close();
}
{
  // un paziente dimesso non entra nel giro
  let dimesso = null;
  const { context, page } = await login('OSS 1', async (p) => {
    await p.route('**/patients/clinical-summary?*', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      dimesso = body.find((e) => e.patientId !== nanni)?.patientId ?? null;
      return r.fulfill({
        response: res,
        json: body.map((e) => (e.patientId === dimesso ? { ...e, statoRicovero: 'dimesso' } : e)),
      });
    });
  });
  const s = await state(page);
  const total = Number((s.giro ?? '').match(/di (\d+)/)?.[1] ?? -1);
  check(
    'QA5',
    'a discharged patient is not in the vitals round',
    dimesso !== null && total === 4,
    `${s.giro}`,
  );
  await context.close();
}

// ── OSS con tutte le fonti a zero (stub): «Niente in sospeso» compare ───────────────────────────
{
  const { context, page } = await login('OSS 1', async (p) => {
    await p.route('**/patients/diary-unread?*', (r) =>
      r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [],
          totalUnread: 0,
          filteredUnread: 0,
          hasMore: false,
          nextCursor: null,
          patientCounts: [],
        }),
      }),
    );
    await p.route('**/patients/diary-unread-count', (r) =>
      r.fulfill({ contentType: 'application/json', body: '{"unreadCount":0}' }),
    );
    await p.route('**/patients/clinical-summary/overview*', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      return r.fulfill({ response: res, json: { ...body, critici: 0 } });
    });
    await p.route('**/patients/clinical-summary?*', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      return r.fulfill({
        response: res,
        json: body.map((e) => ({ ...e, hasCriticalVitals: false })),
      });
    });
    await p.route('**/patients/parameters/page?*', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      return r.fulfill({
        response: res,
        json: {
          ...body,
          items: body.items.map((i) => ({ ...i, cartella: { ...i.cartella, readingCount: 1 } })),
        },
      });
    });
  });
  const s = await state(page);
  await page.screenshot({ path: `${OUT}/screenshots/04-oss-niente-in-sospeso.png` });
  check(
    'AC3b',
    '«Niente in sospeso» only when nothing to read, no critical vitals, round complete',
    s.niente && s.badge === 0 && s.daLeggere === 0,
    JSON.stringify({ niente: s.niente, badge: s.badge, giro: s.giro }),
  );
  await context.close();
}

// ── Infermiere: il Turno della #445 resta ────────────────────────────────────────────────────────
{
  const { context, page } = await login('Infermiere 1');
  const s = await state(page);
  await page.screenshot({ path: `${OUT}/screenshots/05-infermiere.png`, fullPage: true });
  check(
    'AC5',
    'nurse keeps the #445 Turno (administration queue) and the same «Da leggere» source',
    s.adesso && s.decisioni.length === 0 && s.giro === null && s.badge === s.daLeggere,
    `adesso ${s.adesso} · badge ${s.badge} · da leggere ${s.daLeggere}`,
  );
  await context.close();
}

await browser.close();
await db.end();
const pass = results.every((r) => r.result === 'PASS');
writeFileSync(
  `${OUT}/test-results/turno-ruoli-${process.env.LABEL ?? 'run'}.json`,
  JSON.stringify({ pass, results, consoleErrors }, null, 2),
);
console.log(pass ? 'PASS #446' : 'FAIL #446', '| console errors:', consoleErrors.length);
process.exit(pass ? 0 : 1);
