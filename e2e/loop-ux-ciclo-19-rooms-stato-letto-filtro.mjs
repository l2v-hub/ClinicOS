// Ciclo 19 / AC4 + AC-R4: in "Posti Letto" (RoomsManagement) lo stato del letto
// (Occupati/Liberi/Manutenzione) diventa una riga di filtri cliccabili, che si combina in AND con
// il filtro reparto gia' esistente.
// Contract: artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/
//
// Nessun Postgres disponibile: /admin/rooms e /admin/rooms/occupancy sono mockati con page.route.
// Uso: node e2e/loop-ux-ciclo-19-rooms-stato-letto-filtro.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/screenshots';
mkdirSync(outDir, { recursive: true });

// 4 letti: 1 occupato (Cardiologia), 2 liberi (1 per reparto), 1 in manutenzione (Neurologia).
const ROOMS = [
  {
    id: 'r-101',
    numero: '101',
    tipo: 'doppia',
    piano: '1°',
    reparto: 'Cardiologia',
    stato: 'attiva',
    note: '',
    beds: [
      {
        id: 'b-101a',
        roomId: 'r-101',
        label: '101-A',
        stato: 'libero',
        note: '',
        assignments: [
          {
            id: 'a-1',
            patientId: 'p-1',
            startDate: '2026-08-01',
            endDate: null,
            patient: { firstName: 'MARIO', lastName: 'ROSSI' },
          },
        ],
      },
      { id: 'b-101b', roomId: 'r-101', label: '101-B', stato: 'libero', note: '', assignments: [] },
    ],
  },
  {
    id: 'r-102',
    numero: '102',
    tipo: 'doppia',
    piano: '1°',
    reparto: 'Neurologia',
    stato: 'attiva',
    note: '',
    beds: [
      {
        id: 'b-102a',
        roomId: 'r-102',
        label: '102-A',
        stato: 'manutenzione',
        note: '',
        assignments: [],
      },
      { id: 'b-102b', roomId: 'r-102', label: '102-B', stato: 'libero', note: '', assignments: [] },
    ],
  },
];

const OCCUPANCY = {
  totalRooms: 2,
  totalBeds: 4,
  occupiedBeds: 1,
  freeBeds: 2,
  maintenanceBeds: 1,
  occupancyPct: 25,
};

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/admin\/rooms\/occupancy/) && method === 'GET') return json(OCCUPANCY);
    if (url.match(/\/admin\/rooms(\?|$)/) && method === 'GET') return json(ROOMS);
    if (url.match(/\/operators?(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/appointments?(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/therapy-slots(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/consegne(\?|$)/) && method === 'GET') return json([]);
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
  page.on('console', (m) => {
    if (m.type() === 'error') erroriConsole.push(m.text().slice(0, 140));
  });
  await mockRoutes(page);

  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.locator('.login-role-card--admin').click();
  await page.waitForTimeout(1500);
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /Posti Letto/ })
    .first()
    .click();
  await page.waitForTimeout(1200);

  const letti = page.locator('.letto-row');
  const camere = page.locator('.room-card');
  const chip = (testo) => page.locator('.filter-chip', { hasText: testo }).first();

  verifica('Setup: tutti e 4 i letti sono visibili senza filtro', (await letti.count()) === 4);
  verifica('Setup: entrambe le camere sono visibili senza filtro', (await camere.count()) === 2);

  const chipOccupati = chip('Occupati (1)');
  const chipLiberi = chip('Liberi (2)');
  const chipManutenzione = chip('Manutenzione (1)');
  verifica(
    'I 3 stati del letto sono chip cliccabili con il conteggio nell etichetta',
    (await chipOccupati.isVisible()) &&
      (await chipLiberi.isVisible()) &&
      (await chipManutenzione.isVisible()),
  );

  await page.screenshot({ path: resolve(outDir, 'rooms-01-nessun-filtro.png'), fullPage: true });

  await chipOccupati.click();
  await page.waitForTimeout(400);
  verifica(
    'CRITICO: "Occupati (1)" riduce la lista a 1 solo letto',
    (await letti.count()) === 1,
    `letti visibili: ${await letti.count()}`,
  );
  verifica(
    '"Occupati" nasconde le camere senza letti occupati',
    (await camere.count()) === 1,
    `camere visibili: ${await camere.count()}`,
  );
  verifica(
    'Il letto rimasto e effettivamente marcato Occupato',
    /occupato/i.test(await letti.first().innerText()),
  );
  verifica(
    'Il chip attivo riceve la classe .active',
    await chipOccupati.evaluate((el) => el.classList.contains('active')),
  );
  await page.screenshot({ path: resolve(outDir, 'rooms-02-filtro-occupati.png'), fullPage: true });

  await chip('Liberi (2)').click();
  await page.waitForTimeout(400);
  verifica(
    'CRITICO: "Liberi (2)" mostra 2 letti in 2 camere diverse',
    (await letti.count()) === 2 && (await camere.count()) === 2,
    `letti: ${await letti.count()}, camere: ${await camere.count()}`,
  );

  await chip('Manutenzione (1)').click();
  await page.waitForTimeout(400);
  verifica(
    'CRITICO: "Manutenzione (1)" mostra 1 solo letto',
    (await letti.count()) === 1,
    `letti visibili: ${await letti.count()}`,
  );
  await page.screenshot({
    path: resolve(outDir, 'rooms-03-filtro-manutenzione.png'),
    fullPage: true,
  });

  // AND con il filtro reparto gia' esistente: Cardiologia ha 1 occupato + 1 libero, 0 manutenzione.
  await page.locator('.filter-chip', { hasText: 'Cardiologia' }).first().click();
  await page.waitForTimeout(400);
  verifica(
    'AND col filtro reparto: Cardiologia + Manutenzione non ha risultati',
    (await letti.count()) === 0 && (await camere.count()) === 0,
    `letti: ${await letti.count()}, camere: ${await camere.count()}`,
  );
  verifica(
    'I conteggi nei chip si ricalcolano sul reparto selezionato (Liberi 2 -> 1)',
    await chip('Liberi (1)').isVisible(),
  );

  // "Tutti gli stati" esatto: "Tutti i reparti" (riga reparto) e' un'etichetta diversa.
  await page
    .locator('.filter-chip', { hasText: /^Tutti gli stati$/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  verifica(
    'Il chip "Tutti gli stati" ripristina i letti del reparto selezionato',
    (await letti.count()) === 2,
    `letti visibili: ${await letti.count()}`,
  );
  await page.screenshot({ path: resolve(outDir, 'rooms-04-and-reparto.png'), fullPage: true });

  await page.locator('.filter-chip', { hasText: 'Tutti i reparti' }).first().click();
  await page.waitForTimeout(400);
  verifica(
    'Reset completo: tornano tutti e 4 i letti',
    (await letti.count()) === 4,
    `letti visibili: ${await letti.count()}`,
  );

  // Il comportamento preesistente sui letti resta intatto.
  await page.locator('.letto-row .icon-btn').first().click();
  await page.waitForTimeout(400);
  verifica(
    'La modifica del letto (modale) continua a funzionare',
    await page.locator('.modal-title', { hasText: 'Modifica Letto' }).isVisible(),
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
writeFileSync(
  resolve(outDir, 'verifiche-rooms-stato-letto.json'),
  JSON.stringify({ esiti }, null, 2),
);
process.exit(falliti.length === 0 ? 0 : 1);
