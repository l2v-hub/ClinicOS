// BUG-064: Invio in PS modal screenshot. Mocks patient + therapy API endpoints,
// navigates to patient detail, clicks "Invio in PS" and captures the modal.
// Usage: node e2e/invio-ps-shot.mjs [frontendUrl] [outDir]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir = process.argv[3] ?? 'requirements/evidence/BUG-064';
mkdirSync(outDir, { recursive: true });

const PATIENT = {
  id: 'p-bug064',
  medicalRecordNumber: 'MRN-064',
  firstName: 'Maria',
  lastName: 'Bianchi',
  dateOfBirth: '1948-07-12',
  sex: 'F',
  email: null,
  phone: null,
};

const THERAPIES = [
  {
    id: 'th-001',
    patientId: PATIENT.id,
    farmacoNome: 'Paracetamolo',
    dosaggio: '500mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-06-01',
    dataFine: null,
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: true,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: 'Dott. Rossi',
    operatoreInseritore: 'Inf. Verdi',
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'th-002',
    patientId: PATIENT.id,
    farmacoNome: 'Ramipril',
    dosaggio: '5mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-05-15',
    dataFine: null,
    fasceMattina: true,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: 'Dott. Rossi',
    operatoreInseritore: 'Inf. Verdi',
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 'th-003',
    patientId: PATIENT.id,
    farmacoNome: 'Metformina',
    dosaggio: '1000mg',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'sospesa',  // NOT active — should not appear
    dataInizio: '2026-04-01',
    dataFine: '2026-06-10',
    fasceMattina: true,
    fascePranzo: true,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: null,
    operatoreInseritore: null,
    note: 'sospesa temporaneamente',
    dataSomministrazione: null,
    orarioSomministrazione: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
];

const CARTELLA = {
  pazienteId: PATIENT.id,
  statoRicovero: 'ricoverato',
  cameraNumero: '7',
  lettoNumero: 'B',
  anamnesi: { anamnesiPatologicaRemota: 'Ipertensione, diabete tipo 2', anamnesiPatologicaProssima: 'Peggioramento parametri' },
  diagnosi: [],
  terapie: [],
  farmaci: [],
  allergie: [{ id: 'al-1', sostanza: 'Penicillina', reazione: 'orticaria', gravita: 'grave', operatore: 'Inf. Test', createdAt: '2026-06-01T00:00:00.000Z' }],
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
  dimissione: {
    data: '2026-06-22',
    ora: '11:00',
    condizioni: 'discrete',
    destinazione: 'ospedale',
    autonomiaResidua: 'Parziale con assistenza',
    pianoCuraConsegnato: true,
    istruzioni: 'Continuare terapia domiciliare, idratazione adeguata',
    controlliProgrammati: 'Visita specialistica cardiologica entro 7 giorni',
    personaAccompagna: 'Figlia – Rosa Bianchi',
    mezzoTrasporto: 'Ambulanza',
    materialeConsegnato: 'Piano cura, documentazione diagnostica',
    operatore: 'Inf. Verdi',
    note: 'Paziente collaborante al momento della dimissione',
    compilatoAt: '2026-06-22T11:00:00.000Z',
  },
};

async function mock(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    // patients list
    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PATIENT]);
    // single patient
    if (url.match(/\/patients\/p-bug064$/) && method === 'GET') return json(PATIENT);
    // patient cartella
    if (url.match(/\/patients\/p-bug064\/cartella/) && method === 'GET') return json(CARTELLA);
    // therapies — this is the key endpoint for InvioPSModal
    if (url.match(/\/patients\/p-bug064\/therapies/) && method === 'GET') return json(THERAPIES);
    // patient settings
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    // narrative sections (so NarrativeSectionsTab doesn't fail)
    if (url.match(/\/patients\/p-bug064\/narrative-sections/)) return json([]);
    // medication administrations
    if (url.match(/\/medication-administrations/)) return json([]);
    // therapy-slots
    if (url.match(/\/therapy-slots/)) return json([]);
    // any other API call — pass through
    return route.continue();
  });
}

const browser = await chromium.launch({ headless: true });
let success = false;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await mock(page);

  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  // Step 1: Login as Operatore (click the "Operatore" login card)
  const loginCard = page.locator('.login-role-card--operatore');
  if (await loginCard.count() > 0) {
    await loginCard.click();
    await page.waitForTimeout(1200);
  }

  // Step 2: Navigate to Pazienti (sidebar nav)
  const pazientiNav = page.locator('[title="Pazienti"], .teams-sidebar__item').filter({ hasText: /Pazienti/i }).first();
  if (await pazientiNav.count() > 0) {
    await pazientiNav.click();
    await page.waitForTimeout(1200);
  } else {
    // Try sidebar label
    await page.getByText('Pazienti').first().click();
    await page.waitForTimeout(1200);
  }

  // Step 3: Click on the patient row (Bianchi)
  const patientRow = page.getByText('Bianchi').first();
  if (await patientRow.count() > 0) {
    await patientRow.click();
    await page.waitForTimeout(1200);
  }

  // Step 4: Click "Invio in PS" button
  const invioBtn = page.getByRole('button', { name: /Invio in PS/i });
  if (await invioBtn.count() > 0) {
    await invioBtn.click();
    await page.waitForTimeout(1500); // wait for therapy fetch
    await page.screenshot({ path: resolve(outDir, 'invio-ps-preview.png'), fullPage: false });
    success = true;
    console.log('Screenshot saved:', resolve(outDir, 'invio-ps-preview.png'));
  } else {
    console.log('ERROR: "Invio in PS" button not found on page');
    await page.screenshot({ path: resolve(outDir, 'invio-ps-debug.png'), fullPage: true });
    console.log('Debug screenshot saved:', resolve(outDir, 'invio-ps-debug.png'));
  }

  await page.close();
} catch (err) {
  console.error('E2E error:', err.message);
} finally {
  await browser.close();
  process.exit(success ? 0 : 1);
}
