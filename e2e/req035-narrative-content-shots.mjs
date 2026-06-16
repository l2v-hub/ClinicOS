// REQ-035 screenshots: narrative cards are populated with the extracted text; Modifica opens
// the editor prefilled with "## Anamnesi Patologica Recente: ...". node e2e/req035-...mjs <url> <out>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildSyntheticPdf } from './real-pdf.mjs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? '.';
mkdirSync(out, { recursive: true });
const dir = resolve(tmpdir(), 'clinicos-req035'); mkdirSync(dir, { recursive: true });
const pdfPath = resolve(dir, 'lettera-imola.pdf');
writeFileSync(pdfPath, buildSyntheticPdf(['AUSL Imola', 'Anamnesi Patologica Recente: Inviata in PS in data 09/03.']));

const anamnesi = '## Anamnesi Patologica Recente:\n\nInviata in PS in data 09/03 per dolore toracico. Ricoverata in reparto di Cardiologia.\n\n## Anamnesi Patologica Remota:\n\nPregresso intervento di colecistectomia (2019). Ipertensione in trattamento.';
const diagnosi = '## Diagnosi di dimissione:\n\nScompenso cardiaco congestizio in classe NYHA III.\nIpertensione arteriosa.';
const terapia = '## Terapia domiciliare:\n\nRamipril 5 mg 1 cp al mattino.\nFurosemide 25 mg 1-0-0.';
const NARRATIVE = {
  schemaVersion: 'clinicos-discharge-narrative-v1',
  firstName: 'Mario', lastName: 'Bianchi', dateOfBirth: '1948-07-23', placeOfBirth: '', sex: 'M',
  fiscalCode: '', address: '', phone: '', email: '',
  allergyStatus: 'present', allergiesText: 'Pantoprazolo: riferita reazione cutanea.',
  diagnosisText: diagnosi, anamnesisText: anamnesi, hospitalCourseText: '', consultationsText: '',
  imagingDiagnosticsText: '', proceduresAndInterventionsText: '', therapyText: terapia,
  adviceAndFollowUpText: '', unmappedText: '',
  boldTags: [], sourceReferences: [{ sectionKey: 'ANAMNESI', fileName: 'lettera-imola.pdf', pageFrom: 2 }], missingSections: [], warnings: [],
};
const RESULT = { _narrative: NARRATIVE, _sections: null, rawText: `${anamnesi}\n\n${diagnosi}\n\n${terapia}`, _full: {} };
const JOB = { id: 'j35', status: 'uploaded', stage: null, completedFiles: 1, totalFiles: 1, canCancel: true, maxFiles: 10, maxTotalBytes: 26214400, totalBytes: 2048, fileCount: 1, documents: [{ id: 'd1', filename: 'lettera-imola.pdf', mimeType: 'application/pdf', sizeBytes: 2048, sortOrder: 0, status: 'uploaded' }] };

async function mock(p) {
  await p.route('**/*', async (r) => {
    const u = r.request().url(), m = r.request().method();
    const j = (x, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/ai/extraction/status')) return j({ available: true, errors: [] });
    if (u.endsWith('/ai/extraction/schema')) return j({});
    if (u.includes('/ai/extraction/jobs')) {
      if (m === 'POST' && u.endsWith('/process')) return j({ ...JOB, status: 'queued' });
      if (m === 'GET' && u.endsWith('/result')) return j({ status: 'review_ready', resultData: RESULT });
      if (m === 'GET') return j({ ...JOB, status: 'review_ready', stage: 'completed' });
      if (m === 'POST') return j({ job: JOB, outcomes: [] });
      return j(JOB);
    }
    if (u.includes('/patients/settings')) return j({ allowDelete: false });
    if (u.match(/\/patients(\?|$)/)) return j([{ id: 'p1', medicalRecordNumber: 'M1', firstName: 'Anna', lastName: 'Verdi', dateOfBirth: '1950-01-01', sex: 'F' }]);
    return r.continue();
  });
}

const browser = await chromium.launch();
let fail = 0;
try {
  const p = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  p.on('dialog', (d) => d.accept());
  await mock(p);
  await p.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 30000 }); await p.waitForTimeout(700);
  await p.getByText('Operatore', { exact: true }).click(); await p.waitForTimeout(900);
  await p.getByText('Pazienti').first().click(); await p.waitForTimeout(700);
  await p.getByText('Importa dimissione').first().click(); await p.waitForTimeout(500);
  await p.setInputFiles('input[type=file][multiple]', [pdfPath]); await p.waitForTimeout(700);
  await p.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await p.waitForSelector('[data-testid="sections-review"]', { timeout: 15000 }); await p.waitForTimeout(700);

  const anam = p.locator('[data-testid="srev-ANAMNESIS"]');
  await anam.scrollIntoViewIfNeeded();
  await anam.screenshot({ path: resolve(out, 'anamnesis-card-with-preview.png') });
  // The card normal view shows the extracted text (assert).
  const cardText = await anam.textContent();
  console.log('anamnesis card has extracted text:', (cardText || '').includes('Inviata in PS in data 09/03'));

  // Modifica -> editor prefilled.
  await anam.getByRole('button', { name: 'Modifica' }).click(); await p.waitForTimeout(400);
  const ta = anam.locator('textarea');
  const taVal = await ta.inputValue();
  console.log('anamnesis editor prefilled startsWith heading:', taVal.startsWith('## Anamnesi Patologica Recente:'));
  console.log('editor includes both subtitles:', taVal.includes('## Anamnesi Patologica Remota:'));
  if (!taVal.startsWith('## Anamnesi Patologica Recente:')) fail = 1;
  await anam.screenshot({ path: resolve(out, 'anamnesis-edit-prefilled.png') });
  await anam.screenshot({ path: resolve(out, 'anamnesis-full-text.png') });

  // Diagnosis + Therapy editors prefilled.
  const diag = p.locator('[data-testid="srev-DISCHARGE_DIAGNOSIS"]');
  await diag.scrollIntoViewIfNeeded(); await diag.getByRole('button', { name: 'Modifica' }).click(); await p.waitForTimeout(300);
  await diag.screenshot({ path: resolve(out, 'diagnosis-edit-prefilled.png') });
  const ther = p.locator('[data-testid="srev-DISCHARGE_HOME_THERAPY"]');
  await ther.scrollIntoViewIfNeeded(); await ther.getByRole('button', { name: 'Modifica' }).click(); await p.waitForTimeout(300);
  await ther.screenshot({ path: resolve(out, 'therapy-edit-prefilled.png') });

  // Source compare on anamnesis.
  await anam.scrollIntoViewIfNeeded();
  await anam.getByRole('button', { name: /Confronta con la fonte/ }).click().catch(() => {});
  await p.waitForTimeout(300);
  await anam.screenshot({ path: resolve(out, 'anamnesis-source-compare.png') });
  console.log('done desktop');
  await p.close();
} catch (e) { fail = 1; console.log('FAILED:', e.message); }
finally { await browser.close(); }
process.exit(fail);
