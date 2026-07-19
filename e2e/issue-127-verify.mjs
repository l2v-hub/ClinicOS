// Issue #127 — verifica E2E: creazione paziente nei DUE flussi (manuale + import scansione).
// Richiede: backend :3001 (AI mock + AI_RUNTIME_URL), runtime :8000, frontend con fix (FRONTEND env).
//   node e2e/issue-127-verify.mjs <outDir>
import { chromium } from 'playwright';
import { writeFixtures } from './fixtures.mjs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5175';
const OUT = process.argv[2] ?? 'docs/qa/issues/127/final';
mkdirSync(OUT, { recursive: true });
const fx = writeFixtures(resolve(tmpdir(), 'clinicos-e2e-fixtures'));
const results = [];
const ok = (n, c, d = '') => {
  results.push({ n, c });
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
p.on('dialog', (d) => d.accept());
const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(e.message));
const shot = (n) => p.screenshot({ path: resolve(OUT, n) });
const avanti = async () => {
  await p
    .getByRole('button', { name: /Avanti|Conferma/i })
    .last()
    .click();
  await p.waitForTimeout(1100);
};

async function login() {
  await p.goto(FRONTEND, { waitUntil: 'networkidle' });
  await p.getByText('Operatore', { exact: true }).click();
  await p.waitForTimeout(1200);
  await p.getByText('Pazienti').first().click();
  await p.waitForTimeout(900);
}

// ── Flusso 1: creazione manuale ──────────────────────────────────────────────
await login();
await p.getByText('Nuovo paziente').first().click();
await p.waitForTimeout(1500);
await p.locator('input[placeholder="Mario"]').fill('Manuale');
await p.locator('input[placeholder="Rossi"]').fill('Verifica127');
await p.locator('input[type="date"]').first().fill('1960-03-03');
await avanti(); // → 2 Ingresso
await p.locator('input[type="date"]').first().fill('2026-07-04');
await p.locator('textarea').first().fill('Ricovero di verifica issue 127');
await avanti(); // → 3 Clinica (punto del crash pre-fix)
ok(
  'manuale: step Clinica renderizza senza crash',
  pageErrors.length === 0 && ((await p.textContent('body')) ?? '').length > 500,
);
await shot('after-step3-clinica.png');
await avanti(); // → 4 Moduli
await avanti(); // → 5 Documenti
await avanti(); // → 6 Verifica
await p
  .getByRole('button', { name: /Crea paziente|Conferma/i })
  .last()
  .click();
await p.waitForTimeout(2500);
await shot('after-manual-created.png');
let pts = await (await fetch('http://localhost:3001/patients')).json();
ok(
  'manuale: paziente persistito nel backend',
  pts.some((x) => x.lastName === 'Verifica127'),
);
ok(
  'manuale: paziente visibile in lista',
  ((await p.textContent('body')) ?? '').includes('Verifica127'),
);

// ── Flusso 2: importazione scansione ─────────────────────────────────────────
await login(); // stato pulito: il wizard manuale resta aperto dopo la creazione
await p.getByText('Importa dimissione').first().click();
await p.waitForTimeout(700);
await p.setInputFiles('input[type=file][multiple]', [fx.pdf, fx.jpg]);
await p.waitForTimeout(1200);
await p.getByRole('button', { name: /Avvia elaborazione/i }).click();
const demo = p.locator('[data-testid="srev-PATIENT_DEMOGRAPHICS"]');
await demo.waitFor({ state: 'visible', timeout: 60000 });
await demo.locator('input[type=text]').nth(0).fill('Import');
await demo.locator('input[type=text]').nth(1).fill('Verifica127B');
await demo.locator('input[type=date]').first().fill('1955-09-09');
await p.getByRole('button', { name: /Crea paziente/i }).click();
await p.waitForTimeout(2500);
ok(
  'import: workspace intake si apre senza crash',
  pageErrors.length === 0 && ((await p.textContent('body')) ?? '').length > 500,
);
await shot('after-import-workspace.png');
// completa il wizard seminato dall'import (anagrafica già presente)
for (let i = 0; i < 6; i++) {
  const fine = await p
    .getByRole('button', { name: /Crea paziente/i })
    .last()
    .isVisible()
    .catch(() => false);
  if (fine) {
    await p
      .getByRole('button', { name: /Crea paziente/i })
      .last()
      .click();
    await p.waitForTimeout(2500);
    break;
  }
  // step 2 richiede data presa in carico + motivo se vuoti
  const dt = p.locator('input[type="date"]').first();
  if ((await dt.isVisible().catch(() => false)) && !(await dt.inputValue()))
    await dt.fill('2026-07-04');
  const ta = p.locator('textarea').first();
  if ((await ta.isVisible().catch(() => false)) && !(await ta.inputValue()))
    await ta.fill('Import verifica 127');
  await avanti();
}
await shot('after-import-created.png');
pts = await (await fetch('http://localhost:3001/patients')).json();
ok(
  'import: paziente persistito nel backend',
  pts.some((x) => x.lastName === 'Verifica127B'),
);

// ── Persistenza dopo refresh ─────────────────────────────────────────────────
await login();
const body = (await p.textContent('body')) ?? '';
ok(
  'persistenza dopo refresh: entrambi in lista',
  body.includes('Verifica127') && body.includes('Verifica127B'),
);
await shot('after-refresh.png');
ok('nessun pageerror in tutta la sessione', pageErrors.length === 0, pageErrors[0] ?? '');

await b.close();
console.log(`\n${results.filter((r) => r.c).length}/${results.length} PASS`);
process.exit(results.every((r) => r.c) ? 0 : 1);
