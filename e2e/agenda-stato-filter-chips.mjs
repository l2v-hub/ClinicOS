// Evidenze a runtime per AC2 del ciclo 19: "gli stati mostrati diventano filtri cliccabili"
// applicato all'agenda (OperatorAgenda + AdminAgenda).
// Contract: artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/
//
// Nessun Postgres disponibile: /appointments e /operators sono mockati con page.route
// (stesso pattern di e2e/agenda-therapy-slot-real-time.mjs). Lo scenario verifica che
// cliccando un chip di stato il numero di card appuntamento renderizzate scenda davvero
// a quelle di quello stato, in ENTRAMBE le agende, e che il filtro stato si combini con
// il filtro operatore gia' esistente in agenda admin.
//
// Uso: node e2e/agenda-stato-filter-chips.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/screenshots';
mkdirSync(outDir, { recursive: true });

const OGGI = new Date().toISOString().slice(0, 10);

const OPERATORI = [
  { id: 'op1', nome: 'Marco', cognome: 'Ferretti', reparto: 'Cardiologia', stato: 'attivo' },
  { id: 'op2', nome: 'Anna', cognome: 'Verdi', reparto: 'Cardiologia', stato: 'attivo' },
];

// 4 appuntamenti di op1 (uno per stato) + 1 di op2, tutti oggi, su orari distinti della griglia.
const APPUNTAMENTI = [
  { id: 'a1', ora: '09:00', operatorId: 'op1', patientName: 'ROSSI, Mario', stato: 'programmato' },
  { id: 'a2', ora: '10:00', operatorId: 'op1', patientName: 'BIANCHI, Luca', stato: 'in_corso' },
  { id: 'a3', ora: '11:00', operatorId: 'op1', patientName: 'VERDI, Sara', stato: 'completato' },
  { id: 'a4', ora: '12:00', operatorId: 'op1', patientName: 'NERI, Elsa', stato: 'annullato' },
  { id: 'a5', ora: '14:00', operatorId: 'op2', patientName: 'GIALLI, Ugo', stato: 'programmato' },
].map((a) => ({
  ...a,
  data: OGGI,
  durata: 30,
  patientId: null,
  operatorName: a.operatorId === 'op1' ? 'Marco Ferretti' : 'Anna Verdi',
  tipologia: 'visita',
  note: '',
}));

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/appointments(\?|$)/) && method === 'GET') return json(APPUNTAMENTI);
    if (url.match(/\/operators\/schedules/) && method === 'GET') return json([]);
    if (url.match(/\/operators(\?|$)/) && method === 'GET') return json(OPERATORI);
    if (url.match(/\/therapy-slots(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([]);
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

async function apriAgenda(page, ruolo) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator(`.login-role-card--${ruolo}`).click();
  await page.waitForTimeout(1500);
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Agenda$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
}

function chip(page, testo) {
  return page.locator('.agt-filter-chip', { hasText: testo }).first();
}

const browser = await chromium.launch({ headless: true });
const erroriConsole = [];

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (e) => erroriConsole.push(e.message.slice(0, 140)));
  await mockRoutes(page);

  // ── Agenda ADMIN ──────────────────────────────────────────────────────────
  await apriAgenda(page, 'admin');
  const cards = page.locator('.agt-apt-card');

  verifica(
    'ADMIN setup: le 5 card appuntamento di oggi sono renderizzate',
    (await cards.count()) === 5,
    `card: ${await cards.count()}`,
  );
  verifica(
    'ADMIN: la riga di chip per stato e visibile con i conteggi live',
    (await chip(page, 'Tutti gli stati (5)')
      .isVisible()
      .catch(() => false)) &&
      (await chip(page, 'Programmato (2)')
        .isVisible()
        .catch(() => false)) &&
      (await chip(page, 'Completato (1)')
        .isVisible()
        .catch(() => false)),
  );
  await page.screenshot({
    path: resolve(outDir, 'ac2-01-admin-nessun-filtro.png'),
    fullPage: true,
  });

  await chip(page, 'Completato').click();
  await page.waitForTimeout(400);
  verifica(
    'ADMIN CRITICO: cliccando "Completato" resta la sola card completata',
    (await cards.count()) === 1 && (await page.locator('.agt-apt-card--completato').count()) === 1,
    `card visibili: ${await cards.count()}`,
  );
  await page.screenshot({
    path: resolve(outDir, 'ac2-02-admin-filtro-completato.png'),
    fullPage: true,
  });

  await chip(page, 'Completato').click(); // toggle off
  await page.waitForTimeout(400);
  verifica(
    'ADMIN: ri-cliccando lo stesso chip il filtro si azzera (tornano 5 card)',
    (await cards.count()) === 5,
    `card visibili: ${await cards.count()}`,
  );

  // Combinazione con il filtro operatore gia' esistente (non deve essere sostituito)
  await page.locator('.agt-filter-chip', { hasText: 'Ferretti' }).first().click();
  await page.waitForTimeout(400);
  const dopoOperatore = await cards.count();
  await chip(page, 'Programmato').click();
  await page.waitForTimeout(400);
  verifica(
    'ADMIN CRITICO: filtro operatore (Ferretti) e filtro stato (Programmato) si combinano',
    dopoOperatore === 4 && (await cards.count()) === 1,
    `dopo operatore: ${dopoOperatore}, dopo operatore+stato: ${await cards.count()}`,
  );
  await page.screenshot({
    path: resolve(outDir, 'ac2-03-admin-operatore-piu-stato.png'),
    fullPage: true,
  });

  await page.close();

  // ── Agenda OPERATORE ──────────────────────────────────────────────────────
  const page2 = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page2.on('pageerror', (e) => erroriConsole.push(e.message.slice(0, 140)));
  await mockRoutes(page2);
  await apriAgenda(page2, 'operatore');
  const cards2 = page2.locator('.agt-apt-card');

  verifica(
    'OPERATORE setup: le 4 card di op1 sono renderizzate',
    (await cards2.count()) === 4,
    `card: ${await cards2.count()}`,
  );
  verifica(
    'OPERATORE: la riga di chip per stato e visibile con i conteggi live',
    await chip(page2, 'Tutti gli stati (4)')
      .isVisible()
      .catch(() => false),
  );
  await page2.screenshot({
    path: resolve(outDir, 'ac2-04-operatore-nessun-filtro.png'),
    fullPage: true,
  });

  await chip(page2, 'In corso').click();
  await page2.waitForTimeout(400);
  verifica(
    'OPERATORE CRITICO: cliccando "In corso" resta la sola card in corso',
    (await cards2.count()) === 1 && (await page2.locator('.agt-apt-card--in_corso').count()) === 1,
    `card visibili: ${await cards2.count()}`,
  );
  await page2.screenshot({
    path: resolve(outDir, 'ac2-05-operatore-filtro-in-corso.png'),
    fullPage: true,
  });

  // Uno slot occupato ma nascosto dal filtro non deve piu' offrire "Disponibile"
  // (altrimenti si potrebbe creare un doppio appuntamento sulla stessa fascia).
  verifica(
    'OPERATORE: gli slot occupati ma nascosti dal filtro non mostrano "Disponibile"',
    (await page2.locator('.agt-slot--occ .agt-free-slot').count()) === 0,
    `slot occupati con affordance di creazione: ${await page2
      .locator('.agt-slot--occ .agt-free-slot')
      .count()}`,
  );

  await chip(page2, 'Tutti gli stati').click();
  await page2.waitForTimeout(400);
  verifica(
    'OPERATORE: "Tutti gli stati" ripristina le 4 card',
    (await cards2.count()) === 4,
    `card visibili: ${await cards2.count()}`,
  );

  await page2.close();

  verifica(
    'nessun errore JavaScript durante gli scenari',
    erroriConsole.length === 0,
    erroriConsole.slice(0, 3).join(' || ') || 'console pulita',
  );
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
writeFileSync(resolve(outDir, 'ac2-verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
