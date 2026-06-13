import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateExtraction, normalizeDate } from '../extraction-validate.js';
import { MockExtractionProvider } from '../providers/mock.js';
import { loadExtractionSchema, loadExtractionPrompt, loadAiConfig } from '../config.js';

const VALID = {
  anagrafica: { nome: 'Mario', cognome: 'Rossi', dataNascita: '1948-03-15', sesso: 'M' },
  cartella: {
    statoRicovero: 'ricoverato',
    diagnosi: [{ codiceICD: 'J44.1', descrizione: 'BPCO', tipo: 'principale', stato: 'attiva' }],
    allergie: [],
    farmaci: [{ nome: 'Aspirina', dose: '100 mg', via: 'orale', stato: 'attivo' }],
    terapie: [],
    parametriVitali: [],
  },
};

test('valid extraction passes schema', () => {
  const r = validateExtraction(VALID);
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test('missing required container fails', () => {
  const r = validateExtraction({ anagrafica: {} });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('cartella') || e.includes('required')));
});

test('wrong type fails (anagrafica.nome as object, not string)', () => {
  const bad = { anagrafica: { nome: { valore: '' } }, cartella: {} };
  const r = validateExtraction(bad);
  assert.equal(r.valid, false);
});

test('invalid enum fails (sesso=X)', () => {
  const bad = { anagrafica: { sesso: 'X' }, cartella: {} };
  const r = validateExtraction(bad);
  assert.equal(r.valid, false);
});

test('diagnosi must be an array', () => {
  const bad = { anagrafica: {}, cartella: { diagnosi: 'BPCO' } };
  const r = validateExtraction(bad);
  assert.equal(r.valid, false);
});

test('errors are content-free (path + rule only)', () => {
  const r = validateExtraction({ anagrafica: { sesso: 'X' }, cartella: {} });
  assert.ok(r.errors.length > 0);
  for (const e of r.errors) assert.ok(typeof e === 'string' && e.length < 200);
});

test('mock provider returns a schema-valid, empty (uninvented) instance', async () => {
  loadAiConfig(true);
  const provider = new MockExtractionProvider();
  const result = await provider.extract({
    jobId: 'j1',
    files: [],
    schema: loadExtractionSchema(),
    prompt: loadExtractionPrompt(),
  });
  assert.equal(result.valid, true);
  const check = validateExtraction(result.data);
  assert.equal(check.valid, true);
  // No invented data: name fields empty, lists empty.
  const data = result.data as { anagrafica: { nome: string }; cartella: { diagnosi: unknown[] } };
  assert.equal(data.anagrafica.nome, '');
  assert.equal(data.cartella.diagnosi.length, 0);
});

test('normalizeDate: IT/ISO handling, no guessing', () => {
  assert.equal(normalizeDate('15/03/1948'), '1948-03-15');
  assert.equal(normalizeDate('15-03-1948'), '1948-03-15');
  assert.equal(normalizeDate('1948-03-15'), '1948-03-15');
  assert.equal(normalizeDate('marzo 1948'), 'marzo 1948'); // unrecognized -> unchanged
  assert.equal(normalizeDate(''), '');
});
