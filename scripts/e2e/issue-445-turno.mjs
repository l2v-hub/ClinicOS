// #445 — Turno infermiere: blocchi per paziente e orario, «Somministra N» sul posto con elenco di
// conferma, allergie visibili, ritardi in ore, niente contatori/spiegazioni in alto, «Ho capito» sul
// posto. Registra davvero sul DB locale e verifica dopo il reload.
// LOCAL synthetic stack only (backend AUTH_MODE=demo + simulator, DB seeded with Nanni Miriam).
// Usage (repo root): DATABASE_URL=<local DB> [TRACE=1] node scripts/e2e/issue-445-turno.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import pg from 'pg';

const FRONT = process.env.FRONT ?? 'http://127.0.0.1:5211';
const API = process.env.API ?? 'http://127.0.0.1:3111';
const OUT =
  process.argv[2] ?? 'artifacts/task-validation/445-turno-infermiere-somministra-sul-posto';
const DB = process.env.DATABASE_URL;
if (!DB || !/127\.0\.0\.1|localhost/.test(DB)) throw new Error('DATABASE_URL must be a LOCAL DB');
for (const d of ['screenshots', 'trace', 'test-results'])
  mkdirSync(`${OUT}/${d}`, { recursive: true });

const db = new pg.Client({ connectionString: DB });
await db.connect();
const results = [];
const consoleErrors = [];
const writes = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();

// Fixture AC6: una consegna urgente scritta da un collega (Medico 1), da prendere in carico dal Turno.
const MARK = `E2E-445 ${Date.now()}`;
const nanni = (
  await db.query(`SELECT id FROM "Patient" WHERE "medicalRecordNumber"='DEMO-P10-Miriam-Nanni'`)
).rows[0]?.id;
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  let auth = null;
  p.on('request', (r) => {
    const h = r.headers().authorization;
    if (h && r.url().startsWith(API)) auth = h;
  });
  await p.goto(FRONT);
  await p
    .getByRole('button', { name: /Medico 1/ })
    .first()
    .click();
  await p.waitForSelector('.teams-sidebar', { timeout: 30000 });
  await p.waitForTimeout(1500);
  const res = await fetch(`${API}/consegne`, {
    method: 'POST',
    headers: { authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pazienteId: nanni,
      priorita: 'urgente',
      tipo: 'Monitoraggio',
      note: `${MARK} febbre 39,2 °C: rivalutare entro 2 ore`,
    }),
  });
  console.log('fixture: urgent consegna by Medico 1 →', res.status);
  await ctx.close();
}

const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
});
if (process.env.TRACE) await context.tracing.start({ screenshots: true, snapshots: true });
// CLOCK=<ISO>: ora del browser fissata (es. dopo mezzanotte nessuna dose è ancora in ritardo).
if (process.env.CLOCK) await context.clock.setFixedTime(new Date(process.env.CLOCK));
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    consoleErrors.push(m.text().slice(0, 240));
});
page.on('request', (r) => {
  if (r.method() === 'POST' && r.url().startsWith(API) && /therapy-slots|\/ack$/.test(r.url()))
    writes.push({ url: new URL(r.url()).pathname, body: r.postDataJSON?.() ?? null });
});
const shot = (name) => page.screenshot({ path: `${OUT}/screenshots/${name}.png` });

await page.goto(FRONT);
await page
  .getByRole('button', { name: /Infermiere 1/ })
  .first()
  .click();
await page.waitForSelector('.teams-sidebar', { timeout: 30000 });
await page.waitForSelector('.adesso-queue', { timeout: 30000 });
await page.waitForTimeout(3000);
await shot('01-turno');

// AC5 — sopra la piega: niente contatori, nota esplicativa né «Chiudi tutte».
const fold = await page.evaluate(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top < innerHeight;
  };
  const text = [...document.querySelectorAll('.page-content *')]
    .filter((el) => el.children.length === 0 && visible(el))
    .map((el) => el.textContent.trim())
    .join(' | ');
  return {
    kpiBand: !!document.querySelector('.dashboard-kpi-band'),
    note: /Non dimessi: pazienti senza dimissione|Ordine operativo/.test(text),
    bulk: !!document.querySelector('.widget-group-controls'),
    chips: [...document.querySelectorAll('.turno-action-chip')].map((c) => c.textContent.trim()),
    chipsAreButtons: [...document.querySelectorAll('.turno-action-chip')].every(
      (c) => c.tagName === 'BUTTON' || /non disponibil|non riuscita/.test(c.textContent),
    ),
  };
});
check(
  'AC5',
  'no counters, notes or bulk toggle above the fold',
  !fold.kpiBand && !fold.note && !fold.bulk,
  JSON.stringify({ kpiBand: fold.kpiBand, note: fold.note, bulk: fold.bulk }),
);
check(
  'AC5b',
  'top signals are action buttons',
  fold.chips.length > 0 && fold.chipsAreButtons,
  fold.chips.join(' · '),
);

// AC4 — nessun ritardo in minuti oltre i 90.
const minutes = await page.evaluate(() =>
  [...(document.querySelector('.turno-grid')?.innerText.matchAll(/(\d+)\s*min\b/g) ?? [])].map(
    (m) => Number(m[1]),
  ),
);
check(
  'AC4',
  'no delay shown in minutes beyond 90',
  minutes.every((m) => m <= 90),
  `minutes seen: ${JSON.stringify(minutes)}`,
);

// AC1 + AC3 — blocchi per paziente e fascia, un solo «Somministra N», allergie in ogni blocco.
const blocks = await page.evaluate(() =>
  [...document.querySelectorAll('.adesso-dose__block')].map((b) => ({
    who: b.querySelector('.adesso-dose__who strong')?.textContent.trim(),
    drugs: b.querySelectorAll('.adesso-dose__drugs li').length,
    buttons: [...b.querySelectorAll('button')]
      .filter((x) => /^Somministra/.test(x.textContent.trim()))
      .map((x) => x.textContent.trim()),
    allergy: b.querySelector('.adesso-dose__allergy')?.textContent.trim() ?? null,
  })),
);
writeFileSync(`${OUT}/test-results/blocks-before.json`, JSON.stringify(blocks, null, 2));
const keys = blocks.map((b) => b.who);
check(
  'AC1',
  'one block per patient and band with one Somministra N',
  blocks.length > 0 &&
    blocks.every((b) => b.buttons.length <= 1) &&
    blocks.some((b) => b.drugs >= 2 && b.buttons[0] === `Somministra ${b.drugs}`),
  JSON.stringify(blocks.map((b) => `${b.who}:${b.drugs}:${b.buttons[0] ?? '-'}`)),
);
check(
  'AC3',
  'allergy state visible in every patient block',
  blocks.every((b) => b.allergy),
  JSON.stringify(blocks.map((b) => b.allergy)),
);

// AC2 — «Somministra N» sul blocco con più dosi: elenco, una rifiutata, Conferma, nessun cambio pagina.
// Il pulsante sparisce quando il pannello si apre: il blocco si fissa per posizione.
const targetIndex = blocks.findIndex((b) => /^Somministra \d+$/.test(b.buttons[0] ?? ''));
const target = page.locator('.adesso-dose__block').nth(targetIndex);
const who = (await target.locator('.adesso-dose__who strong').textContent()).trim();
const n = Number(
  (await target.locator('button', { hasText: /^Somministra \d+$/ }).textContent()).match(/\d+/)[0],
);
const patient = (
  await db.query(
    `SELECT id FROM "Patient" WHERE "lastName" || ' ' || "firstName" = $1 OR "firstName" || ' ' || "lastName" = $1 OR "lastName" || ', ' || "firstName" = $1`,
    [who],
  )
).rows[0];
const urlBefore = page.url();
await target.locator('button', { hasText: /^Somministra \d+$/ }).click();
const panel = target.locator('.turno-dose-panel');
await panel.waitFor();
const rows = await panel.locator('.turno-dose-panel__row').count();
const checked = await panel.locator('input[type=checkbox]:checked').count();
check(
  'AC2a',
  'panel lists the N doses, all pre-checked',
  rows === n && checked === n,
  `rows ${rows}, checked ${checked}, N ${n}`,
);
// la seconda dose: rifiutata dal paziente
await panel
  .getByRole('button', { name: /^Altro esito:/ })
  .nth(1)
  .click();
await panel.getByRole('button', { name: 'Rifiutata dal paziente' }).click();
await shot('02-pannello');
writes.length = 0;
await panel.getByRole('button', { name: /^Conferma/ }).click();
await page.waitForTimeout(3500);
await shot('03-dopo-conferma');
const urlAfter = page.url();
const stillThere = await page.locator('.adesso-dose__who strong', { hasText: who }).count();
check(
  'AC2b',
  'Conferma records in place (no page change) through the giro endpoints',
  urlAfter === urlBefore &&
    writes.length === n &&
    writes.filter((w) => w.url === '/therapy-slots/confirm').length === n - 1 &&
    writes.filter((w) => w.url === '/therapy-slots/not-administered').length === 1 &&
    writes.every((w) => w.body?.confirmed === true && !('farmacoNome' in (w.body ?? {}))),
  JSON.stringify(writes.map((w) => w.url)),
);
const doseKeys = writes.map((w) => w.body);
const rowsDb = (
  await db.query(
    `SELECT "therapyId", date, fascia, ora, stato, motivo, "operatoreNome" FROM "MedicationAdministration"
     WHERE "patientId" = $1 AND date = $2 AND fascia = $3 AND "therapyId" = ANY($4)`,
    [patient?.id, doseKeys[0]?.date, doseKeys[0]?.fascia, doseKeys.map((d) => d.therapyId)],
  )
).rows;
writeFileSync(
  `${OUT}/test-results/db-after.json`,
  JSON.stringify({ who, patientId: patient?.id, writes, rowsDb }, null, 2),
);
check(
  'AC2c',
  'DB holds one erogata per confirmed dose and the refused one as non_erogata',
  rowsDb.filter((r) => r.stato === 'erogata').length === n - 1 &&
    rowsDb.filter((r) => r.stato === 'non_erogata' && r.motivo === 'rifiutata_paziente').length ===
      1,
  JSON.stringify(rowsDb.map((r) => `${r.stato}${r.motivo ? ':' + r.motivo : ''}`)),
);

// Persistenza: dopo il reload il blocco di quella fascia non torna.
await page.reload();
// la sessione del simulatore non sopravvive al reload: si rientra con lo stesso ruolo
const picker = page.getByRole('button', { name: /Infermiere 1/ }).first();
// isVisible non attende: si aspetta davvero il selettore dei ruoli o la coda, quale arriva prima.
await Promise.race([
  picker.waitFor({ timeout: 15000 }),
  page.waitForSelector('.adesso-queue', { timeout: 15000 }),
]).catch(() => {});
if (await picker.isVisible()) await picker.click();
await page.waitForSelector('.adesso-queue', { timeout: 30000 });
await page.waitForTimeout(3000);
const afterReload = await page.evaluate(() =>
  [...document.querySelectorAll('.adesso-dose__block')].map((b) => ({
    who: b.querySelector('.adesso-dose__who strong')?.textContent.trim(),
    drugs: [...b.querySelectorAll('.adesso-dose__drugs li')].map((li) => li.textContent.trim()),
  })),
);
await shot('04-dopo-reload');
const recordedDrugs = rowsDb.length;
check(
  'AC2d',
  'after reload the recorded doses are gone from the queue',
  blocks.length - afterReload.length >= 1 ||
    afterReload.reduce((s, b) => s + b.drugs.length, 0) <=
      blocks.reduce((s, b) => s + b.drugs, 0) - recordedDrugs,
  `blocks ${blocks.length} → ${afterReload.length}; still: ${JSON.stringify(afterReload.map((b) => b.who))}; before had ${keys.length}`,
);

// AC6 — «Ho capito» sul posto nella colonna «Da leggere».
const ack = page
  .locator('.turno-handovers')
  .getByRole('button', { name: /^Ho capito/ })
  .first();
if ((await ack.count()) > 0) {
  writes.length = 0;
  const chipBefore = fold.chips.find((c) => /urgen/.test(c)) ?? null;
  await ack.click();
  await page.waitForTimeout(2500);
  await shot('05-ho-capito');
  const chipAfter = await page.evaluate(
    () =>
      [...document.querySelectorAll('.turno-action-chip')]
        .map((c) => c.textContent.trim())
        .find((c) => /urgen/.test(c)) ?? null,
  );
  check(
    'AC6',
    '«Ho capito» from the Turno uses /consegne/:id/ack and clears the urgency',
    writes.length === 1 &&
      /\/consegne\/[^/]+\/ack$/.test(writes[0].url) &&
      chipAfter !== chipBefore,
    `${writes.map((w) => w.url).join(',')} · chip ${chipBefore} → ${chipAfter}`,
  );
} else {
  check(
    'AC6',
    '«Ho capito» from the Turno',
    false,
    'no urgent handover to take charge of in this seed',
  );
}

if (process.env.TRACE) await context.tracing.stop({ path: `${OUT}/trace/turno-1180x820.zip` });
await browser.close();
await db.end();
const pass = results.every((r) => r.result === 'PASS');
writeFileSync(
  `${OUT}/test-results/turno-${process.env.LABEL ?? 'run'}.json`,
  JSON.stringify({ pass, results, consoleErrors }, null, 2),
);
console.log(pass ? 'PASS #445' : 'FAIL #445', '| console errors:', consoleErrors.length);
process.exit(pass ? 0 : 1);
