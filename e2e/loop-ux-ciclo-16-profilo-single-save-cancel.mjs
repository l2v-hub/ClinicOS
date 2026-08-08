// Evidenze a runtime per "Loop UX ciclo 16 - Rimuovi la coppia Salva/Annulla duplicata in Profilo".
// Contract: artifacts/task-validation/loop-ux-ciclo-16-rimuovi-la-coppia-salva-annulla-duplicata-in-profilo/
//
// Nessun Postgres/Podman disponibile: tutte le rotte sono mockate con page.route.
// Copre: AC-R1 (una sola coppia Salva/Annulla visibile in modifica, non due), AC-R2 (il
// salvataggio tramite il footer InlineForm funziona ancora), AC-R3 (il bottone Modifica fuori
// modifica e' invariato).
//
// Uso: node e2e/loop-ux-ciclo-16-profilo-single-save-cancel.mjs [frontendUrl] [outDir]

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:5173';
const outDir =
  process.argv[3] ??
  'artifacts/task-validation/loop-ux-ciclo-16-rimuovi-la-coppia-salva-annulla-duplicata-in-profilo/screenshots';
mkdirSync(outDir, { recursive: true });

const PAZIENTE = {
  id: 'p-d16',
  medicalRecordNumber: 'MRN-D16',
  firstName: 'Dario',
  lastName: 'Donati',
  dateOfBirth: '1970-02-02',
  sex: 'M',
  email: 'dario.donati@example.test',
  phone: '3331234567',
};

function cartellaDi(p) {
  return {
    pazienteId: p.id,
    statoRicovero: 'ricoverato',
    cameraNumero: '4',
    lettoNumero: 'C',
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
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}$`)) && method === 'PATCH')
      return json({ ...PAZIENTE });
    if (url.match(new RegExp(`/patients/${PAZIENTE.id}/cartella`))) {
      if (method === 'PATCH' || method === 'PUT')
        return json({ patientId: PAZIENTE.id, data: cartellaDi(PAZIENTE) });
      return json({ patientId: PAZIENTE.id, data: cartellaDi(PAZIENTE) });
    }
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
  await page.getByText('Donati').first().click();
  await page.waitForTimeout(1500);

  // Il tab di default e' Riepilogo — Profilo (dove vive il bottone Modifica) e' un sotto-tab del
  // gruppo Panoramica, va selezionato esplicitamente.
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Panoramica$/ })
    .first()
    .click();
  await page.waitForTimeout(500);
  await page
    .locator('button, [role="tab"]')
    .filter({ hasText: /^Profilo$/ })
    .first()
    .click();
  await page.waitForTimeout(600);

  const modificaButton = page.locator('button', { hasText: /^Modifica$/ }).first();
  const modificaVisibilePrima = await modificaButton.isVisible().catch(() => false);
  verifica('AC-R3: fuori modifica, il bottone "Modifica" e presente', modificaVisibilePrima);
  await page.screenshot({
    path: resolve(outDir, '01-profilo-vista-sola-lettura.png'),
    fullPage: false,
  });

  await modificaButton.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(outDir, '02-profilo-in-modifica.png'), fullPage: false });

  // hasText string (non regex ancorata) normalizza lo spazio prima del testo lasciato
  // dall'icona SVG del bottone Salva (`<IcoCheck /> {saving ? ... : 'Salva'}`).
  const bottoniSalva = await page.locator('button', { hasText: 'Salva' }).count();
  const bottoniAnnulla = await page.locator('button', { hasText: 'Annulla' }).count();
  verifica(
    'CRITICO AC-R1: un solo bottone "Salva" visibile in modifica (non due)',
    bottoniSalva === 1,
    `trovati: ${bottoniSalva}`,
  );
  verifica(
    'CRITICO AC-R1: un solo bottone "Annulla" visibile in modifica (non due)',
    bottoniAnnulla === 1,
    `trovati: ${bottoniAnnulla}`,
  );

  // AC-R2: il salvataggio funziona ancora tramite il footer InlineForm.
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('nuovo.indirizzo@example.test');
  await page.locator('.cr-inline-form__actions button', { hasText: 'Salva' }).click();
  await page.waitForTimeout(800);
  const formAncoraAperto = (await page.locator('.cr-inline-form').count()) > 0;
  verifica(
    'AC-R2: il salvataggio chiude il form di modifica (comportamento pre-esistente invariato)',
    !formAncoraAperto,
  );
  await page.screenshot({
    path: resolve(outDir, '03-profilo-dopo-salvataggio.png'),
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
