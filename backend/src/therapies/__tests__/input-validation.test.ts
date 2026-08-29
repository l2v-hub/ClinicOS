import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertTherapyScalarInput, TherapyInputError } from '../input-validation.js';

test('therapy scalar input accepts bounded clinical text and nullable optional fields', () => {
  assert.doesNotThrow(() =>
    assertTherapyScalarInput({
      farmacoNome: 'Metformina',
      dosaggio: '500 mg',
      tipo: 'periodica',
      stato: 'attiva',
      note: 'Dopo il pasto',
      prescrittore: null,
    }),
  );
});

test('therapy scalar input rejects oversized, mistyped and unknown enum values', () => {
  for (const input of [
    { farmacoNome: 'x'.repeat(201) },
    { note: 'x'.repeat(4001) },
    { dosaggio: 500 },
    { tipo: 'occasionale' },
    { stato: 'eliminata' },
  ]) {
    assert.throws(() => assertTherapyScalarInput(input), TherapyInputError);
  }
});
