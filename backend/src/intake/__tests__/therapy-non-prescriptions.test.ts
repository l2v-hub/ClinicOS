import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNarrativeFromMarkdown } from '../../ai/sections/markdown-parse.js';
import { parseDischargeTherapy } from '../parse-discharge-therapy.js';

// Synthetic inputs only. These tests never query a database or invoke extraction services.
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';
let buildImportDraftData: typeof import('../draft-service.js').buildImportDraftData;
let pageTherapyRows: typeof import('../../ai/upload/pages/draft-source.js').pageTherapyRows;
before(async () => {
  ({ buildImportDraftData } = await import('../draft-service.js'));
  ({ pageTherapyRows } = await import('../../ai/upload/pages/draft-source.js'));
});

test('negative medication instructions stay visible and require explicit source review', () => {
  for (const source of [
    'Non assumere Ramipril 5 mg 1 cpr per os',
    'TD: Non sospendere Ramipril 5 mg 1 cpr per os',
    'Nessuna terapia salvo Ramipril 5 mg 1 cpr per os',
  ]) {
    const rows = parseDischargeTherapy(source);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].originalText, source);
    assert.equal(rows[0].stato, 'da_verificare');
  }
});

test('intake import preserves absent-therapy source without creating mandatory fake prescriptions', () => {
  const source = '## TERAPIA\nTD: Non assume terapia domiciliare.';
  const narrative = parseNarrativeFromMarkdown(source);
  const data = buildImportDraftData(narrative, null);
  assert.equal(data.terapiaImport, undefined);
  assert.equal(data._terapiaText, narrative.therapyText);
  assert.deepEqual(data._narrative, narrative);
  assert.ok(!(data._importedFields as string[]).includes('terapiaImport'));
});

test('page import keeps real prescriptions and exact group provenance beside absence statements', () => {
  const source = 'TD: Ramipril 5 mg 1 cpr per os ore 08:00';
  const result = {
    _groups: [
      {
        groupId: 'g1',
        inputHash: 'hash-one',
        _narrative: { therapyText: 'TD: Non assume terapia.' },
      },
      { groupId: 'g2', inputHash: 'hash-two', _narrative: { therapyText: source } },
    ],
    _conflicts: [],
  };
  const original = structuredClone(result);
  const rows = pageTherapyRows(result);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].farmacoNome, 'RAMIPRIL');
  assert.equal(rows[0].originalText, source);
  assert.deepEqual(rows[0].importSource, { groupId: 'g2', inputHash: 'hash-two' });
  assert.deepEqual(result, original);
});
