// Verify the REAL ExtractionAgent loop (gemini function-calling) in PROD with a
// synthetic discharge letter. Checks new-vs-existing target + that the agent ran.
import { buildSyntheticPdf } from './real-pdf.mjs';
const API = 'https://clinicos-backend-production-df88.up.railway.app';
const base = `${API}/ai/extraction/jobs`;
const OP = { 'X-Operator-Id': 'op-agent-check', 'X-Operator-Role': 'operatore' };
const af = (url, opts = {}) => fetch(url, { ...opts, headers: { ...OP, ...(opts.headers ?? {}) } });

const pdf = buildSyntheticPdf([
  'LETTERA DI DIMISSIONE', 'Paziente: Giulia Verdi', 'Data di nascita: 03/03/1975',
  'Sesso: F', 'Diagnosi: Ipertensione arteriosa', 'Allergie: nessuna nota',
]);
const fd = new FormData();
fd.append('files', new Blob([pdf], { type: 'application/pdf' }), 'dimissione.pdf');

let jobId;
try {
  let r = await af(base, { method: 'POST', body: fd });
  let b = await r.json();
  jobId = b.job.id;
  console.log('upload:', r.status, 'fileCount=', b.job.fileCount);
  r = await af(`${base}/${jobId}/process`, { method: 'POST' });
  b = await r.json();
  console.log('process:', b.status, 'model=', b.model ?? '-', 'error=', b.error ?? '-');
  if (b.status === 'review_ready') {
    const rd = (await (await af(`${base}/${jobId}/result`)).json()).resultData ?? {};
    console.log('target.mode:', rd._target?.mode, '| reason:', rd._target?.reason ?? '-');
    console.log('nome:', JSON.stringify(rd.anagrafica?.nome?.value), '| cognome:', JSON.stringify(rd.anagrafica?.cognome?.value));
    console.log('report:', JSON.stringify(rd._merge?.report));
    console.log('AGENT PATH:', rd._target ? 'YES (agent ran)' : 'NO (legacy)');
  }
} catch (e) {
  console.log('ERROR:', e?.message ?? e);
} finally {
  if (jobId) { await af(`${base}/${jobId}/cancel`, { method: 'POST' }).catch(() => {}); console.log('cleanup: cancelled'); }
}
