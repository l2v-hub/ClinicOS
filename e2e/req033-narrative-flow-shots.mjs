// REQ-033 screenshots: prove the DEFAULT import review renders narrative text blocks (no
// Diagnosi(N) / ICD table) even when the legacy _full.cartella.diagnosi[36] array is present
// in the payload (it must be ignored). node e2e/req033-narrative-flow-shots.mjs <url> <out>
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildSyntheticPdf } from './real-pdf.mjs';

const FRONTEND = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? '.';
mkdirSync(out, { recursive: true });
const dir = resolve(tmpdir(), 'clinicos-req033'); mkdirSync(dir, { recursive: true });
const pdfPath = resolve(dir, 'lettera-dimissione-imola.pdf');
writeFileSync(pdfPath, buildSyntheticPdf(['AUSL Imola - Lettera di dimissione', 'Diagnosi: Scompenso cardiaco.']));
const svgPath = resolve(dir, 'foto.svg');
writeFileSync(svgPath, '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="700" height="950"><rect width="700" height="950" fill="#fff"/><rect width="700" height="70" fill="#0F5FD7"/><text x="20" y="44" font-size="22" fill="#fff" font-family="Arial">AUSL Imola</text></svg>');

const t = (raw, txt, tag, it) => { const i = raw.indexOf(txt); return { sectionKey: it, tagType: tag, text: txt, startOffset: i, endOffset: i + txt.length }; };
const diag = 'Scompenso cardiaco congestizio in classe NYHA III.\n\nIpertensione arteriosa di vecchia data.\nDiabete mellito tipo 2.\nInsufficienza renale cronica.';
const anam = 'Anamnesi patologica remota: pregresso IMA nel 12/03/2018.\nAnamnesi familiare: padre cardiopatico.';
const ther = 'Ramipril 5 mg 1 cp al mattino.\nFurosemide 25 mg 1-0-0.\n[ILLEGGIBILE] 1-0-1 secondo schema.';
const allg = 'Allergia nota a Pantoprazolo: riferita reazione cutanea.';
const NARRATIVE = {
  schemaVersion: 'clinicos-discharge-narrative-v1',
  firstName: 'Mario', lastName: 'Bianchi', dateOfBirth: '1948-07-23', placeOfBirth: 'Imola', sex: 'M',
  fiscalCode: 'BNCMRA48L23A944K', address: 'Via Roma 10, Imola', phone: '0542 000000', email: '',
  allergyStatus: 'present', allergiesText: allg,
  diagnosisText: diag, anamnesisText: anam, hospitalCourseText: 'Il 12/03/2025 ingresso. Il 18/03/2025 dimissione.',
  consultationsText: 'Consulenza cardiologica del 13/03/2025.', imagingDiagnosticsText: 'Rx torace: congestione polmonare.',
  proceduresAndInterventionsText: 'Posizionamento CVC il 12/03/2025.', therapyText: ther,
  adviceAndFollowUpText: 'Controllo cardiologico tra 30 giorni. Dieta iposodica.', unmappedText: '',
  boldTags: [t(anam, 'Anamnesi patologica remota', 'SUBSECTION_TITLE', 'ANAMNESI'), t(anam, '12/03/2018', 'DATE', 'ANAMNESI'), t(allg, 'Pantoprazolo', 'ALLERGY_CRITICAL', 'ALLERGIE'), t(ther, 'Ramipril', 'MEDICATION_NAME', 'TERAPIA')],
  sourceReferences: [{ sectionKey: 'DIAGNOSI', fileName: 'lettera-dimissione-imola.pdf', pageFrom: 1 }, { sectionKey: 'ALLERGIE', fileName: 'lettera-dimissione-imola.pdf', pageFrom: 1 }],
  missingSections: [], warnings: [],
};
// Legacy arrays present in the payload (36 diagnoses) — MUST be ignored by the UI.
const legacyDiagnosi = Array.from({ length: 36 }, (_, i) => ({ codiceICD: `J44.${i}`, descrizione: `Diagnosi legacy ${i + 1}`, tipo: i === 0 ? 'principale' : 'comorbidita', stato: 'attiva' }));
const RESULT = { _narrative: NARRATIVE, _sections: null, rawText: 'AUSL Imola - Lettera di dimissione\nDiagnosi: Scompenso cardiaco.\nTerapia: Ramipril. [ILLEGGIBILE] 1-0-1.', _full: { anagrafica: { nome: 'Mario', cognome: 'Bianchi' }, cartella: { diagnosi: legacyDiagnosi, farmaci: [] } }, _merge: { report: { conflict: 0 } } };
const JOB = { id: 'j33', status: 'uploaded', stage: null, completedFiles: 2, totalFiles: 2, canCancel: true, maxFiles: 10, maxTotalBytes: 26214400, totalBytes: 4096, fileCount: 2, documents: [{ id: 'd1', filename: 'lettera-dimissione-imola.pdf', mimeType: 'application/pdf', sizeBytes: 2048, sortOrder: 0, status: 'uploaded' }, { id: 'd2', filename: 'foto.svg', mimeType: 'image/svg+xml', sizeBytes: 2048, sortOrder: 1, status: 'uploaded' }] };

async function mock(p) {
  await p.route('**/*', async (r) => {
    const u = r.request().url(), m = r.request().method();
    const j = (x, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/ai/extraction/status')) return j({ available: true, errors: [] });
    if (u.endsWith('/ai/extraction/schema')) return j({});
    if (u.includes('/ai/extraction/jobs')) {
      if (m === 'POST' && u.endsWith('/process')) return j({ ...JOB, status: 'queued' });
      if (m === 'POST' && u.endsWith('/confirm')) return j({ status: 'created', patient: { id: 'p1', firstName: 'Mario', lastName: 'Bianchi', medicalRecordNumber: 'MRN-D' } }, 201);
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
  await p.screenshot({ path: resolve(out, 'wide-upload-real-component.png') });
  await p.setInputFiles('input[type=file][multiple]', [pdfPath, svgPath]); await p.waitForTimeout(700);
  await p.getByRole('button', { name: /Avvia elaborazione/i }).click();
  await p.waitForSelector('[data-testid="sections-review"]', { timeout: 15000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: resolve(out, 'wide-review-real-component.png') });
  await p.locator('[data-testid="srev-DISCHARGE_DIAGNOSIS"]').screenshot({ path: resolve(out, 'after-runtime-diagnosis-text.png') });
  await p.locator('[data-testid="srev-ALLERGIES"]').screenshot({ path: resolve(out, 'after-runtime-allergies-text.png') });
  await p.locator('[data-testid="srev-ANAMNESIS"]').screenshot({ path: resolve(out, 'after-runtime-anamnesis-text.png') });
  await p.locator('[data-testid="srev-DISCHARGE_HOME_THERAPY"]').screenshot({ path: resolve(out, 'after-runtime-therapy-text.png') });
  // Negative assertions on the rendered review.
  const body = await p.textContent('body');
  const bad = ['Diagnosi (', 'ICD', 'COMORBIDITA', '+ Diagnosi'].filter((s) => body.includes(s));
  console.log('NEGATIVE CHECK — forbidden strings present:', JSON.stringify(bad));
  console.log('has "Diagnosi" title:', body.includes('Diagnosi'));
  if (bad.length) fail = 1;
  await p.close();
} catch (e) { fail = 1; console.log('FAILED:', e.message); }
finally { await browser.close(); }
process.exit(fail);
