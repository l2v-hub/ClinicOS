// Servizio AI di prova per la verifica locale: stesso contratto «document-jobs» v2 del servizio
// vero, nessuna rete, nessun modello.
//   - OCR: restituisce la trascrizione REALE salvata (Mistral OCR sulla demo, documento sintetico)
//     della pagina riconosciuta dall'impronta del file;
//   - estrazione: restituisce l'estrazione ATTESA per la lettera sintetica nello schema ridotto
//     (è una simulazione: la risposta del modello vero si misura solo dopo il rilascio).
// Ritardi regolabili per provare il parallelismo: OCR_DELAY_MS, EXTRACTION_DELAY_MS.
// uso: AI_RUNTIME_SERVICE_TOKEN=... PORT=8000 node replay-runtime.mjs
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
const port = Number(process.env.PORT || 8000);
const ocrDelay = Number(process.env.OCR_DELAY_MS || 0);
const extractionDelay = Number(process.env.EXTRACTION_DELAY_MS || 0);
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const page = (n) => readFileSync(resolve(here, `ocr-pagina-${n}.md`), 'utf8').trim();
// Foto delle due pagine (due riprese diverse dello stesso foglio) → trascrizione della pagina.
const OCR = new Map(
  [
    ['telefono-1.jpg', 1],
    ['telefono-2.jpg', 2],
    ['foto-1.jpg', 1],
    ['foto-2.jpg', 2],
  ].map(([file, n]) => [sha(readFileSync(resolve(here, file))), page(n)]),
);
const farmaco = (nome, dose) => ({ nome, dose });
const EXTRACTION = {
  anagrafica: {
    nome: 'Giovanni',
    cognome: 'Bianchi',
    dataNascita: '1941-10-07',
    comuneNascita: 'Bologna',
    provinciaNascita: 'BO',
    sesso: 'M',
    telefono: '051 5550177',
    email: '',
    indirizzo: 'Via Mazzini 22',
    comune: 'Bologna',
    provincia: '',
    cap: '40137',
    contattoEmergenzaNome: 'Bianchi Marta',
    contattoEmergenzaRelazione: 'figlio',
    contattoEmergenzaTel: '333 5550123',
  },
  cartella: {
    codiceFiscale: 'BNCGNN41R07A944W',
    strutturaDimettente: 'Azienda Ospedaliera Santa Chiara',
    repartoDimettente: 'U.O. Medicina Interna 2',
    dataRicovero: '2026-11-09',
    dataDimissione: '2026-11-18',
    motivoRicovero: 'Dispnea ingravescente, ortopnea ed edemi declivi',
    medicoCurante: 'Dott.ssa Laura Conti',
    diagnosi: [
      {
        descrizione: 'Scompenso cardiaco acuto in cardiopatia ischemica cronica (FE 35%)',
        codiceICD: '',
        tipo: 'principale',
      },
      { descrizione: 'Fibrillazione atriale permanente', codiceICD: '', tipo: 'comorbidita' },
      {
        descrizione: 'Insufficienza renale cronica stadio IIIb',
        codiceICD: '',
        tipo: 'comorbidita',
      },
      {
        descrizione: 'Diabete mellito tipo 2 in terapia insulinica',
        codiceICD: '',
        tipo: 'comorbidita',
      },
      { descrizione: 'Ipertensione arteriosa', codiceICD: '', tipo: 'comorbidita' },
    ],
    allergie: [
      { allergene: 'Penicillina', reazione: 'rash cutaneo', gravita: '' },
      { allergene: 'FANS', reazione: 'gastralgia', gravita: '' },
    ],
    farmaci: [
      farmaco('Furosemide', '25 mg'),
      farmaco('Bisoprololo', '2,5 mg'),
      farmaco('Ramipril', '5 mg'),
      farmaco('Apixaban', '2,5 mg'),
      farmaco('Spironolattone', '25 mg'),
      farmaco('Atorvastatina', '40 mg'),
      farmaco('Insulina glargine', '18 UI'),
      farmaco('Insulina lispro', '6 UI'),
      farmaco('Pantoprazolo', '20 mg'),
      farmaco('Tiotropio', '18 mcg'),
    ],
  },
};

const jobs = new Map();
const external = new Map();
const log = []; // { unit, mode, startedAt, finishedAt, promptChars, schemaChars } — mai testo clinico
const started = Date.now();
const view = (job) => ({
  job_id: job.id,
  status: job.status,
  input_hash: job.input.input_hash,
  attempt: job.attempt,
  model: 'replay:demo-ocr+expected-extraction',
  error: job.error ?? null,
  finish_reason: 'stop',
  truncated: false,
});
function answer(job) {
  if (job.mode === 'ocr') {
    const file = job.input.files?.[0];
    const text = file && OCR.get(sha(Buffer.from(file.content_base64, 'base64')));
    if (!text) throw new Error('pagina non riconosciuta dal servizio di prova');
    return { rawText: text };
  }
  return EXTRACTION;
}
const server = createServer(async (req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/v1/runtime/health') return reply(200, { available: true, errors: [] });
  if (url.pathname === '/__log') return reply(200, log);
  if (req.headers.authorization !== `Bearer ${token}`) return reply(401, {});
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  if (url.pathname === '/v1/runtime/capabilities') {
    log.push({ unit: 'capabilities', at: Date.now() - started });
    return reply(200, { document_job_contract_version: 2, max_upload_bytes: 40 * 1024 * 1024 });
  }
  if (url.pathname === '/v1/document-jobs' && req.method === 'POST') {
    const job = external.get(body.external_job_id) ?? {
      id: randomUUID(),
      input: body,
      status: 'created',
      attempt: 0,
    };
    jobs.set(job.id, job);
    external.set(body.external_job_id, job);
    return reply(201, view(job));
  }
  const match = url.pathname.match(/^\/v1\/document-jobs\/([^/]+)(?:\/(run|retry|result))?$/);
  const job = match && jobs.get(match[1]);
  if (!job) return reply(404, {});
  if (match[2] === 'result')
    return reply(200, { ...view(job), data: job.status === 'review_ready' ? job.data : null });
  if (match[2] === 'run' || match[2] === 'retry') {
    if (job.status === 'created' || job.status === 'failed') {
      job.mode = job.mode ?? body.mode ?? 'extraction';
      job.attempt++;
      job.status = 'running';
      const entry = {
        unit: (job.input.external_job_id.split(':')[3] ?? '').slice(0, 8),
        mode: job.mode,
        startedAt: Date.now() - started,
        promptChars: job.input.prompt?.length ?? 0,
        schemaChars: JSON.stringify(job.input.schema ?? {}).length,
      };
      if (job.mode !== 'ocr') entry.prompt = job.input.prompt; // documento sintetico: per verificare cosa riceve il modello
      log.push(entry);
      setTimeout(
        () => {
          try {
            job.data = answer(job);
            job.status = 'review_ready';
          } catch (error) {
            job.status = 'failed';
            job.error = { kind: 'provider_error', message: String(error.message) };
          }
          entry.finishedAt = Date.now() - started;
        },
        job.mode === 'ocr' ? ocrDelay : extractionDelay,
      );
    }
    return reply(202, view(job));
  }
  return reply(200, view(job));
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `servizio AI di prova su ${port} (OCR ${ocrDelay} ms, estrazione ${extractionDelay} ms)`,
  ),
);
