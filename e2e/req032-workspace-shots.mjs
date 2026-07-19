// REQ-032 screenshots: wide two-panel import/review workspace with real PDF + image
// preview, driven on the SPA with job endpoints mocked. node e2e/req032-workspace-shots.mjs <url> <out>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildSyntheticPdf } from './real-pdf.mjs';
import { SECTIONS_FIXTURE } from './req027-sections-fixture.mjs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir = process.argv[3] ?? '.';
mkdirSync(outDir, { recursive: true });

const dir = resolve(tmpdir(), 'clinicos-req032');
mkdirSync(dir, { recursive: true });
const pdfPath = resolve(dir, 'lettera-dimissione-imola.pdf');
const svgPath = resolve(dir, 'foto-documento-imola.svg');
writeFileSync(
  pdfPath,
  buildSyntheticPdf([
    'AUSL Imola - Lettera di dimissione',
    '',
    'Paziente: Mario Bianchi  nato 23/07/1948',
    'Diagnosi di dimissione: Scompenso cardiaco congestizio (NYHA III).',
    'Allergia nota a Penicillina (reazione cutanea grave).',
    'Terapia domiciliare: Ramipril 5 mg 1 cp/die; Furosemide 25 mg 1-0-0.',
    'Controllo cardiologico tra 30 giorni. Dieta iposodica.',
  ]),
);
writeFileSync(
  svgPath,
  `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="700" height="950">
<rect width="700" height="950" fill="#ffffff"/><rect x="0" y="0" width="700" height="70" fill="#0F5FD7"/>
<text x="24" y="44" font-family="Arial" font-size="24" fill="#fff">AUSL Imola — Lettera di dimissione</text>
<text x="24" y="120" font-family="Arial" font-size="18">Paziente: Mario Bianchi</text>
<text x="24" y="150" font-family="Arial" font-size="18">Diagnosi: Scompenso cardiaco congestizio.</text>
<text x="24" y="180" font-family="Arial" font-size="18">Allergie: Penicillina (grave).</text>
<text x="24" y="210" font-family="Arial" font-size="18">Terapia: Ramipril 5 mg, Furosemide 25 mg.</text></svg>`,
);

const RAWTEXT =
  'AUSL Imola - Lettera di dimissione\nPaziente: Mario Bianchi nato 23/07/1948\nDiagnosi di dimissione: Scompenso cardiaco.\nAllergia a Penicillina.\nTerapia: Ramipril 5 mg. [ILLEGGIBILE] 1-0-1.';
const JOB = {
  id: 'job-32',
  status: 'uploaded',
  stage: null,
  completedFiles: 2,
  totalFiles: 2,
  currentFileName: null,
  elapsedSeconds: 0,
  canRetry: false,
  canCancel: true,
  maxFiles: 10,
  maxTotalBytes: 26214400,
  totalBytes: 4096,
  fileCount: 2,
  error: null,
  model: null,
  documents: [
    {
      id: 'doc-1',
      filename: 'lettera-dimissione-imola.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      sortOrder: 0,
      status: 'uploaded',
      logicalDoc: null,
    },
    {
      id: 'doc-2',
      filename: 'foto-documento-imola.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 2048,
      sortOrder: 1,
      status: 'uploaded',
      logicalDoc: null,
    },
  ],
};

async function mock(page) {
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const m = req.method();
    const json = (b, s = 200) =>
      route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (url.includes('/ai/extraction/status')) return json({ available: true, errors: [] });
    if (url.endsWith('/ai/extraction/schema')) return json({});
    if (url.includes('/ai/extraction/jobs')) {
      if (m === 'POST' && url.endsWith('/process'))
        return json({ ...JOB, status: 'queued', stage: 'queued' });
      if (m === 'POST' && url.endsWith('/confirm'))
        return json(
          {
            status: 'created',
            patient: {
              id: 'p1',
              firstName: 'Mario',
              lastName: 'Bianchi',
              medicalRecordNumber: 'MRN-D',
            },
          },
          201,
        );
      if (m === 'GET' && url.endsWith('/result'))
        return json({
          status: 'review_ready',
          model: 'demo',
          resultData: { _sections: SECTIONS_FIXTURE, rawText: RAWTEXT, _full: {} },
        });
      if (m === 'GET') return json({ ...JOB, status: 'review_ready', stage: 'completed' });
      if (m === 'POST')
        return json({
          job: JOB,
          outcomes: [
            { filename: 'lettera-dimissione-imola.pdf', status: 'accepted' },
            { filename: 'foto-documento-imola.svg', status: 'accepted' },
          ],
        });
      return json(JOB);
    }
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.match(/\/patients(\?|$)/))
      return json([
        {
          id: 'p1',
          medicalRecordNumber: 'MRN-1',
          firstName: 'Anna',
          lastName: 'Verdi',
          dateOfBirth: '1950-01-01',
          sex: 'F',
        },
      ]);
    return route.continue();
  });
}

async function toReview(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(700);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(700);
  await page.getByText('Importa dimissione').first().click();
  await page.waitForTimeout(500);
  await page.setInputFiles('input[type=file][multiple]', [pdfPath, svgPath]);
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
let fail = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  const errs = [];
  page.on('console', (e) => e.type() === 'error' && errs.push(e.text()));
  await mock(page);
  await toReview(page);
  await page.screenshot({ path: resolve(outDir, 'wide-upload-modal.png') });
  await page.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await page.waitForSelector('[data-testid="document-preview"]', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(outDir, 'review-two-panels.png') });
  await page
    .locator('[data-testid="document-preview"]')
    .screenshot({ path: resolve(outDir, 'wide-pdf-preview.png') });
  // zoom in twice -> ~150%
  await page.getByRole('button', { name: 'Aumenta zoom' }).click();
  await page.getByRole('button', { name: 'Aumenta zoom' }).click();
  await page.waitForTimeout(400);
  await page
    .locator('[data-testid="document-preview"]')
    .screenshot({ path: resolve(outDir, 'pdf-zoom-150.png') });
  // page navigation indicator
  await page
    .getByRole('button', { name: 'Pagina successiva' })
    .click()
    .catch(() => {});
  await page.waitForTimeout(300);
  await page
    .locator('[data-testid="document-preview"]')
    .screenshot({ path: resolve(outDir, 'pdf-page-navigation.png') });
  // next document -> image
  await page.getByRole('button', { name: 'Documento successivo' }).click();
  await page.waitForTimeout(500);
  await page
    .locator('[data-testid="document-preview"]')
    .screenshot({ path: resolve(outDir, 'wide-image-preview.png') });
  await page.getByRole('button', { name: /Ruota/ }).click();
  await page.waitForTimeout(400);
  await page
    .locator('[data-testid="document-preview"]')
    .screenshot({ path: resolve(outDir, 'image-rotation.png') });
  // OCR text view
  await page.getByRole('button', { name: 'Testo riconosciuto' }).click();
  await page.waitForTimeout(400);
  await page
    .locator('[data-testid="document-preview"]')
    .screenshot({ path: resolve(outDir, 'ocr-text-view.png') });
  // allergy source link
  await page
    .getByText('Documento originale', { exact: true })
    .click()
    .catch(() => {});
  await page
    .getByRole('button', { name: 'Vai alla fonte' })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(outDir, 'allergy-source-preview.png') });
  console.log(`desktop OK errs=${errs.length}`);
  if (errs.length) console.log('first:', errs[0]);
  await page.close();

  // tablet
  const tab = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  tab.on('dialog', (d) => d.accept());
  await mock(tab);
  await toReview(tab);
  await tab.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await tab.waitForSelector('[data-testid="document-preview"]', { timeout: 15000 });
  await tab.waitForTimeout(700);
  await tab.screenshot({ path: resolve(outDir, 'tablet-document-tab.png') });
  await tab.close();

  // mobile
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mob.on('dialog', (d) => d.accept());
  await mock(mob);
  await toReview(mob);
  await mob.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await mob.waitForSelector('[data-testid="document-preview"]', { timeout: 15000 });
  await mob.waitForTimeout(700);
  await mob.screenshot({ path: resolve(outDir, 'mobile-fullscreen-review.png') });
  await mob.close();
  console.log('tablet + mobile OK');
} catch (e) {
  fail = 1;
  console.log('FAILED:', e.message);
} finally {
  await browser.close();
}
process.exit(fail);
