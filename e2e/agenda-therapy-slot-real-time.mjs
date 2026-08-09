// Evidenze a runtime per "Agenda multi-paziente mostra l'ora fissa della fascia invece dell'ora
// reale della terapia" (segnalazione utente: SABBATANI LILIANA, LASIX 08:00+14:00).
// Contract: artifacts/task-validation/agenda-multi-paziente-mostra-l-ora-fissa-della-fascia-invece-dell-ora-reale-dell/
//
// Nessun Postgres/Podman disponibile: /therapy-slots e' mockato con page.route, con lo shape
// GIA' CORRETTO dal fix backend (buildTherapySlots/earliestOra, verificato separatamente contro
// il database di produzione — vedi validation-report). Questo script verifica che l'agenda admin
// posizioni davvero la card "Pomeriggio" nella riga della griglia corrispondente all'orario REALE
// (14:00), non piu' nella riga del default fisso (16:00) — comportamento gia' garantito lato
// frontend (nessuna riga toccata li'), qui verificato end-to-end.
//
// Uso: node e2e/agenda-therapy-slot-real-time.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/agenda-multi-paziente-mostra-l-ora-fissa-della-fascia-invece-dell-ora-reale-dell/screenshots';
mkdirSync(outDir, { recursive: true });

// Shape prodotta dal backend DOPO il fix: la fascia "pomeriggio" contiene la dose reale di
// SABBATANI (14:00) e viene ancorata a "ora": "14:00" (prima del fix sarebbe sempre stata "16:00",
// indipendentemente dal contenuto).
const THERAPY_SLOTS_FIXED = [
  {
    id: 'ts-mattina',
    fascia: 'mattina',
    label: 'Terapia Mattina',
    ora: '08:00',
    summary: { total: 1, administered: 0, notAdministered: 0, pending: 1 },
    patients: [
      {
        patientId: 'p-sabbatani',
        firstName: 'LILIANA',
        lastName: 'SABBATANI',
        room: '4',
        bed: 'A',
        administrations: [
          {
            administrationId: null,
            therapyId: 't-lasix',
            drugName: 'LASIX',
            dosage: '1 compressa',
            quantityLabel: '1 compressa',
            route: 'orale',
            scheduledTime: '08:00',
            status: 'pending',
            administeredAt: null,
            administeredBy: null,
            notAdministeredReason: null,
          },
        ],
      },
    ],
  },
  {
    id: 'ts-pomeriggio',
    fascia: 'pomeriggio',
    label: 'Terapia Pomeriggio',
    ora: '14:00', // <-- il fix: prima sarebbe sempre stato "16:00" (default fisso della fascia)
    summary: { total: 1, administered: 0, notAdministered: 0, pending: 1 },
    patients: [
      {
        patientId: 'p-sabbatani',
        firstName: 'LILIANA',
        lastName: 'SABBATANI',
        room: '4',
        bed: 'A',
        administrations: [
          {
            administrationId: null,
            therapyId: 't-lasix-2',
            drugName: 'LASIX',
            dosage: '1 compressa',
            quantityLabel: '1 compressa',
            route: 'orale',
            scheduledTime: '14:00',
            status: 'pending',
            administeredAt: null,
            administeredBy: null,
            notAdministeredReason: null,
          },
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

    if (url.match(/\/therapy-slots(\?|$)/) && method === 'GET') return json(THERAPY_SLOTS_FIXED);
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
  await page.locator('.login-role-card--admin').click();
  await page.waitForTimeout(1500);
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Agenda$/ })
    .first()
    .click();
  await page.waitForTimeout(1500);

  const therapyRows = page.locator('.agt-admin-therapy-row');
  const rowCount = await therapyRows.count();
  verifica(
    'Setup: entrambe le fasce (mattina, pomeriggio) sono renderizzate in agenda',
    rowCount === 2,
    `righe trovate: ${rowCount}`,
  );

  // Trova la riga della card "Terapia Pomeriggio" e verifica l'etichetta oraria IMMEDIATAMENTE
  // successiva nella griglia (stesso pattern del componente: .agt-admin-therapy-row seguita da
  // .agt-admin-time per la stessa riga).
  const pomeriggioRow = page.locator('.agt-admin-therapy-row', { hasText: 'Terapia Pomeriggio' });
  const pomeriggioVisible = await pomeriggioRow.isVisible().catch(() => false);
  verifica('La card "Terapia Pomeriggio" e visibile', pomeriggioVisible);

  const oraLabel = await pomeriggioRow
    .locator('xpath=following-sibling::div[contains(@class,"agt-admin-time")][1]')
    .innerText();
  verifica(
    'CRITICO: la card "Pomeriggio" e posizionata alla riga delle 14:00 (orario reale di SABBATANI), non piu 16:00 (default fisso)',
    oraLabel.trim() === '14:00',
    `etichetta riga trovata: "${oraLabel.trim()}"`,
  );

  await page.screenshot({ path: resolve(outDir, '01-agenda-pomeriggio-a-14.png'), fullPage: true });

  // Il dettaglio della fascia (gia' corretto prima del fix) continua a mostrare l'orario per riga.
  await pomeriggioRow.click();
  await page.waitForTimeout(600);
  const modalText = await page
    .locator('.therapy-modal')
    .first()
    .innerText()
    .catch(() => '');
  verifica(
    'Il dettaglio della fascia mostra SABBATANI con orario 14:00 per riga',
    /SABBATANI/.test(modalText) && /14:00/.test(modalText),
  );
  await page.screenshot({
    path: resolve(outDir, '02-dettaglio-fascia-pomeriggio.png'),
    fullPage: false,
  });

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
writeFileSync(resolve(outDir, 'verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
