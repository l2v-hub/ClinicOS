// BUG-061: Screenshot proof for Esami & Consulenze tab with three distinct sections.
// Uses vite preview (pre-built dist), mocks all backend routes,
// navigates to patient → Clinica group → "Esami & Consulenze" tab.
// Usage: node e2e/esami-shot.mjs [frontendUrl] [outDir]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir = process.argv[3] ?? 'requirements/evidence/BUG-061';
mkdirSync(outDir, { recursive: true });

const PATIENT = {
  id: 'p-bug061',
  medicalRecordNumber: 'MRN-061',
  firstName: 'Lucia',
  lastName: 'Ferrari',
  dateOfBirth: '1955-09-22',
  sex: 'F',
  email: null,
  phone: null,
};

// Synthetic records — one per section so separation is visible
const ESAMI_EMATICI = [
  {
    id: 'ee-001',
    data: '2026-06-18',
    ora: '07:30',
    descrizione: 'Emocromo completo',
    esito: 'Hb 11.2 g/dL — lieve anemia microcitica; WBC 6.800; PLT 245.000.',
    allegati: 'emocromo_2026-06-18.pdf',
    note: '',
    operatore: 'Inf. Verdi',
    createdAt: '2026-06-18T07:30:00.000Z',
  },
  {
    id: 'ee-002',
    data: '2026-06-20',
    ora: '08:00',
    descrizione: 'Elettroliti sierici',
    esito: 'Na 138, K 3.9, Cl 102 — nella norma.',
    allegati: '',
    note: 'Ripetere in 5 giorni',
    operatore: 'Inf. Verdi',
    createdAt: '2026-06-20T08:00:00.000Z',
  },
];

const ESAMI_STRUMENTALI = [
  {
    id: 'es-001',
    data: '2026-06-19',
    ora: '',
    descrizione: 'RX torace in due proiezioni',
    esito:
      'Iperinfiltrazione basale bilaterale compatibile con bronchite cronica. Non versamento pleurico.',
    allegati: 'rx_torace_2026-06-19.jpg',
    note: '',
    operatore: 'Dr. Martini',
    createdAt: '2026-06-19T10:00:00.000Z',
  },
];

const CONSULENZE = [
  {
    id: 'co-001',
    data: '2026-06-21',
    ora: '11:00',
    descrizione: 'Visita cardiologica',
    esito:
      'ECG: ritmo sinusale, FC 78 bpm, non alterazioni significative. Ecocardio programmato tra 30 giorni.',
    allegati: '',
    note: 'Consultare cardiologo dott. Neri per follow-up',
    operatore: 'Dr. Neri',
    createdAt: '2026-06-21T11:00:00.000Z',
  },
];

const CARTELLA = {
  pazienteId: PATIENT.id,
  statoRicovero: 'ricoverato',
  cameraNumero: '12',
  lettoNumero: 'C',
  anamnesi: {
    anamnesiPatologicaRemota: 'BPCO, insufficienza cardiaca lieve',
    anamnesiPatologicaProssima: 'Riacutizzazione BPCO',
  },
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
  esamiEmatici: ESAMI_EMATICI,
  esamiStrumentali: ESAMI_STRUMENTALI,
  consulenze: CONSULENZE,
  dimissione: null,
};

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PATIENT]);
    if (url.match(/\/patients\/p-bug061$/) && method === 'GET') return json(PATIENT);
    if (url.match(/\/patients\/p-bug061\/cartella/) && method === 'GET')
      return json({ patientId: PATIENT.id, data: CARTELLA });
    if (url.match(/\/patients\/p-bug061\/therapies/) && method === 'GET') return json([]);
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/patients\/p-bug061\/narrative-sections/)) return json([]);
    if (url.match(/\/medication-administrations/)) return json([]);
    if (url.match(/\/therapy-slots/)) return json([]);
    return route.continue();
  });
}

const browser = await chromium.launch({ headless: true });
let success = false;

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await mockRoutes(page);

  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  // Login as Operatore
  const loginCard = page.locator('.login-role-card--operatore');
  if ((await loginCard.count()) > 0) {
    await loginCard.click();
    await page.waitForTimeout(1200);
  }

  // Navigate to Pazienti
  const nav = page
    .locator('[title="Pazienti"], .teams-sidebar__item')
    .filter({ hasText: /Pazienti/i })
    .first();
  if ((await nav.count()) > 0) {
    await nav.click();
  } else {
    await page.getByText('Pazienti').first().click();
  }
  await page.waitForTimeout(1200);

  // Open patient Ferrari Lucia
  const row = page.getByText('Ferrari').first();
  if ((await row.count()) > 0) await row.click();
  await page.waitForTimeout(1200);

  // Click "Clinica" L2 group
  const clinicaGroup = page.getByText('Clinica', { exact: true }).first();
  if ((await clinicaGroup.count()) > 0) {
    await clinicaGroup.click();
    await page.waitForTimeout(800);
  }

  // Click "Esami & Consulenze" L3 tab
  const esamiTab = page.getByText('Esami & Consulenze', { exact: true }).first();
  if ((await esamiTab.count()) > 0) {
    await esamiTab.click();
    await page.waitForTimeout(1200);
  }

  const outPath = resolve(outDir, 'esami-consulenze.png');
  await page.screenshot({ path: outPath, fullPage: true });
  success = true;
  console.log('Esami & Consulenze screenshot saved:', outPath);

  await page.close();
} catch (err) {
  console.error('E2E error:', err.message);
} finally {
  await browser.close();
  process.exit(success ? 0 : 1);
}
