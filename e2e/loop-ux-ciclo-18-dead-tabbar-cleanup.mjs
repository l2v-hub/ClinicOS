// Evidenze a runtime per "Loop UX ciclo 18 - Rimuovi le implementazioni morte di tab bar".
// Contract: artifacts/task-validation/loop-ux-ciclo-18-rimuovi-le-implementazioni-morte-di-tab-bar/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Non verifica un comportamento nuovo (e' una rimozione di codice morto) — verifica che le
// superfici reali che condividono file CSS con il codice rimosso (TopNav L2/L3 nella cartella,
// il modale "Nuovo paziente" della famiglia .npm-*) restino visivamente invariate.
//
// Uso: node e2e/loop-ux-ciclo-18-dead-tabbar-cleanup.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-18-rimuovi-le-implementazioni-morte-di-tab-bar/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-g18',
  medicalRecordNumber: 'MRN-G18',
  firstName: 'Giulia',
  lastName: 'Grasso',
  dateOfBirth: '1975-06-06',
  sex: 'F',
  email: null,
  phone: null,
};

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '6',
    lettoNumero: 'A',
    anamnesi: {},
    diagnosi: [],
    terapie: [],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: {},
    indicatoriRischio: [],
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    valutazioniTinetti: [],
    valutazioniNRS: [],
    esamiEmatici: [],
    esamiStrumentali: [],
    consulenze: [],
    dimissione: null,
  };
}

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(new RegExp(`/patients/${PAZIENTE.id}$`)) && method === 'GET')
      return json(PAZIENTE);
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/cartella`)))
      return json({ patientId: PAZIENTE.id, data: cartellaDi(PAZIENTE) });
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/narrative-sections`))) return json([]);
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE]);
    if (url.match(/\/therapy-slots/)) return json([]);
    if (url.match(/\/patients\/settings/)) return json({ allowDelete: false });
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
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
  await page.waitForTimeout(1200);

  // ── AC-R2: modale "Nuovo paziente" (famiglia .npm-*, tab rimossi ma resto vivo) ──
  await page.locator('button', { hasText: 'Nuovo paziente' }).click();
  await page.waitForTimeout(800);
  const modaleNpmVisibile = await page
    .locator('.npm-grid, .npm-body, .npm-header')
    .first()
    .isVisible()
    .catch(() => false);
  verifica(
    'AC-R2: il modale "Nuovo paziente" (.npm-*) si apre e renderizza correttamente',
    modaleNpmVisibile,
  );
  await page.screenshot({ path: resolve(outDir, '01-modale-nuovo-paziente.png'), fullPage: false });
  // Escape chiude solo il modale di ricerca globale (Ciclo 14) — questo modale si chiude col suo
  // bottone dedicato, aria-label="Chiudi".
  await page.locator('button[aria-label="Chiudi"]').click();
  await page.waitForTimeout(500);

  // ── AC-R1: TopNav L2/L3 nella cartella paziente ──
  await page.getByText('Grasso').first().click();
  await page.waitForTimeout(1500);
  const topNavL2Visibile = await page
    .locator('.top-nav--level2, [class*="top-nav"]')
    .first()
    .isVisible()
    .catch(() => false);
  verifica(
    'AC-R1: la navigazione L2 (TopNav) e visibile nella cartella paziente',
    topNavL2Visibile,
  );
  const pillAttiva = await page
    .locator('.top-nav__item.is-active')
    .first()
    .isVisible()
    .catch(() => false);
  verifica(
    'AC-R1: l indicatore "attivo" (pillola blu) di TopNav e visibile e invariato',
    pillAttiva,
  );
  await page.screenshot({ path: resolve(outDir, '02-topnav-l2-l3-cartella.png'), fullPage: false });

  verifica(
    'AC-R3: nessun errore JavaScript durante la navigazione delle superfici toccate',
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
