// Verify REQ-016 multi-document merge CONFLICT against PROD with the real model.
// Two synthetic discharge letters for the same patient but DIFFERENT birth date /
// address -> the merge must surface an explicit conflict with candidates + sources.
import { buildSyntheticPdf } from './real-pdf.mjs';
const API = 'https://clinicos-backend-production-df88.up.railway.app';
const base = `${API}/ai/extraction/jobs`;
const OP = { 'X-Operator-Id': 'op-conflict-check', 'X-Operator-Role': 'operatore' };
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });

const docA = buildSyntheticPdf([
  'LETTERA DI DIMISSIONE',
  'Paziente: Mario Bianchi',
  'Data di nascita: 01/01/1950',
  'Indirizzo: Via Roma 1, Milano',
]);
const docB = buildSyntheticPdf([
  'LETTERA DI DIMISSIONE',
  'Paziente: Mario Bianchi',
  'Data di nascita: 02/02/1960',
  'Indirizzo: Via Milano 9, Roma',
]);

const fd = new FormData();
fd.append('files', new Blob([docA], { type: 'application/pdf' }), 'doc-a.pdf');
fd.append('files', new Blob([docB], { type: 'application/pdf' }), 'doc-b.pdf');

let jobId;
try {
  let res = await af(base, { method: 'POST', body: fd });
  let body = await res.json();
  jobId = body.job.id;
  console.log(`upload: ${res.status} fileCount=${body.job.fileCount}`);
  res = await af(`${base}/${jobId}/process`, { method: 'POST' });
  body = await res.json();
  console.log(`process: ${body.status} model=${body.model ?? '-'}`);
  res = await af(`${base}/${jobId}/result`);
  const rd = (await res.json()).resultData ?? {};
  const dob = rd.anagrafica?.dataNascita ?? {};
  const ind = rd.anagrafica?.indirizzo ?? {};
  console.log(
    'dataNascita.status:',
    dob.status,
    '| candidates:',
    JSON.stringify((dob.candidates ?? []).map((c) => c.value)),
  );
  console.log(
    'indirizzo.status:',
    ind.status,
    '| candidates:',
    JSON.stringify((ind.candidates ?? []).map((c) => c.value)),
  );
  console.log('report:', JSON.stringify(rd._merge?.report));
  console.log('documents in provenance:', (rd._merge?.documents ?? []).length);
} catch (e) {
  console.log('ERROR:', e?.message ?? e);
} finally {
  if (jobId) {
    await af(`${base}/${jobId}/cancel`, { method: 'POST' }).catch(() => {});
    console.log('cleanup: cancelled');
  }
}
