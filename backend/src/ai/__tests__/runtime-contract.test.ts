import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeCreateBody, mapRuntimeStatus, wrapRuntimeResult } from '../upload/job-service.js';

// These field names MUST match clinicos-ai-runtime/clinicos_ai/domain/contracts.py
// (CreateJobRequest / RuntimeFile). A drift here is exactly the bug that sent every
// import to retryable_error: the backend sent `documents`/`content_b64` and read
// `.id`, while the runtime expects `files`/`content_base64` and returns `job_id`.

const DOCS = [
  { id: 'd1', filename: 'lettera.pdf', mimeType: 'application/pdf', data: Buffer.from('abc') },
  { id: 'd2', filename: 'foto.jpg', mimeType: 'image/jpeg', data: Buffer.from('xyz') },
];

test('create body matches the runtime neutral contract', () => {
  const body = buildRuntimeCreateBody('job-123', DOCS, { type: 'object' }, 'estrai');

  // top-level keys
  assert.deepEqual(Object.keys(body).sort(), ['external_job_id', 'files', 'prompt', 'schema']);
  assert.equal(body.external_job_id, 'job-123');
  assert.equal(body.prompt, 'estrai');
  assert.deepEqual(body.schema, { type: 'object' });

  // NOT the old wrong shape
  assert.ok(!('documents' in body), 'must use files, not documents');
  assert.ok(!('clinicos_job_id' in body), 'must use external_job_id');

  // per-file keys
  assert.equal(body.files.length, 2);
  const f0 = body.files[0];
  assert.deepEqual(Object.keys(f0).sort(), ['content_base64', 'filename', 'mime_type', 'sort_order']);
  assert.ok(!('content_b64' in f0), 'must use content_base64, not content_b64');
  assert.equal(f0.filename, 'lettera.pdf');
  assert.equal(f0.mime_type, 'application/pdf');
  assert.equal(f0.content_base64, Buffer.from('abc').toString('base64'));
  assert.equal(f0.sort_order, 0);
  assert.equal(body.files[1].sort_order, 1);
});

test('wrapRuntimeResult produces the merged-proposal shape the review UI needs', () => {
  const raw = {
    anagrafica: { nome: 'Mario', cognome: 'Bianchi', dataNascita: '1950-01-01' },
    cartella: { diagnosi: [{ descrizione: 'BPCO', codiceICD: 'J44.9' }], allergie: [{ allergene: 'Penicillina' }] },
  };
  const m = wrapRuntimeResult(raw, [{ id: 'd1', filename: 'lettera.pdf' }], 'google:gemma-4-31b-it', true);

  // _merge present (ImportReview reads proposal._merge.report — was crashing)
  assert.ok(m._merge, '_merge must exist');
  assert.equal(typeof m._merge.report.filled, 'number');

  // anagrafica fields are MergedField {status, value, ...}, not bare strings
  assert.equal(m.anagrafica.nome.value, 'Mario');
  assert.equal(m.anagrafica.nome.status, 'extracted');
  assert.equal(m.anagrafica.cognome.value, 'Bianchi');

  // cartella clinical arrays become MergedList {items:[...]}
  const diagnosi = m.cartella.diagnosi;
  assert.ok('items' in diagnosi, 'diagnosi must be a MergedList');
  assert.equal(diagnosi.items.length, 1);
  assert.equal(diagnosi.items[0].value.descrizione, 'BPCO');
});

test('wrapRuntimeResult tolerates empty/missing extraction', () => {
  const m = wrapRuntimeResult(null, [{ id: 'd1', filename: 'x.pdf' }], 'runtime', false);
  assert.ok(m._merge);
  assert.ok(m.anagrafica);
});

test('runtime status maps to ClinicOS job states', () => {
  assert.deepEqual(mapRuntimeStatus('review_ready'), { jobStatus: 'review_ready', isTerminal: true });
  assert.deepEqual(mapRuntimeStatus('completed'), { jobStatus: 'review_ready', isTerminal: true });
  assert.deepEqual(mapRuntimeStatus('retryable_error'), { jobStatus: 'retryable_error', isTerminal: true });
  assert.deepEqual(mapRuntimeStatus('failed'), { jobStatus: 'failed', isTerminal: true });
  assert.equal(mapRuntimeStatus('running').isTerminal, false);
  assert.equal(mapRuntimeStatus('ocr_running').isTerminal, false);
});
