// Dump the raw _full extraction shape from a prod run (diagnosis why arrays are empty).
import { buildSyntheticPdf } from './real-pdf.mjs';
const API = 'https://clinicos-backend-production-df88.up.railway.app';
const base = `${API}/ai/extraction/jobs`;
const OP = { 'X-Operator-Id': 'op-dump', 'X-Operator-Role': 'operatore' };
const af = (u, o = {}) => fetch(u, { ...o, headers: { ...OP, ...(o.headers ?? {}) } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LETTER = buildSyntheticPdf([
  'LETTERA DI DIMISSIONE OSPEDALIERA',
  'Paziente: Mario Bianchi  Data di nascita: 01/01/1950  Sesso: M',
  'Diagnosi principale: Broncopneumopatia cronica ostruttiva (BPCO) - codice J44.1',
  'Comorbidità: Ipertensione arteriosa',
  'Allergie note: Penicillina (reazione cutanea grave)',
  'Terapia alla dimissione:',
  '- Salbutamolo 100 mcg inalatorio 2 volte/die',
  '- Ramipril 5 mg orale 1 volta/die',
]);
const fd = new FormData();
fd.append('files', new Blob([LETTER], { type: 'application/pdf' }), 'dimissione.pdf');

let jobId;
try {
  let r = await af(base, { method: 'POST', body: fd });
  jobId = (await r.json()).job.id;
  await af(`${base}/${jobId}/process`, { method: 'POST' });
  const term = new Set(['review_ready', 'failed', 'retryable_error', 'cancelled']);
  let last;
  for (let i = 0; i < 120; i++) {
    await sleep(3000);
    last = await (await af(`${base}/${jobId}`)).json();
    if (term.has(last.status)) break;
  }
  console.log('status:', last.status);
  if (last.status === 'review_ready') {
    const rd = (await (await af(`${base}/${jobId}/result`)).json()).resultData ?? {};
    console.log('\n=== _full.anagrafica ===');
    console.log(JSON.stringify(rd._full?.anagrafica ?? {}, null, 1));
    console.log('=== _full.cartella ===');
    console.log(JSON.stringify(rd._full?.cartella ?? {}, null, 1));
    console.log('=== rawText length ===', (rd.rawText ?? '').length);
  }
} finally {
  if (jobId) await af(`${base}/${jobId}/cancel`, { method: 'POST' }).catch(() => {});
}
