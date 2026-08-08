// Evidenze a runtime per "Loop UX ciclo 15 - Il bottone indietro della cartella mostra dove va
// davvero, non sempre 'Torna alla lista'".
// Contract: artifacts/task-validation/loop-ux-ciclo-15-back-label-accuracy/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Copre: AC1 (entrando dalla lista pazienti, il bottone indietro dice "Torna a Pazienti"),
// AC2 (dopo uno switch paziente via ricerca globale, il bottone indietro dice "Torna a Scheda
// Paziente" — riflette che "indietro" torna al paziente precedente, non alla lista).
//
// Uso: node e2e/loop-ux-ciclo-15-back-label-accuracy.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ?? 'artifacts/task-validation/loop-ux-ciclo-15-back-label-accuracy/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE_A = {
  id: 'p-a15',
  medicalRecordNumber: 'MRN-A15',
  firstName: 'Aldo',
  lastName: 'Amato',
  dateOfBirth: '1955-01-01',
  sex: 'M',
  email: null,
  phone: null,
};
const PAZIENTE_B = {
  id: 'p-b15',
  medicalRecordNumber: 'MRN-B15',
  firstName: 'Bice',
  lastName: 'Bonelli',
  dateOfBirth: '1948-03-03',
  sex: 'F',
  email: null,
  phone: null,
};

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '2',
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

    for (const p of [PAZIENTE_A, PAZIENTE_B]) {
      if (url.match(new RegExp(`/patients/${p.id}$`)) && method === 'GET') return json(p);
      if (url.match(new RegExp(`/patients/${p.id}/cartella`)) && method === 'GET')
        return json({ patientId: p.id, data: cartellaDi(p) });
      if (url.match(new RegExp(`/patients/${p.id}/narrative-sections`))) return json([]);
    }
    if (url.match(/\/patients\/clinical-summary/)) return json([]);
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PAZIENTE_A, PAZIENTE_B]);
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

  // ── AC1: entrando dalla lista pazienti, il bottone indietro dice "Torna a Pazienti" ──
  await page
    .locator('.teams-sidebar__item')
    .filter({ hasText: /^Pazienti$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page.getByText('Amato').first().click();
  await page.waitForTimeout(1500);

  const backButton = page.locator('.patient-compact-header__back');
  const titoloDallaLista = await backButton.getAttribute('title');
  verifica(
    'AC1: entrando dalla lista pazienti, il bottone indietro dice "Torna a Pazienti"',
    titoloDallaLista === 'Torna a Pazienti',
    `title="${titoloDallaLista}"`,
  );
  const isButtonElement = await backButton.evaluate((el) => el.tagName === 'BUTTON');
  verifica('Il bottone indietro e un vero <button> (accessibile da tastiera)', isButtonElement);
  await page.screenshot({
    path: resolve(outDir, '01-back-label-da-lista-pazienti.png'),
    fullPage: false,
  });

  // ── AC2: dopo uno switch paziente via ricerca globale, il bottone indietro riflette che
  // "indietro" torna al paziente precedente, non alla lista ──
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page
    .locator('input[type="search"], input[placeholder*="Cerca paziente"]')
    .last()
    .fill('Bonelli');
  await page.waitForTimeout(700);
  await page.locator('.search-modal__result-item', { hasText: 'Bonelli' }).first().click();
  await page.waitForTimeout(1500);

  const titoloDopoSwitch = await backButton.getAttribute('title');
  verifica(
    'CRITICO AC2: dopo lo switch paziente via ricerca, il bottone indietro dice "Torna a Scheda Paziente" (non piu "Torna alla lista")',
    titoloDopoSwitch === 'Torna a Scheda Paziente',
    `title="${titoloDopoSwitch}"`,
  );
  await page.screenshot({
    path: resolve(outDir, '02-back-label-dopo-switch-paziente.png'),
    fullPage: false,
  });

  const ariaLabelCoerente = await backButton.getAttribute('aria-label');
  verifica(
    'aria-label coerente con title (accessibile agli screen reader)',
    ariaLabelCoerente === titoloDopoSwitch,
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
