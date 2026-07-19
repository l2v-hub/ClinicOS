import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeExtractions, type DocResult, type MergedField, type MergedList } from '../merge.js';

function doc(id: string, filename: string, data: DocResult['data'], docDate?: string): DocResult {
  return { docId: id, filename, model: 'mock', docDate, data };
}

const baseAnag = { nome: 'Mario', cognome: 'Rossi', dataNascita: '1948-03-15', sesso: 'M' };

test('identical documents -> single proposal, no duplicates, sources from both', () => {
  const d1 = doc('a', 'dim1.pdf', {
    anagrafica: baseAnag,
    cartella: { diagnosi: [{ codiceICD: 'J44.1', descrizione: 'BPCO' }] },
  });
  const d2 = doc('b', 'dim2.pdf', {
    anagrafica: baseAnag,
    cartella: { diagnosi: [{ codiceICD: 'J44.1', descrizione: 'BPCO' }] },
  });
  const m = mergeExtractions([d1, d2]);
  const nome = m.anagrafica.nome as MergedField;
  assert.equal(nome.status, 'extracted');
  assert.equal(nome.value, 'Mario');
  assert.equal(nome.sources.length, 2, 'both docs cited');
  const diag = m.cartella.diagnosi as MergedList;
  assert.equal(diag.items.length, 1, 'one merged diagnosis');
  assert.equal(diag.duplicatesRemoved, 1);
  assert.equal(diag.status, 'extracted');
});

test('differing addresses -> conflict with candidates + provenance, never auto-picked', () => {
  const d1 = doc('a', 'dim1.pdf', {
    anagrafica: { ...baseAnag, indirizzo: 'Via Roma 1' },
    cartella: {},
  });
  const d2 = doc('b', 'dim2.pdf', {
    anagrafica: { ...baseAnag, indirizzo: 'Via Milano 2' },
    cartella: {},
  });
  const m = mergeExtractions([d1, d2]);
  const ind = m.anagrafica.indirizzo as MergedField;
  assert.equal(ind.status, 'conflict');
  assert.equal(ind.value, undefined, 'no silent winner');
  assert.equal(ind.candidates?.length, 2);
  const vals = ind.candidates!.map((c) => c.value);
  assert.ok(vals.includes('Via Roma 1') && vals.includes('Via Milano 2'));
  assert.ok(
    ind.candidates!.every((c) => c.sources.length >= 1),
    'each candidate keeps its source',
  );
  assert.ok(m._merge.report.conflict >= 1);
});

test('duplicate therapy (same drug+dose) -> deduped to one item', () => {
  const t = { nome: 'Aspirina', dose: '100 mg', via: 'orale' };
  const d1 = doc('a', 'dim1.pdf', { cartella: { farmaci: [t] } });
  const d2 = doc('b', 'dim2.pdf', { cartella: { farmaci: [{ ...t }] } });
  const m = mergeExtractions([d1, d2]);
  const far = m.cartella.farmaci as MergedList;
  assert.equal(far.items.length, 1);
  assert.equal(far.items[0].status, 'extracted');
  assert.equal(far.duplicatesRemoved, 1);
  assert.equal(far.items[0].sources.length, 2);
});

test('updated therapy (same drug, different dose) -> item conflict', () => {
  const d1 = doc('a', 'dim1.pdf', {
    cartella: { farmaci: [{ nome: 'Aspirina', dose: '100 mg' }] },
  });
  const d2 = doc('b', 'dim2.pdf', {
    cartella: { farmaci: [{ nome: 'Aspirina', dose: '150 mg' }] },
  });
  const m = mergeExtractions([d1, d2]);
  const far = m.cartella.farmaci as MergedList;
  assert.equal(far.items.length, 1, 'same drug key -> one merged item');
  assert.equal(far.items[0].status, 'conflict');
  assert.equal(far.items[0].candidates?.length, 2);
  assert.equal(far.status, 'conflict');
});

test('allergy present in only one document -> extracted, keeps that single source', () => {
  const d1 = doc('a', 'dim1.pdf', {
    cartella: { allergie: [{ allergene: 'Penicillina', gravita: 'grave' }] },
  });
  const d2 = doc('b', 'dim2.pdf', { cartella: { allergie: [] } });
  const m = mergeExtractions([d1, d2]);
  const all = m.cartella.allergie as MergedList;
  assert.equal(all.items.length, 1);
  assert.equal(all.items[0].status, 'extracted');
  assert.equal(all.items[0].sources.length, 1);
  assert.equal(all.items[0].sources[0].filename, 'dim1.pdf');
});

test('missing field across all docs -> missing, no invention', () => {
  const m = mergeExtractions([doc('a', 'x.pdf', { anagrafica: { nome: 'Mario' }, cartella: {} })]);
  const tel = m.anagrafica.telefono as MergedField;
  assert.equal(tel.status, 'missing');
  assert.equal(tel.value, '');
  assert.equal(tel.sources.length, 0);
});

test('preferRecent orders conflict candidates most-recent-first (still not resolved)', () => {
  const d1 = doc(
    'a',
    'old.pdf',
    { anagrafica: { indirizzo: 'Via Vecchia' }, cartella: {} },
    '2020-01-01',
  );
  const d2 = doc(
    'b',
    'new.pdf',
    { anagrafica: { indirizzo: 'Via Nuova' }, cartella: {} },
    '2024-06-01',
  );
  const m = mergeExtractions([d1, d2], { preferRecent: true });
  const ind = m.anagrafica.indirizzo as MergedField;
  assert.equal(ind.status, 'conflict');
  assert.equal(ind.candidates![0].value, 'Via Nuova', 'most recent first');
});

test('report counts filled/missing/conflict/duplicate', () => {
  const d1 = doc('a', 'd1.pdf', {
    anagrafica: { nome: 'Mario', indirizzo: 'Via Roma' },
    cartella: { diagnosi: [{ codiceICD: 'J44.1', descrizione: 'BPCO' }] },
  });
  const d2 = doc('b', 'd2.pdf', {
    anagrafica: { nome: 'Mario', indirizzo: 'Via Milano' },
    cartella: { diagnosi: [{ codiceICD: 'J44.1', descrizione: 'BPCO' }] },
  });
  const m = mergeExtractions([d1, d2]);
  assert.ok(m._merge.report.conflict >= 1, 'address conflict counted');
  assert.ok(m._merge.report.duplicate >= 1, 'duplicate diagnosis counted');
  assert.ok(m._merge.report.filled >= 1, 'agreed fields counted');
  assert.equal(m._merge.documents.length, 2);
});
