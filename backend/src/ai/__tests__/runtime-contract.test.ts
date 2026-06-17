import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeCreateBody, mapRuntimeStatus, wrapRuntimeResult } from '../upload/job-service.js';
import { buildModelSchema } from '../config.js';

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

// REQ-036: the operator-defined order must reach the runtime. runJob now reads documents
// ordered by sortOrder and passes them in that order; the body builder must preserve it so
// that reordering actually changes the page sequence (sort_order) sent for extraction.
test('REQ-036: reordered documents produce a reordered sort_order sequence', () => {
  const reordered = [DOCS[1], DOCS[0]]; // operator moved foto.jpg before lettera.pdf
  const body = buildRuntimeCreateBody('job-123', reordered, { type: 'object' }, 'estrai');
  assert.equal(body.files[0].filename, 'foto.jpg');
  assert.equal(body.files[0].sort_order, 0);
  assert.equal(body.files[1].filename, 'lettera.pdf');
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

test('buildModelSchema renders lists as example arrays (so the model fills them)', () => {
  const canonical = {
    _descrizione: 'x',
    anagrafica: { _nota: 'n', nome: { valore: '', descrizione: 'Nome' } },
    cartella: {
      statoRicovero: { valore: 'ricoverato | dimesso', descrizione: 'Stato' },
      anamnesi: { _descrizione: 'a', fisiologica: { valore: '', descrizione: 'F' } },
      diagnosi: {
        _descrizione: 'd',
        _template: { codiceICD: { valore: '', descrizione: 'ICD' }, descrizione: { valore: '', descrizione: 'Desc' } },
        valori: [],
      },
    },
  };
  const m = buildModelSchema(canonical) as any;

  // leaves kept (with descriptions), meta underscore keys dropped
  assert.deepEqual(m.anagrafica.nome, { valore: '', descrizione: 'Nome' });
  assert.ok(!('_nota' in m.anagrafica));
  assert.ok(!('_descrizione' in m));

  // nested group recursed
  assert.deepEqual(m.cartella.anamnesi.fisiologica, { valore: '', descrizione: 'F' });

  // list -> array with ONE example item built from the template (no _ keys)
  assert.ok(Array.isArray(m.cartella.diagnosi), 'diagnosi must be an array');
  assert.equal(m.cartella.diagnosi.length, 1);
  assert.deepEqual(Object.keys(m.cartella.diagnosi[0]).sort(), ['codiceICD', 'descrizione']);
});

test('runtime status maps to ClinicOS job states', () => {
  assert.deepEqual(mapRuntimeStatus('review_ready'), { jobStatus: 'review_ready', isTerminal: true });
  assert.deepEqual(mapRuntimeStatus('completed'), { jobStatus: 'review_ready', isTerminal: true });
  assert.deepEqual(mapRuntimeStatus('retryable_error'), { jobStatus: 'retryable_error', isTerminal: true });
  assert.deepEqual(mapRuntimeStatus('failed'), { jobStatus: 'failed', isTerminal: true });
  assert.equal(mapRuntimeStatus('running').isTerminal, false);
  assert.equal(mapRuntimeStatus('ocr_running').isTerminal, false);
});
