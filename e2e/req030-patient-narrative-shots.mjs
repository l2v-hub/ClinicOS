// REQ-030 screenshots: Scheda Paziente narrative sections, driven on the real SPA with the
// narrative-sections API mocked (model-independent). node e2e/req030-patient-narrative-shots.mjs <url> <outDir>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const outDir = process.argv[3] ?? '.';
mkdirSync(outDir, { recursive: true });

const PID = 'pat-demo-1';
const PATIENT = {
  id: PID,
  medicalRecordNumber: 'MRN-1',
  firstName: 'Mario',
  lastName: 'Bianchi',
  dateOfBirth: '1948-07-23',
  sex: 'M',
};

function ann(raw, text, tagType) {
  const i = raw.indexOf(text);
  return { sectionKey: '', tagType, text, startOffset: i, endOffset: i + text.length };
}
const diag =
  'Scompenso cardiaco congestizio in classe NYHA III.\n\nIpertensione arteriosa.\nDiabete mellito tipo 2.';
const anam =
  'Anamnesi patologica remota: pregresso IMA nel 12/03/2018.\nAnamnesi familiare: padre cardiopatico.';
const ther = 'Ramipril 5 mg 1 cp al mattino.\nFurosemide 25 mg 1-0-0.';
const sec = (sectionKey, title, originalText, opts = {}) => ({
  sectionKey,
  title,
  originalText,
  reviewedText: opts.reviewedText ?? '',
  displayText: opts.reviewedText ? opts.reviewedText : originalText,
  annotations: opts.annotations ?? [],
  sourceReferences: opts.sources ?? [],
  reviewStatus: opts.reviewStatus ?? (originalText ? 'pending' : 'absent'),
});
const SECTIONS = [
  sec('ALLERGIES', 'Allergie', 'Allergia nota a Penicillina (reazione cutanea grave).', {
    annotations: [
      ann(
        'Allergia nota a Penicillina (reazione cutanea grave).',
        'Penicillina',
        'ALLERGY_CRITICAL',
      ),
    ],
    sources: [{ fileName: 'lettera-dimissione.pdf', pageFrom: 1 }],
    reviewStatus: 'pending',
  }),
  sec('DIAGNOSIS', 'Diagnosi', diag, {
    sources: [{ fileName: 'lettera-dimissione.pdf', pageFrom: 1 }],
  }),
  sec('ANAMNESIS', 'Anamnesi', anam, {
    annotations: [
      ann(anam, 'Anamnesi patologica remota', 'SUBSECTION_TITLE'),
      ann(anam, '12/03/2018', 'DATE'),
      ann(anam, 'Anamnesi familiare', 'SUBSECTION_TITLE'),
    ],
    sources: [{ fileName: 'lettera-dimissione.pdf', pageFrom: 2 }],
  }),
  sec(
    'HOSPITAL_COURSE',
    'Decorso ospedaliero',
    'Il 12/03/2025 ingresso. Il 18/03/2025 dimissione.',
    {
      annotations: [ann('Il 12/03/2025 ingresso. Il 18/03/2025 dimissione.', '12/03/2025', 'DATE')],
      sources: [{ fileName: 'lettera-dimissione.pdf', pageFrom: 2 }],
    },
  ),
  sec('CONSULTATIONS', 'Consulenze', ''), // empty -> "Nessuna informazione disponibile"
  sec('IMAGING_DIAGNOSTICS', 'Diagnostica per immagini', 'Rx torace: congestione. Eco: FE 35%.'),
  sec(
    'PROCEDURES_AND_INTERVENTIONS',
    'Prestazioni e interventi',
    'Posizionamento CVC il 12/03/2025.',
  ),
  sec('THERAPY', 'Terapia', ther, {
    reviewedText:
      'Ramipril 5 mg 1 cp al mattino.\nFurosemide 25 mg 1-0-0.\nNota operatore: rivalutare diuretico.',
    reviewStatus: 'modified',
    sources: [{ fileName: 'lettera-dimissione.pdf', pageFrom: 4 }],
  }),
  sec(
    'ADVICE_AND_FOLLOW_UP',
    'Consigli e controlli',
    'Controllo cardiologico tra 30 giorni. Dieta iposodica.',
  ),
  sec('UNMAPPED_CONTENT', 'Contenuto non classificato', 'Timbro reparto.'),
];

async function mock(page) {
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (b, s = 200) =>
      route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (url.match(new RegExp(`/patients/${PID}/narrative-sections`)))
      return json({ sections: SECTIONS, total: SECTIONS.length });
    if (url.match(/\/patients\/[^/]+\/cartella/)) return json({ error: 'none' }, 404);
    if (url.match(/\/patients\/[^/]+\/(diary|narrative)/))
      return json({ entries: [], sections: [] });
    if (url.match(/\/patients(\?|$)/)) return json([PATIENT]);
    if (url.includes('/patients/settings')) return json({ allowDelete: false });
    if (url.includes('/ai/extraction/status')) return json({ available: true, errors: [] });
    return route.continue();
  });
}

async function openNarrativeTab(page) {
  await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(700);
  await page.getByText('Operatore', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByText('Pazienti').first().click();
  await page.waitForTimeout(800);
  await page.getByText('Bianchi', { exact: false }).first().click();
  await page.waitForTimeout(1000);
  // L2 group "Clinica" (has a badge, so match by role+regex) -> L3 tab "Sezioni Cliniche (testo)"
  await page.getByRole('tab', { name: /Clinica/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: /Sezioni Cliniche/ }).click();
  await page.waitForSelector('[data-testid="patient-narrative-sections"]', { timeout: 15000 });
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
let fail = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('dialog', (d) => d.accept());
  const errors = [];
  page.on('console', (e) => e.type() === 'error' && errors.push(e.text()));
  await mock(page);
  await openNarrativeTab(page);
  await page.screenshot({
    path: resolve(outDir, 'patient-narrative-sections.png'),
    fullPage: true,
  });
  await page
    .locator('[data-testid="narr-CONSULTATIONS"]')
    .screenshot({ path: resolve(outDir, 'patient-empty-section.png') });
  await page
    .locator('[data-testid="narr-THERAPY"]')
    .screenshot({ path: resolve(outDir, 'patient-edited-section.png') });
  await page
    .locator('[data-testid="narr-DIAGNOSIS"]')
    .screenshot({ path: resolve(outDir, 'review-diagnosis-text.png') });
  await page
    .locator('[data-testid="narr-ALLERGIES"]')
    .screenshot({ path: resolve(outDir, 'review-allergies-text.png') });
  await page
    .locator('[data-testid="narr-ANAMNESIS"]')
    .screenshot({ path: resolve(outDir, 'review-anamnesis-text.png') });
  console.log(`desktop OK consoleErrors=${errors.length}`);
  if (errors.length) console.log('first:', errors[0]);
  await page.close();

  const tab = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  tab.on('dialog', (d) => d.accept());
  await mock(tab);
  await openNarrativeTab(tab);
  await tab.screenshot({ path: resolve(outDir, 'tablet-narrative-sections.png'), fullPage: true });
  console.log('tablet OK');
  await tab.close();
} catch (e) {
  fail = 1;
  console.log('FAILED:', e.message);
} finally {
  await browser.close();
}
process.exit(fail);
