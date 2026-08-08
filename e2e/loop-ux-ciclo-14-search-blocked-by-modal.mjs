// Evidenze a runtime per "Loop UX ciclo 14 - Ricerca globale ignorata quando un modale clinico
// e' gia' aperto".
// Contract: artifacts/task-validation/loop-ux-ciclo-14-ricerca-globale-ignorata-quando-un-modale-clinico-e-gia-aperto/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Copre: AC1 (Ctrl+K non apre .search-overlay quando un modale clinico e' gia' aperto),
// AC2 (Ctrl+K funziona normalmente senza modali aperti — nessuna regressione).
//
// Uso: node e2e/loop-ux-ciclo-14-search-blocked-by-modal.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-14-ricerca-globale-ignorata-quando-un-modale-clinico-e-gia-aperto/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-c14',
  medicalRecordNumber: 'MRN-C14',
  firstName: 'Carlo',
  lastName: 'Cortese',
  dateOfBirth: '1960-05-05',
  sex: 'M',
  email: null,
  phone: null,
};

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '3',
    lettoNumero: 'B',
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
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/cartella`)) && method === 'GET')
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

  // ── AC2: senza modali aperti, Ctrl+K apre la ricerca normalmente (nessuna regressione) ──
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  const searchApertaSenzaModali = await page
    .locator('.search-overlay')
    .isVisible()
    .catch(() => false);
  verifica(
    'AC2: Ctrl+K apre la ricerca quando nessun modale e aperto (nessuna regressione)',
    searchApertaSenzaModali,
  );
  await page.screenshot({
    path: resolve(outDir, '01-ricerca-normale-senza-modali.png'),
    fullPage: false,
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const searchChiusaConEscape = !(await page
    .locator('.search-overlay')
    .isVisible()
    .catch(() => false));
  verifica('AC3: Escape chiude ancora la ricerca (nessuna regressione)', searchChiusaConEscape);

  // ── AC1: con un modale clinico aperto, Ctrl+K non apre una seconda overlay dietro di esso ──
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Pazienti$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.getByText('Cortese').first().click();
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: 'Invio in PS' }).click();
  await page.waitForTimeout(800);
  const modaleAperto = await page
    .locator('.modal-overlay')
    .isVisible()
    .catch(() => false);
  verifica('Setup: il modale "Invio in PS" (.modal-overlay) e aperto', modaleAperto);
  await page.screenshot({
    path: resolve(outDir, '02-modale-invio-ps-aperto.png'),
    fullPage: false,
  });

  await page.keyboard.press('Control+k');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: resolve(outDir, '03-dopo-ctrl-k-con-modale-aperto.png'),
    fullPage: false,
  });
  const searchOverlayNelDomDopoCtrlK = (await page.locator('.search-overlay').count()) > 0;
  verifica(
    'CRITICO AC1: Ctrl+K NON ha aperto .search-overlay mentre il modale clinico era attivo (niente overlay fantasma dietro)',
    !searchOverlayNelDomDopoCtrlK,
  );
  const modaleAncoraAperto = await page
    .locator('.modal-overlay')
    .isVisible()
    .catch(() => false);
  verifica(
    'Il modale "Invio in PS" e ancora l unico overlay visibile dopo Ctrl+K',
    modaleAncoraAperto,
  );

  // ── Dopo aver chiuso il modale, Ctrl+K torna a funzionare normalmente ──
  await page
    .locator('.modal-overlay button', { hasText: /Annulla|Chiudi|Cancel/i })
    .first()
    .click()
    .catch(async () => {
      await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
    });
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  const searchRiattivataDopoChiusuraModale = await page
    .locator('.search-overlay')
    .isVisible()
    .catch(() => false);
  verifica(
    'Dopo la chiusura del modale, Ctrl+K torna a funzionare normalmente',
    searchRiattivataDopoChiusuraModale,
  );
  await page.screenshot({
    path: resolve(outDir, '04-ricerca-di-nuovo-funzionante-dopo-chiusura-modale.png'),
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
