import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { sameTherapySource, therapySourceInventory } from '../therapy-source-inventory.js';
import { narrativeFromRawText } from '../../ai/sections/narrative.js';
import { hash, type Json } from '../../ai/upload/pages/model.js';
import { pageTherapyRows, refreshedPageData } from '../../ai/upload/pages/draft-source.js';
import { deferredTherapies, validateDraftTherapySelection } from '../therapy-selection.js';

process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
let guard: typeof import('../../ai/upload/pages/draft-mutations.js').guardPageRows;
let seed: typeof import('../draft-service.js').buildImportDraftData;
before(async () => {
  guard = (await import('../../ai/upload/pages/draft-mutations.js')).guardPageRows;
  seed = (await import('../draft-service.js')).buildImportDraftData;
});
const alfa = { nome: 'Alfa', dose: '5 mg', frequenza: '08:00' };
const beta = { nome: 'Beta', dose: '25 mg', frequenza: '08:00', stato: 'sospeso' };
function result(items: unknown[], text = '', groupId = 'g1', inputHash = 'h1'): Json {
  return {
    _groups: [{ groupId, inputHash, _full: { cartella: { farmaci: items } },
      _narrative: { therapyText: text } }],
    _conflicts: [], _review: { decisions: [] },
    _source: { manifestRevision: 1, resultHash: 'result1' },
  };
}
const structured = (rows: Json[]) => rows.filter(r => r.sourceKind === 'structured');

test('missing narrative or a prose delimiter cannot silently lose a structured medication', () => {
  assert.equal(structured(therapySourceInventory('', [alfa, beta])).length, 2);
  const rows = therapySourceInventory('Alfa 5 mg 1 cp ore 8\n\nControlli periodici consigliati\n\nBeta 25 mg 1 cp ore 8', [beta]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].farmacoNome, 'ALFA');
  assert.deepEqual(rows[1].structuredSource, beta);
  assert.equal(rows[1].originalText, '');
  assert.equal(rows[1].stato, 'da_verificare');
  assert.equal(rows[1].quantita, '');
  assert.deepEqual(rows[1].orari, []);
});

test('only exact unambiguous fields cover an occurrence; variants and extra fields stay visible', () => {
  const rows = therapySourceInventory('Alfa 5 mg 1 cpr ore 08:00', [alfa, { ...alfa, dose: '10 mg' }, { ...alfa, note: 'verificare' }]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].sourceKind, undefined);
  assert.deepEqual(rows[0].structuredSource, alfa);
  assert.equal(structured(rows).length, 2);
});

test('duplicate extraction occurrences and malformed names remain accounted for, not actionable', () => {
  const items = [alfa, alfa, {}, { nome: '' }, { nome: 42, dose: '5 mg' }, 'voce non classificata'];
  const rows = therapySourceInventory('', items);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(r => r.importRowKey)).size, 4);
  assert.deepEqual(rows.map(r => r.structuredSource), [alfa, alfa, items[4], items[5]]);
  assert.equal(rows[2].farmacoNome, '');
  assert.ok(rows.every(r => r.stato === 'da_verificare' && r.originalText === ''));
});

test('one raw line cannot collapse two extracted drugs through shared or empty originalText', () => {
  const rows = therapySourceInventory('Alfa 5 mg e Beta 25 mg 1 cp ore 8', [alfa, beta]);
  assert.equal(structured(rows).length, 2);
  assert.equal(sameTherapySource(rows[0], rows[2]), false);
  assert.equal(sameTherapySource(rows[1], rows[2]), false);
  assert.equal(sameTherapySource({ originalText: '' }, { originalText: '' }), false);
  assert.equal(sameTherapySource({ originalText: 'Alfa' }, { originalText: 'Alfa' }), true);
});

test('refresh retains reviewed values and exclusions, adds new variants once with stable proposal ids', () => {
  const first = result([alfa]);
  const initial = pageTherapyRows(first);
  const saved = { terapiaImport: [{ ...initial[0], stato: 'ok', farmacoNome: 'Correzione operatore',
    excludedFromConfirm: true, reviewedTherapy: { note: 'correzione' } }],
    _importSource: { groupHashes: { g1: 'h1' } } };
  const next = result([alfa, beta], '', 'g1', 'h2');
  const refreshed = refreshedPageData(saved, next);
  assert.equal((refreshed.terapiaImport as Json[])[0].farmacoNome, 'Correzione operatore');
  assert.equal((refreshed.terapiaImport as Json[])[0].excludedFromConfirm, true);
  assert.equal((refreshed.terapiaImport as Json[])[0].sourceOutdated, true);
  const proposals = refreshed._importProposals as Json[];
  assert.equal(proposals.length, 1);
  assert.deepEqual((proposals[0].row as Json).structuredSource, beta);
  const again = refreshedPageData(refreshed, next);
  assert.deepEqual(again._importProposals, proposals);
  const newer = refreshedPageData(refreshed, result([alfa, beta], '', 'g1', 'h3'));
  const refreshedProposal = (newer._importProposals as Json[])[0];
  assert.equal(refreshedProposal.id, proposals[0].id);
  assert.equal(refreshedProposal.inputHash, 'h3');
  assert.equal((refreshedProposal.row as Json).importSource && ((refreshedProposal.row as Json).importSource as Json).inputHash, 'h3');
  assert.equal(refreshedProposal.status, 'pending');
  const added = { ...refreshed, terapiaImport: [...refreshed.terapiaImport as Json[], proposals[0].row] };
  assert.deepEqual(refreshedPageData(added, next)._importProposals, []);
});

test('identical groups aggregate provenance and reordering cannot manufacture prescriptions', () => {
  const first = result([alfa, beta]);
  const second = result([alfa, beta], '', 'g2', 'h2');
  const merged = { ...first, _groups: [...first._groups as unknown[], ...second._groups as unknown[]] };
  const rows = pageTherapyRows(merged);
  assert.equal(rows.length, 2);
  assert.equal((rows[0].importSources as unknown[]).length, 2);
  const reversed = { ...merged, _groups: [...merged._groups as unknown[]].reverse() };
  assert.deepEqual(pageTherapyRows(reversed).map(r => r.importRowKey).sort(), rows.map(r => r.importRowKey).sort());
  const saved = { terapiaImport: rows, _importSource: { groupHashes: { g1: 'h1', g2: 'h2' } } };
  assert.deepEqual(refreshedPageData(saved, reversed)._importProposals, []);
});

test('a selected conflict from the same group authorizes only its exact extracted variant', () => {
  const low = { ...alfa, dose: '5 mg' }, high = { ...alfa, dose: '10 mg' };
  const review = result([low, high]);
  review._conflicts = [{ id: 'c1', field: 'cartella.farmaci', candidates: [
    { id: 'low', value: low, sources: [{ groupId: 'g1' }] },
    { id: 'high', value: high, sources: [{ groupId: 'g1' }] },
  ] }];
  review._review = { decisions: [{ conflictId: 'c1', action: 'select', candidateId: 'low' }] };
  const rows = pageTherapyRows(review);
  assert.equal(rows[0].conflictDeferred, undefined);
  assert.equal(rows[1].conflictDeferred, true);
  assert.equal(rows[1].excludedFromConfirm, true);
  assert.equal(rows[1].stato, 'da_verificare');
});

test('server-owned extraction evidence cannot be forged in page or legacy autosave', () => {
  const rows = therapySourceInventory('', [beta]);
  for (const page of [true, false]) for (const key of ['sourceKind', 'structuredSource', 'importRowKey', 'structuredOccurrenceKey', 'originalText']) {
    const saved = { terapiaImport: rows, ...(page ? { _importSource: {} } : {}) };
    assert.throws(() => guard(saved, { terapiaImport: [{ ...rows[0], [key]: 'forged' }] }, undefined), { code: 'immutable_source' });
  }
  assert.doesNotThrow(() => guard({ terapiaImport: rows }, { terapiaImport: [{ ...rows[0], farmacoNome: 'Reviewed' }] }, undefined));
  assert.throws(() => guard({ terapiaImport: [{ originalText: 'Dal documento' }] },
    { terapiaImport: [{ originalText: 'Inventato' }] }, undefined), { code: 'immutable_source' });
  assert.doesNotThrow(() => guard({ terapiaImport: rows },
    { terapiaImport: [...rows, { originalText: 'Nuova voce legacy' }] }, undefined));
  assert.throws(() => guard({ terapiaImport: [{ originalText: 'legacy' }] },
    { terapiaImport: [{ originalText: 'legacy', sourceKind: 'structured' }] }, undefined), { code: 'immutable_source' });
});

test('legacy draft seeding includes structured inventory without headings or manufactured source text', () => {
  const narrative = narrativeFromRawText('', {});
  const seeded = seed(narrative, null, { cartella: { farmaci: [beta] } });
  const rows = seeded.terapiaImport as Json[];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].farmacoNome, 'Beta');
  assert.equal(rows[0].originalText, '');
  assert.deepEqual(rows[0].structuredSource, beta);
  assert.ok((seeded._importedFields as string[]).includes('terapiaImport'));
});

test('row keys ignore editable values and extraction object key order', () => {
  const left = therapySourceInventory('', [alfa])[0];
  const right = therapySourceInventory('', [{ frequenza: '08:00', dose: '5 mg', nome: 'Alfa' }])[0];
  assert.equal(left.importRowKey, right.importRowKey);
  assert.equal(sameTherapySource(left, { ...right, farmacoNome: 'Edited', originalText: 'edited' }), true);
  assert.notEqual(hash(alfa), hash(beta));
});

test('partial versus richer extraction on a shared narrative line has distinct source identity', () => {
  const text = 'Alfa 5 mg 1 cpr ore 08:00';
  const first = result([{ nome: 'Alfa' }], text);
  const next = result([{ nome: 'Alfa', dose: '5 mg' }], text, 'g1', 'h2');
  const old = pageTherapyRows(first)[0], incoming = pageTherapyRows(next)[0];
  assert.equal(sameTherapySource(old, incoming), false);
  const saved = { terapiaImport: [old], _importSource: { groupHashes: { g1: 'h1' } } };
  const refreshed = refreshedPageData(saved, next);
  assert.equal((refreshed.terapiaImport as Json[])[0].sourceOutdated, true);
  assert.equal((refreshed._importProposals as Json[]).length, 1);
  const mixed = { ...first, _groups: [...first._groups as unknown[], ...next._groups as unknown[]] };
  assert.equal(new Set(pageTherapyRows(mixed).map(r => r.importRowKey)).size, 2);
});

test('same-group selection cannot authorize a narrative dose from another extracted variant', () => {
  const low = { ...alfa, stato: 'attivo' }, high = { ...alfa, dose: '10 mg', stato: 'attivo' };
  const review = result([low, high], 'Alfa 5 mg 1 cpr ore 08:00');
  review._conflicts = [{ id: 'c1', field: 'cartella.farmaci', candidates: [
    { id: 'low', value: low, sources: [{ groupId: 'g1' }] },
    { id: 'high', value: high, sources: [{ groupId: 'g1' }] },
  ] }];
  review._review = { decisions: [{ conflictId: 'c1', action: 'select', candidateId: 'high' }] };
  const rows = pageTherapyRows(review);
  assert.equal(rows[0].conflictDeferred, true);
  assert.equal(rows[1].conflictDeferred, true);
  assert.equal(rows[2].conflictDeferred, undefined);
  assert.equal(rows[2].stato, 'da_verificare');
});

test('confirmation cannot silently omit an extracted candidate; explicit deferral keeps its evidence', () => {
  const rows = therapySourceInventory('', [beta]);
  assert.throws(() => validateDraftTherapySelection({ terapiaImport: rows }, []), /manca dalla conferma/);
  const saved = { terapiaImport: [{ ...rows[0], excludedFromConfirm: true }] };
  assert.deepEqual(validateDraftTherapySelection(saved, []).deferredImportIndexes, [0]);
  assert.match(deferredTherapies(saved)[0].notes, /Dati estratti automaticamente/);
  assert.match(deferredTherapies(saved)[0].notes, /25 mg/);
  assert.match(deferredTherapies(saved)[0].notes, /sospeso/);
});
