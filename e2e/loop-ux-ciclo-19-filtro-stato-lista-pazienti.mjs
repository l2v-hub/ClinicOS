// Evidenze a runtime per AC3 / AC-R3 del ciclo 19 ("gli stati mostrati diventano filtri cliccabili"):
// la lista pazienti espone una riga .filter-chips per lo stato di ricovero, e cliccare una chip
// riduce davvero le righe visibili a quello stato (in AND col filtro sesso gia' esistente).
// Contract: artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/
//
// Nessun Postgres disponibile: /patients e /patients/clinical-summary sono mockati con page.route.
//
// Uso: node e2e/loop-ux-ciclo-19-filtro-stato-lista-pazienti.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/screenshots';
mkdirSync(outDir, { recursive: true });

const STATI = [
  ['p1', 'Rossi', 'Mario', 'M', 'ricoverato'],
  ['p2', 'Bianchi', 'Luca', 'M', 'ricoverato'],
  ['p3', 'Verdi', 'Anna', 'F', 'ricoverato'],
  ['p4', 'Neri', 'Sara', 'F', 'ambulatoriale'],
  ['p5', 'Gialli', 'Paolo', 'M', 'ambulatoriale'],
  ['p6', 'Blu', 'Elena', 'F', 'day_hospital'],
  ['p7', 'Viola', 'Marco', 'M', 'dimesso'],
];

const PATIENTS = STATI.map(([id, lastName, firstName, sex], i) => ({
  id,
  firstName,
  lastName,
  sex,
  dateOfBirth: '1960-01-01',
  medicalRecordNumber: `MRN-00${i + 1}`,
  email: null,
  phone: null,
}));

const CLINICAL_SUMMARY = STATI.map(([id, , , , statoRicovero]) => ({
  patientId: id,
  statoRicovero,
  hasCriticalVitals: false,
  hasHighRisk: false,
  allergieCount: 0,
  hasSevereAllergy: false,
  terapieTotali: 0,
  terapieCompletate: 0,
}));

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/patients\/clinical-summary/)) return json(CLINICAL_SUMMARY);
    if (url.match(/\/patients\/settings/)) return json({ deleteEnabled: false });
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json(PATIENTS);
    if (url.match(/\/therapy-slots(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/operators?(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/appointments?(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/consegne(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/rooms|\/camere/) && method === 'GET') return json([]);
    if (/railway|clinicos-backend|localhost:3001/.test(url)) return json([]);
    return route.continue();
  });
}

const esiti = [];
function verifica(nome, condizione, dettaglio = '') {
  esiti.push({ nome, ok: Boolean(condizione), dettaglio });
  console.log(`  ${condizione ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const erroriConsole = [];
  page.on('pageerror', (e) => erroriConsole.push(e.message.slice(0, 140)));
  await mockRoutes(page);

  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator('.login-role-card--operatore').click();
  await page.waitForTimeout(1500);
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Pazienti$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);

  const righe = page.locator('.table-wrap--desktop tbody tr');
  const cards = page.locator('.pt-card-list .pt-list-card');
  const totale = await righe.count();
  verifica('Setup: la tabella mostra tutti i 7 pazienti mockati', totale === 7, `righe: ${totale}`);

  const chipRows = page.locator('.toolbar .filter-chips');
  verifica(
    'La toolbar espone DUE righe di chip (sesso gia esistente + nuovo stato ricovero)',
    (await chipRows.count()) === 2,
    `righe di chip: ${await chipRows.count()}`,
  );

  const chipStato = chipRows.nth(1).locator('.filter-chip');
  const etichette = await chipStato.allInnerTexts();
  verifica(
    'Le chip stato mostrano "Tutti gli stati" + i 4 stati presenti con il conteggio live',
    etichette.join(' | ') ===
      'Tutti gli stati | Ricoverato (3) | Ambulatoriale (2) | Day Hospital (1) | Dimesso (1)',
    etichette.join(' | '),
  );

  await page.screenshot({ path: resolve(outDir, 'ac3-01-chip-stato-lista.png'), fullPage: false });

  // Click su "Ricoverato (3)" -> la lista scende a 3 righe (tabella E card mobile).
  await chipStato.filter({ hasText: 'Ricoverato' }).first().click();
  await page.waitForTimeout(400);
  const dopoRicoverato = await righe.count();
  const dopoRicoveratoCards = await cards.count();
  verifica(
    'CRITICO: click su "Ricoverato" riduce la tabella da 7 a 3 righe',
    dopoRicoverato === 3,
    `righe: ${dopoRicoverato}`,
  );
  verifica(
    'Anche la card list mobile (stesso array filtrato) scende a 3 elementi',
    dopoRicoveratoCards === 3,
    `card: ${dopoRicoveratoCards}`,
  );
  const soloRicoverati = (
    await page.locator('.table-wrap--desktop tbody .stato-pill').allInnerTexts()
  ).every((t) => t.trim().toLowerCase() === 'ricoverato'); // il pill e' uppercase via CSS
  verifica('Tutte le righe visibili hanno il badge "Ricoverato"', soloRicoverati);
  verifica(
    'La chip cliccata riceve lo stato .active',
    (await chipStato.filter({ hasText: 'Ricoverato' }).first().getAttribute('class')).includes(
      'active',
    ),
  );

  await page.screenshot({ path: resolve(outDir, 'ac3-02-filtro-ricoverato.png'), fullPage: false });

  // AND col filtro sesso: Ricoverato + Femmina -> 1 sola paziente (Verdi Anna).
  await page
    .locator('.toolbar .filter-chips')
    .first()
    .locator('.filter-chip', { hasText: 'Femmina' })
    .click();
  await page.waitForTimeout(400);
  const ricoveratoFemmina = await righe.count();
  verifica(
    'CRITICO: stato e sesso si combinano in AND (Ricoverato + Femmina = 1 paziente)',
    ricoveratoFemmina === 1,
    `righe: ${ricoveratoFemmina}`,
  );
  const conteggiConSesso = await chipStato.allInnerTexts();
  verifica(
    'I conteggi nelle chip stato si aggiornano rispetto al filtro sesso attivo',
    conteggiConSesso.join(' | ') ===
      'Tutti gli stati | Ricoverato (1) | Ambulatoriale (1) | Day Hospital (1) | Dimesso',
    conteggiConSesso.join(' | '),
  );
  await page.screenshot({ path: resolve(outDir, 'ac3-03-and-sesso-stato.png'), fullPage: false });

  // Reset: "Tutti gli stati" con sesso ancora su Femmina -> 3 pazienti donne.
  await chipStato.first().click();
  await page.waitForTimeout(400);
  verifica(
    '"Tutti gli stati" azzera solo il filtro stato (restano le 3 donne)',
    (await righe.count()) === 3,
    `righe: ${await righe.count()}`,
  );

  verifica(
    'nessun errore JavaScript durante lo scenario',
    erroriConsole.length === 0,
    erroriConsole.slice(0, 3).join(' || ') || 'console pulita',
  );

  await page.close();
} catch (err) {
  console.error('Errore E2E:', err.message);
  esiti.push({
    nome: 'esecuzione dello scenario',
    ok: false,
    dettaglio: err.message.slice(0, 300),
  });
} finally {
  await browser.close();
}

const falliti = esiti.filter((e) => !e.ok);
console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate`);
writeFileSync(resolve(outDir, 'ac3-verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
