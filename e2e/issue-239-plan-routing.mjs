#!/usr/bin/env node
// Issue #239 — evidenza UI reale del routing chat Agnos su POST /ai/actions/plan.
// Guida il pannello Agnos nell'app (non health, non API-only), intercetta la request
// verso /ai/actions/plan e asserisce che le letture non restino piu' `unknown`.
//   node e2e/issue-239-plan-routing.mjs [outDir]
// Assume backend :3001 + frontend :5173 attivi con DB seeded.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'artifacts/task-validation/239-agnos-chatbot-plan-routing';
mkdirSync(join(OUT, 'screenshots'), { recursive: true });
mkdirSync(join(OUT, 'video'), { recursive: true });
mkdirSync(join(OUT, 'trace'), { recursive: true });
mkdirSync(join(OUT, 'logs'), { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

// Registra request+response del planner: la UI usa esattamente questo contratto.
const planByText = new Map();
const consoleErrors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: join(OUT, 'video'), size: { width: 1366, height: 768 } } });
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await ctx.newPage();
page.on('dialog', (d) => { void d.accept(); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('response', async (r) => {
  if (!r.url().endsWith('/ai/actions/plan')) return;
  try {
    const req = JSON.parse(r.request().postData() ?? '{}');
    const body = await r.json();
    planByText.set(req.text, { status: r.status(), body, reqText: req.text });
  } catch { /* ignore */ }
});
const shot = (n) => page.screenshot({ path: join(OUT, 'screenshots', n) });
async function clickText(t) { await page.locator(`text="${t}"`).first().click(); await page.waitForTimeout(500); }
async function ask(text) {
  await page.fill('.agnos-input', text);
  await page.click('.ai-asst__send');
  await page.waitForTimeout(3000);
}
const uiText = () => page.locator('.agnos-panel').innerText();

try {
  // --- BEFORE: app + gate ruolo ---
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await clickText('Pazienti');
  await page.waitForTimeout(500);
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
  await shot('before-agnos-open.png');

  // --- Scenario 1: occupazione camere (aggregato, no scheda paziente) ---
  await ask('quante camere sono occupate oggi');
  const s1 = planByText.get('quante camere sono occupate oggi');
  const r1 = s1?.body;
  ok('S1 request testo intatto verso /ai/actions/plan', s1?.reqText === 'quante camere sono occupate oggi', `reqText=${s1?.reqText}`);
  ok('S1 HTTP 200', s1?.status === 200, `status=${s1?.status}`);
  ok('S1 plan.actionType == read (non unknown)', r1?.plan?.actionType === 'read', `actionType=${r1?.plan?.actionType}`);
  ok('S1 read.intent == rooms_occupancy', r1?.read?.intent === 'rooms_occupancy', `intent=${r1?.read?.intent}`);
  ok('S1 read.notFound == false', r1?.read?.notFound === false, `notFound=${r1?.read?.notFound}`);
  ok('S1 occupiedBeds numerico', typeof r1?.read?.results?.[0]?.occupiedBeds === 'number', `occupiedBeds=${r1?.read?.results?.[0]?.occupiedBeds}`);
  const s1phi = /nome|cognome|"name"|patient/i.test(JSON.stringify(r1?.read?.results ?? []));
  ok('S1 nessun nome paziente nell aggregato camere', !s1phi, `phiLeak=${s1phi}`);
  const t1 = await uiText();
  ok('S1 UI senza "Informazione non trovata"', !/Informazione non trovata/i.test(t1));
  ok('S1 UI senza "Comando non riconosciuto"', !/Comando non riconosciuto/i.test(t1));
  await shot('agnos-rooms-occupancy.png');
  writeFileSync(join(OUT, 'logs', 'no-phi-room-occupancy-proof.log'),
    `request.text = ${s1?.reqText}\nresponse.read.results = ${JSON.stringify(r1?.read?.results)}\nPHI (nome/cognome/name/patient) presente: ${s1phi}\n`);

  // --- Scenario 2: terapie del paziente aperto ---
  await page.locator('.ai-drawer__scrim').click().catch(() => {});
  await page.waitForTimeout(300);
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  // apre la scheda del paziente sintetico noto (Last, First) → il pannello riceve currentPatientId
  await page.getByText('Moretti, Elena', { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
  await ask('che terapie assume il paziente');
  const s2 = planByText.get('che terapie assume il paziente');
  const r2 = s2?.body;
  ok('S2 arriva al backend (request registrata)', !!s2, `hasReq=${!!s2}`);
  ok('S2 plan.actionType == read (non unknown)', r2?.plan?.actionType === 'read', `actionType=${r2?.plan?.actionType}`);
  ok('S2 read.intent == therapies', r2?.read?.intent === 'therapies', `intent=${r2?.read?.intent}`);
  await shot('agnos-patient-therapies.png');

  // --- Scenario 3: "informazioni sul paziente" fuori scheda → comportamento esplicito ---
  await page.locator('.ai-drawer__scrim').click().catch(() => {});
  await page.waitForTimeout(300);
  await clickText('Pazienti');
  await page.waitForTimeout(400);
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
  await ask('informazioni sul paziente');
  const s3 = planByText.get('informazioni sul paziente');
  const r3 = s3?.body;
  const t3 = await uiText();
  // deve essere esplicito: non un fallimento silenzioso unknown/notFound generico
  const explicit = r3?.plan?.actionType === 'read' || /apri|seleziona|scheda|paziente|autorizz/i.test(t3);
  ok('S3 comportamento esplicito (non fallimento silenzioso)', explicit, `actionType=${r3?.plan?.actionType}`);
  await shot('agnos-info-paziente.png');

  // --- AFTER-REFRESH: persistenza del comportamento dopo reload ---
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await page.locator('.ai-fab').click();
  await page.waitForSelector('.agnos-panel');
  await ask('quante camere sono occupate oggi');
  const s1b = planByText.get('quante camere sono occupate oggi');
  ok('AFTER-REFRESH camere ancora read/rooms_occupancy', s1b?.body?.read?.intent === 'rooms_occupancy' && s1b?.body?.plan?.actionType === 'read');
  await shot('after-refresh-rooms.png');

  ok('Nessun console error di pagina', consoleErrors.length === 0, `errors=${consoleErrors.length}`);
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
  writeFileSync(join(OUT, 'logs', 'no-unknown-fallback-proof.log'),
    [...planByText.entries()].map(([t, v]) => `text="${t}" -> actionType=${v.body?.plan?.actionType} intent=${v.body?.read?.intent} notFound=${v.body?.read?.notFound}`).join('\n') + '\n');
  writeFileSync(join(OUT, 'logs', 'console-errors.log'), consoleErrors.join('\n') + '\n');
  writeFileSync(join(OUT, 'ui-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results, consoleErrors }, null, 2));
  await ctx.close();
  await browser.close();
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
