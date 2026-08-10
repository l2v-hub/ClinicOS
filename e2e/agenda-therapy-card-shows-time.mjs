// Evidenze a runtime per "Card terapia in agenda non mostra l'orario, serve aprire il dettaglio
// per capirlo" — diretta conseguenza del fix earliestOra (ciclo precedente): la card della fascia
// occupa l'intera riga della griglia (grid-column: 1/-1), la riga oraria vera resta sotto senza
// alcun collegamento visivo. Fix: l'orario e' ora mostrato direttamente sulla card.
// Contract: artifacts/task-validation/card-terapia-in-agenda-non-mostra-l-orario-serve-aprire-il-dettaglio-per-capirlo/
//
// Nessun Postgres/Podman disponibile: /therapy-slots e' mockato con page.route.
// Verifica sia l'agenda admin sia l'agenda operatore (componente condiviso TherapySlotOverlay).
//
// Uso: node e2e/agenda-therapy-card-shows-time.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/card-terapia-in-agenda-non-mostra-l-orario-serve-aprire-il-dettaglio-per-capirlo/screenshots';
mkdirSync(outDir, { recursive: true });

const THERAPY_SLOTS = [
  {
    id: 'ts-pomeriggio',
    fascia: 'pomeriggio',
    label: 'Terapia Pomeriggio',
    ora: '14:00',
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

  // ── Admin ──
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

  const adminCardText = await page.locator('.agt-therapy-slot').first().innerText();
  verifica(
    "AC-R1: la card terapia in agenda ADMIN mostra l'orario senza doverla aprire",
    /14:00/.test(adminCardText),
    `testo card: "${adminCardText.replace(/\n/g, ' ')}"`,
  );
  await page.screenshot({ path: resolve(outDir, '01-admin-card-con-orario.png'), fullPage: true });

  // ── Operatore ──
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

  const opCardText = await page.locator('.agt-therapy-slot').first().innerText();
  verifica(
    "AC-R2: la card terapia in agenda OPERATORE mostra l'orario (componente condiviso)",
    /14:00/.test(opCardText),
    `testo card: "${opCardText.replace(/\n/g, ' ')}"`,
  );
  await page.screenshot({
    path: resolve(outDir, '02-operatore-card-con-orario.png'),
    fullPage: true,
  });

  verifica(
    'AC-R3: nessun errore JavaScript durante lo scenario',
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
