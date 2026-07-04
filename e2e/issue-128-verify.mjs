// Issue #128 — verifica E2E: camera assegnata deve risultare occupata (AC1-AC4).
// Richiede: backend :3001 con stanze seed (101 doppia, 102 singola, 103 singola), frontend buildato.
//   node e2e/issue-128-verify.mjs <outDir>
// Env: CLINICOS_FRONTEND (default http://localhost:5174), CLINICOS_API (default http://localhost:3001)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5174';
const API = process.env.CLINICOS_API ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? 'docs/qa/issues/128/final';
mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (n, c, d = '') => { results.push({ n, c }); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };
const j = async (url, opts) => { const r = await fetch(url, opts); return { status: r.status, body: r.status === 204 ? null : await r.json().catch(() => null) }; };

// ── Setup dati di test (idempotente): 2 pazienti demo, nessuna assegnazione attiva ──
async function ensurePatient(firstName, lastName) {
  const pts = (await j(`${API}/patients`)).body;
  let p = pts.find(x => x.lastName === lastName);
  if (!p) {
    p = (await j(`${API}/patients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, dateOfBirth: '1958-04-12' }),
    })).body;
  }
  // pulizia: rimuove assegnazioni + camera in cartella per rendere il run ripetibile
  const assigns = (await j(`${API}/patients/${p.id}/room-assignments`)).body ?? [];
  for (const a of assigns) await fetch(`${API}/patients/${p.id}/room-assignments/${a.id}`, { method: 'DELETE' });
  const cart = (await j(`${API}/patients/${p.id}/cartella`)).body;
  if (cart?.data?.cameraNumero || cart?.data?.lettoNumero) {
    const { cameraNumero: _c, lettoNumero: _l, ...rest } = cart.data;
    await fetch(`${API}/patients/${p.id}/cartella`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rest }),
    });
  }
  return p;
}

const paz1 = await ensurePatient('Verifica', 'Camera128');
const paz2 = await ensurePatient('Controllo', 'Camera128B');

// camera bersaglio: una singola completamente libera (così dopo l'assegnazione è tutta occupata)
const roomsPre = (await j(`${API}/admin/rooms`)).body;
const target = roomsPre.find(r => r.stato === 'attiva' && r.beds.length === 1 && r.beds.every(b => b.assignments.length === 0 && b.stato !== 'manutenzione'));
if (!target) { console.error('Nessuna camera singola libera disponibile per il test'); process.exit(1); }
console.log(`Camera bersaglio: ${target.numero} (${target.reparto}) — paziente: ${paz1.lastName}`);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
p.on('dialog', d => d.accept());
const pageErrors = [];
p.on('pageerror', e => pageErrors.push(e.message));
const shot = n => p.screenshot({ path: resolve(OUT, n) });

async function loginOperatore() {
  await p.goto(FRONTEND, { waitUntil: 'networkidle' });
  await p.getByText('Operatore', { exact: true }).click(); await p.waitForTimeout(1200);
}
async function apriPaziente(lastName) {
  await p.getByText('Pazienti').first().click(); await p.waitForTimeout(900);
  // match esatto "Cognome, Nome" per non confondere Camera128 con Camera128B
  await p.getByText(new RegExp(`^${lastName},`)).first().click(); await p.waitForTimeout(1200);
}
async function apriModalCamera() {
  await p.locator('.cr-quick-stat--camera').click(); await p.waitForTimeout(600);
}

// ── Assegnazione dalla scheda paziente (modal Camera) ────────────────────────
await loginOperatore();
await apriPaziente('Camera128');
await apriModalCamera();
await shot('modal-camera-view.png');
await p.getByText('Modifica assegnazione').click(); await p.waitForTimeout(400);
const camSelect = p.locator('.modal-box select').first();
await camSelect.selectOption(target.numero);
await p.locator('.modal-box input.form-input').fill('A');
await p.locator('.modal-box select').nth(1).selectOption('ricoverato');
await shot('modal-camera-edit.png');
await p.getByRole('button', { name: 'Salva' }).click(); await p.waitForTimeout(2000);
await shot('after-save-detail.png');

// ── AC1: camera occupata + paziente associato (persistenza reale) ───────────
const occ1 = (await j(`${API}/admin/rooms/occupancy`)).body;
const room1 = occ1.rooms.find(r => r.numero === target.numero);
const bedOcc = room1?.beds?.find(x => x.occupied);
ok('AC1: letto della camera risulta occupato (API occupancy)', Boolean(bedOcc));
ok('AC1: paziente associato al letto', bedOcc?.currentAssignment?.patient?.lastName === 'Camera128',
  bedOcc?.currentAssignment?.patient?.lastName ?? 'nessuna assegnazione');
const assigns1 = (await j(`${API}/patients/${paz1.id}/room-assignments`)).body ?? [];
ok('AC1: assegnazione attiva persistita per il paziente', assigns1.some(a => a.endDate === null && a.bed?.room?.numero === target.numero));

// ── AC2: camera non più proposta come libera per un altro paziente ──────────
await p.getByText(/^(Pazienti|Torna|←)/).first().click().catch(() => {});
await loginOperatore();
await apriPaziente('Camera128B');
await apriModalCamera();
await p.getByText('Modifica assegnazione').click(); await p.waitForTimeout(400);
const options2 = await p.locator('.modal-box select').first().locator('option').allTextContents();
ok('AC2: camera occupata NON proposta per un altro paziente', !options2.some(o => o.startsWith(`${target.numero} `)),
  `opzioni: ${options2.join(' | ')}`);
await shot('ac2-select-altro-paziente.png');
await p.getByRole('button', { name: 'Annulla' }).click().catch(() => {});

// ── AC3: coerenza dopo refresh completo ─────────────────────────────────────
await loginOperatore();
await apriPaziente('Camera128');
const bodyTxt = (await p.textContent('body')) ?? '';
ok('AC3: dopo refresh la scheda paziente mostra la camera', bodyTxt.includes(target.numero));
const occ2 = (await j(`${API}/admin/rooms/occupancy`)).body;
const room2 = occ2.rooms.find(r => r.numero === target.numero);
ok('AC3: dopo refresh la camera resta occupata (API)', Boolean(room2?.beds?.some(x => x.occupied)));
await shot('after-refresh.png');

// ── AC4: coerenza tra viste (scheda paziente / Posti Letto admin) ────────────
await p.goto(FRONTEND, { waitUntil: 'networkidle' });
await p.getByText('Amministratore', { exact: true }).click(); await p.waitForTimeout(1200);
await p.getByText('Posti Letto').first().click(); await p.waitForTimeout(1500);
const postiTxt = (await p.textContent('body')) ?? '';
const occStat = await p.locator('.occupancy-stats').textContent().catch(() => '');
ok('AC4: vista Posti Letto conta almeno 1 letto occupato', !/(^|\D)0\s*Occupati/.test(occStat ?? ''), (occStat ?? '').slice(0, 80));
ok('AC4: vista Posti Letto mostra il paziente assegnato', postiTxt.includes('Camera128'));
await shot('posti-letto.png');

ok('nessun pageerror in tutta la sessione', pageErrors.length === 0, pageErrors[0] ?? '');
await b.close();
console.log(`\n${results.filter(r => r.c).length}/${results.length} PASS`);
process.exit(results.every(r => r.c) ? 0 : 1);
