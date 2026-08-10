// Evidenze a runtime per "Gli stati mostrati diventano filtri cliccabili" — AC1: il riepilogo
// delle somministrazioni nel modale terapia (TherapySlotModal) diventa una riga di filtri per
// stato (Tutte / Da erogare / Erogate / Non erogate) che filtra davvero le righe mostrate.
// Contract: artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/
//
// Nessun Postgres/Podman disponibile: /therapy-slots e' mockato con page.route.
//
// Uso: node e2e/therapy-slot-modal-status-filters.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/ciclo-19-gli-stati-mostrati-diventano-filtri-cliccabili-fase-1-le-4-aree-a-maggi/screenshots';
mkdirSync(outDir, { recursive: true });

function administration(therapyId, drugName, status, extra = {}) {
  return {
    administrationId: null,
    therapyId,
    drugName,
    dosage: '1 compressa',
    quantityLabel: '1 compressa',
    route: 'orale',
    scheduledTime: '14:00',
    status,
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
    ...extra,
  };
}

const THERAPY_SLOTS = [
  {
    id: 'ts-pomeriggio',
    fascia: 'pomeriggio',
    label: 'Terapia Pomeriggio',
    ora: '14:00',
    summary: { total: 4, administered: 1, notAdministered: 1, pending: 2 },
    patients: [
      {
        patientId: 'p-sabbatani',
        firstName: 'LILIANA',
        lastName: 'SABBATANI',
        room: '4',
        bed: 'A',
        administrations: [
          administration('t-lasix', 'LASIX', 'pending'),
          administration('t-cardioaspirina', 'CARDIOASPIRINA', 'administered', {
            administeredBy: 'Anna Verdi',
          }),
        ],
      },
      {
        patientId: 'p-rossi',
        firstName: 'MARIO',
        lastName: 'ROSSI',
        room: '2',
        bed: 'B',
        administrations: [
          administration('t-eutirox', 'EUTIROX', 'pending'),
          administration('t-plavix', 'PLAVIX', 'not_administered', {
            notAdministeredReason: 'Rifiutata dal paziente',
          }),
        ],
      },
    ],
  },
];

const OPERATORE = {
  id: 'op-1',
  nome: 'Anna',
  cognome: 'Verdi',
  reparto: 'Reparto A',
  colore: '#2F6BED',
  stato: 'attivo',
};

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/therapy-slots(\?|$)/) && method === 'GET') return json(THERAPY_SLOTS);
    if (url.match(/\/operators?(\?|$)/) && method === 'GET') return json([OPERATORE]);
    if (url.match(/\/appointments?(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([]);
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
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
    .filter({ hasText: /^Agenda$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);

  await page.locator('.agt-therapy-slot').first().click();
  await page.waitForTimeout(800);

  const chips = page.locator('.therapy-modal__filters .filter-chip');
  const righe = page.locator('.therapy-modal__body .therapy-drug-row');

  const etichette = await chips.allInnerTexts();
  verifica(
    'AC-R1a: il modale mostra 4 filtri di stato con i conteggi nel testo',
    etichette.join(' | ') === 'Tutte | Da erogare (2) | Erogate (1) | Non erogate (1)',
    `chips: "${etichette.join(' | ')}"`,
  );

  const righeTutte = await righe.count();
  verifica(
    'AC-R1b: con "Tutte" attivo sono mostrate tutte le 4 somministrazioni',
    righeTutte === 4,
    `righe: ${righeTutte}`,
  );
  await page.screenshot({ path: resolve(outDir, '01-modale-filtro-tutte.png'), fullPage: true });

  await chips.nth(1).click();
  await page.waitForTimeout(400);
  const righePending = await righe.count();
  const testoPending = (await page.locator('.therapy-modal__body').innerText()).replace(/\n/g, ' ');
  verifica(
    'AC-R1c: "Da erogare" riduce la lista alle sole 2 somministrazioni pending',
    righePending === 2 && /LASIX/.test(testoPending) && /EUTIROX/.test(testoPending),
    `righe: ${righePending}`,
  );
  verifica(
    'AC-R1d: con "Da erogare" le righe erogate/non erogate spariscono',
    !/CARDIOASPIRINA/.test(testoPending) && !/PLAVIX/.test(testoPending),
    `body: "${testoPending.slice(0, 160)}"`,
  );
  verifica(
    'AC-R1e: il chip cliccato riceve lo stato attivo (.filter-chip.active)',
    (await chips.nth(1).getAttribute('class')).includes('active'),
    await chips.nth(1).getAttribute('class'),
  );
  await page.screenshot({
    path: resolve(outDir, '02-modale-filtro-da-erogare.png'),
    fullPage: true,
  });

  await chips.nth(2).click();
  await page.waitForTimeout(400);
  const righeErogate = await righe.count();
  const testoErogate = (await page.locator('.therapy-modal__body').innerText()).replace(/\n/g, ' ');
  verifica(
    'AC-R1f: "Erogate" mostra la sola somministrazione erogata',
    righeErogate === 1 && /CARDIOASPIRINA/.test(testoErogate),
    `righe: ${righeErogate}`,
  );

  await chips.nth(3).click();
  await page.waitForTimeout(400);
  const righeNonErogate = await righe.count();
  const testoNonErogate = (await page.locator('.therapy-modal__body').innerText()).replace(
    /\n/g,
    ' ',
  );
  verifica(
    'AC-R1g: "Non erogate" mostra la sola somministrazione non erogata',
    righeNonErogate === 1 && /PLAVIX/.test(testoNonErogate),
    `righe: ${righeNonErogate}`,
  );
  await page.screenshot({
    path: resolve(outDir, '03-modale-filtro-non-erogate.png'),
    fullPage: true,
  });

  await chips.nth(0).click();
  await page.waitForTimeout(400);
  const righeRitorno = await righe.count();
  verifica(
    'AC-R1h: tornando su "Tutte" la lista completa viene ripristinata',
    righeRitorno === 4,
    `righe: ${righeRitorno}`,
  );

  verifica(
    'AC-R5: nessun errore JavaScript durante lo scenario',
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
  resolve(outDir, 'verifiche-therapy-modal-filtri.json'),
  JSON.stringify({ esiti }, null, 2),
);
process.exit(falliti.length === 0 ? 0 : 1);
