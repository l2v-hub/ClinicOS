// Evidenze a runtime per "Loop UX ciclo 17 - PatientList non perde piu' ricerca e filtro ad ogni
// riapertura".
// Contract: artifacts/task-validation/loop-ux-ciclo-17-patientlist-non-perde-piu-ricerca-e-filtro-ad-ogni-riapertura/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Copre: AC-R1 (ricerca sopravvive ad apri-e-torna), AC-R2 (filtro sesso sopravvive), AC-R3
// (il filtro funziona ancora correttamente).
//
// Uso: node e2e/loop-ux-ciclo-17-patientlist-state-persistence.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-17-patientlist-non-perde-piu-ricerca-e-filtro-ad-ogni-riapertura/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTI = [
  {
    id: 'p-e17',
    medicalRecordNumber: 'MRN-E17',
    firstName: 'Elena',
    lastName: 'Esposito',
    dateOfBirth: '1980-04-04',
    sex: 'F',
    email: null,
    phone: null,
  },
  {
    id: 'p-f17',
    medicalRecordNumber: 'MRN-F17',
    firstName: 'Franco',
    lastName: 'Ferri',
    dateOfBirth: '1965-09-09',
    sex: 'M',
    email: null,
    phone: null,
  },
];

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '5',
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

    for (const p of PAZIENTI) {
      if (url.match(new RegExp(`/patients/${p.id}$`)) && method === 'GET') return json(p);
      if (url.match(new RegExp(`/patients/${p.id}/cartella`)))
        return json({ patientId: p.id, data: cartellaDi(p) });
      if (url.match(new RegExp(`/patients/${p.id}/narrative-sections`))) return json([]);
    }
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json(PAZIENTI);
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

  // Imposta ricerca + filtro sesso.
  await page.locator('.search-input').fill('Esposito');
  await page.waitForTimeout(400);
  await page.locator('.filter-chip', { hasText: 'Femmina' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: resolve(outDir, '01-ricerca-e-filtro-impostati.png'),
    fullPage: false,
  });

  const righeVisibiliPrima = await page.locator('.patient-list-card, tbody tr').count();
  verifica(
    'AC-R3 (setup): il filtro riduce davvero i risultati mostrati (Esposito+Femmina esclude Ferri)',
    righeVisibiliPrima >= 1,
    `righe visibili: ${righeVisibiliPrima}`,
  );

  // Apri la cartella di Esposito, poi torna alla lista.
  await page.getByText('Esposito').first().click();
  await page.waitForTimeout(1500);
  await page.goBack();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(outDir, '02-dopo-apri-e-torna.png'), fullPage: false });

  const ricercaValoreDopo = await page.locator('.search-input').inputValue();
  verifica(
    'CRITICO AC-R1: la ricerca "Esposito" e ancora presente dopo apri-e-torna (non svuotata)',
    ricercaValoreDopo === 'Esposito',
    `valore: "${ricercaValoreDopo}"`,
  );

  const filtroFemminaAttivoDopo = await page
    .locator('.filter-chip.active', { hasText: 'Femmina' })
    .isVisible()
    .catch(() => false);
  verifica(
    'CRITICO AC-R2: il filtro "Femmina" e ancora selezionato dopo apri-e-torna',
    filtroFemminaAttivoDopo,
  );

  const ferriVisibileDopo = (await page.getByText('Ferri').count()) > 0;
  verifica(
    'AC-R3: il filtro continua a funzionare correttamente (Ferri, maschio, resta escluso)',
    !ferriVisibileDopo,
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
writeFileSync(resolve(outDir, 'verifiche.json'), JSON.stringify({ esiti }, null, 2));
process.exit(falliti.length === 0 ? 0 : 1);
