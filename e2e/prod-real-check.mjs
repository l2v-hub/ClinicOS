// One-off: verify REAL Gemma extraction against PROD with a SYNTHETIC discharge
// letter (no real patient data). Creates a job, runs extraction, checks the merged
// result, then cancels the job (cleanup). Never prints/handles the API key.
import { buildSyntheticPdf } from './real-pdf.mjs';
const API = 'https://clinicos-backend-production-df88.up.railway.app';
const base = `${API}/ai/extraction/jobs`;
const OP = { 'X-Operator-Id': 'op-prod-check', 'X-Operator-Role': 'operatore' };
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });

// Valid 1-page PDF with synthetic discharge-letter text (fake name/data only).
const LETTER = buildSyntheticPdf([
  'LETTERA DI DIMISSIONE OSPEDALIERA',
  'Paziente: Mario Bianchi',
  'Data di nascita: 01/01/1950',
  'Sesso: M',
  'Diagnosi principale: Broncopneumopatia cronica ostruttiva (BPCO)',
  'Allergie: Penicillina',
  'Terapia alla dimissione: Salbutamolo 100 mcg per via inalatoria',
]);

const fd = new FormData();
fd.append('files', new Blob([LETTER], { type: 'application/pdf' }), 'dimissione-sintetica.pdf');

let jobId;
try {
  let res = await af(base, { method: 'POST', body: fd });
  let body = await res.json();
  jobId = body.job.id;
  console.log(`upload: ${res.status}, fileCount=${body.job.fileCount}`);

  res = await af(`${base}/${jobId}/process`, { method: 'POST' });
  body = await res.json();
  console.log(
    `process: status=${body.status} model=${body.model ?? '-'} error=${body.error ?? '-'}`,
  );

  res = await af(`${base}/${jobId}/result`);
  const result = await res.json();
  const rd = result.resultData ?? {};
  const anag = rd.anagrafica ?? {};
  console.log('--- REAL extraction (merged proposal) ---');
  console.log('nome:', JSON.stringify(anag.nome));
  console.log('cognome:', JSON.stringify(anag.cognome));
  console.log('dataNascita:', JSON.stringify(anag.dataNascita));
  console.log(
    'diagnosi items:',
    (rd.cartella?.diagnosi?.items ?? []).map((i) => i.value?.descrizione),
  );
  console.log(
    'allergie items:',
    (rd.cartella?.allergie?.items ?? []).map((i) => i.value?.allergene),
  );
  console.log('merge version:', rd._merge?.version, '| report:', JSON.stringify(rd._merge?.report));

  const serialized = JSON.stringify(result);
  console.log('no AIza key in result:', !/AIza[0-9A-Za-z_-]{10,}/.test(serialized));
} catch (e) {
  console.log('ERROR:', e?.message ?? e);
} finally {
  if (jobId) {
    await af(`${base}/${jobId}/cancel`, { method: 'POST' }).catch(() => {});
    console.log('cleanup: job cancelled');
  }
}
