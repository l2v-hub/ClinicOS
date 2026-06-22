// BUG-060: Screenshot proof for Scala Tinetti + Scala NRS tabs.
// Uses vite preview (pre-built dist), mocks all backend routes,
// navigates to the patient → Moduli group → respective tab.
// Usage: node e2e/scale-shots.mjs [frontendUrl] [outDir]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir   = process.argv[3] ?? 'requirements/evidence/BUG-060';
mkdirSync(outDir, { recursive: true });

const PATIENT = {
  id: 'p-bug060',
  medicalRecordNumber: 'MRN-060',
  firstName: 'Mario',
  lastName: 'Rossi',
  dateOfBirth: '1942-03-15',
  sex: 'M',
  email: null,
  phone: null,
};

// One pre-seeded Tinetti valutazione (score 21/28 → "Rischio moderato")
const TINETTI_VAL = {
  id: 'tv-001',
  data: '2026-06-20',
  // Equilibrio items (max 16)
  equilibrioSeduto: 1,
  alzarsi: 1,
  tentativiAlzarsi: 2,
  equilibrioImmediato: 1,
  equilibrioProlungato: 1,
  rombergSpinta: 1,
  occhiChiusi: 1,
  girarsi360Passi: 1,
  girarsi360Stabilita: 1,
  sedersi: 2,
  // Andatura items (max 12)
  iniziazione: 1,
  lunghezzaPassoDx: 1,
  altezzaPassoDx: 1,
  lunghezzaPassoSx: 1,
  altezzaPassoSx: 1,
  simmetria: 1,
  continuita: 1,
  traiettoria: 0,
  tronco: 0,
  cammino: 1,
  note: 'Valutazione post-recupero mobilità',
  operatore: 'Inf. Bianchi',
  createdAt: '2026-06-20T09:00:00.000Z',
};

// One pre-seeded NRS valutazione (score 4 → "Moderato")
const NRS_VAL = {
  id: 'nv-001',
  data: '2026-06-21',
  ora: '08:30',
  punteggio: 4,
  aRiposo: 2,
  inMovimento: 6,
  sede: 'Regione lombare',
  operatore: 'Inf. Bianchi',
  note: 'Dolore riferito al mattino',
  createdAt: '2026-06-21T08:30:00.000Z',
};

const CARTELLA = {
  pazienteId: PATIENT.id,
  statoRicovero: 'ricoverato',
  cameraNumero: '3',
  lettoNumero: 'A',
  anamnesi: { anamnesiPatologicaRemota: 'Artrite, ipertensione', anamnesiPatologicaProssima: 'Caduta accidentale' },
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
  valutazioniTinetti: [TINETTI_VAL],
  valutazioniNRS: [NRS_VAL],
  esamiEmatici: [],
  esamiStrumentali: [],
  consulenze: [],
  dimissione: null,
};

async function mockRoutes(page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.match(/\/patients(\?|$)/) && method === 'GET') return json([PATIENT]);
    if (url.match(/\/patients\/p-bug060$/) && method === 'GET') return json(PATIENT);
    if (url.match(/\/patients\/p-bug060\/cartella/) && method === 'GET') return json({ patientId: PATIENT.id, data: CARTELLA });
    if (url.match(/\/patients\/p-bug060\/therapies/) && method === 'GET') return json([]);
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/patients\/p-bug060\/narrative-sections/)) return json([]);
    if (url.match(/\/medication-administrations/)) return json([]);
    if (url.match(/\/therapy-slots/)) return json([]);
    return route.continue();
  });
}

async function loginAndGoToPatient(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  // Login as Operatore
  const loginCard = page.locator('.login-role-card--operatore');
  if (await loginCard.count() > 0) {
    await loginCard.click();
    await page.waitForTimeout(1200);
  }

  // Navigate to Pazienti
  const nav = page.locator('[title="Pazienti"], .teams-sidebar__item').filter({ hasText: /Pazienti/i }).first();
  if (await nav.count() > 0) {
    await nav.click();
  } else {
    await page.getByText('Pazienti').first().click();
  }
  await page.waitForTimeout(1200);

  // Open patient Rossi Mario
  const row = page.getByText('Rossi').first();
  if (await row.count() > 0) await row.click();
  await page.waitForTimeout(1200);
}

async function clickTab(page, groupLabel, tabLabel) {
  // Click L2 group (e.g. "Moduli")
  const group = page.getByText(groupLabel, { exact: true }).first();
  if (await group.count() > 0) {
    await group.click();
    await page.waitForTimeout(800);
  }
  // Click L3 tab (e.g. "Scala Tinetti")
  const tab = page.getByText(tabLabel, { exact: true }).first();
  if (await tab.count() > 0) {
    await tab.click();
    await page.waitForTimeout(1000);
  }
}

const browser = await chromium.launch({ headless: true });
const results = { tinetti: false, nrs: false };

try {
  // ── Screenshot 1: Scala Tinetti ──────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await mockRoutes(page);
    await loginAndGoToPatient(page);
    await clickTab(page, 'Moduli', 'Scala Tinetti');

    const outPath = resolve(outDir, 'tinetti-tab.png');
    await page.screenshot({ path: outPath, fullPage: false });
    results.tinetti = true;
    console.log('Tinetti screenshot saved:', outPath);
    await page.close();
  }

  // ── Screenshot 2: Scala NRS ───────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await mockRoutes(page);
    await loginAndGoToPatient(page);
    await clickTab(page, 'Moduli', 'Scala NRS');

    const outPath = resolve(outDir, 'nrs-tab.png');
    await page.screenshot({ path: outPath, fullPage: false });
    results.nrs = true;
    console.log('NRS screenshot saved:', outPath);
    await page.close();
  }
} catch (err) {
  console.error('E2E error:', err.message);
} finally {
  await browser.close();
  const ok = results.tinetti && results.nrs;
  console.log('Results:', JSON.stringify(results));
  process.exit(ok ? 0 : 1);
}
