// One-off: verify the AI-runtime import path end-to-end against PROD with a
// SYNTHETIC discharge letter (no real patient data). Async flow (REQ-022):
// upload -> process(202) -> poll status until terminal -> read result. Cleans up.
import { buildSyntheticPdf } from './real-pdf.mjs';

const API = 'https://clinicos-backend-production-df88.up.railway.app';
const base = `${API}/ai/extraction/jobs`;
const OP = { 'X-Operator-Id': 'op-runtime-check', 'X-Operator-Role': 'operatore' };
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  console.log(`process: HTTP ${res.status} status=${body.status}`);

  // Poll until terminal (review_ready / failed / retryable_error).
  const terminal = new Set(['review_ready', 'failed', 'retryable_error', 'cancelled', 'expired']);
  let last;
  for (let i = 0; i < 120; i++) {
    await sleep(3000);
    res = await af(`${base}/${jobId}`);
    last = await res.json();
    process.stdout.write(`  [${i}] status=${last.status} stage=${last.stage ?? '-'} model=${last.model ?? '-'}\n`);
    if (terminal.has(last.status)) break;
  }

  console.log(`\nFINAL: status=${last.status} model=${last.model ?? '-'}`);
  if (last.error) console.log(`error: ${last.error}`);

  if (last.status === 'review_ready') {
    res = await af(`${base}/${jobId}/result`);
    const result = await res.json();
    const rd = result.resultData ?? {};
    const anag = rd.anagrafica ?? {};
    console.log('--- extraction proposal ---');
    console.log('nome:', JSON.stringify(anag.nome), '| cognome:', JSON.stringify(anag.cognome), '| dataNascita:', JSON.stringify(anag.dataNascita));
    console.log('no AIza key in result:', !/AIza[0-9A-Za-z_-]{10,}/.test(JSON.stringify(result)));
    console.log('\n✅ PASS — runtime extraction reached review_ready');
  } else {
    console.log('\n❌ NOT review_ready — see error above');
  }
} catch (e) {
  console.log('ERROR:', e?.message ?? e);
} finally {
  if (jobId) { await af(`${base}/${jobId}/cancel`, { method: 'POST' }).catch(() => {}); console.log('cleanup: job cancelled'); }
}
