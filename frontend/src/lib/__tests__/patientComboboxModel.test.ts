import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  nextPatientOptionIndex,
  patientDisplayName,
  patientFiscalCode,
} from '../patientComboboxModel.js';

test('patient combobox renders a stable identity with fiscal-code fallback', () => {
  assert.equal(patientDisplayName({ firstName: 'Mario', lastName: 'Rossi' }), 'Rossi, Mario');
  assert.equal(patientFiscalCode({ codiceFiscale: ' rssmra80a01h501u ' }), 'RSSMRA80A01H501U');
  assert.equal(patientFiscalCode({ codiceFiscale: '' }), 'Non disponibile');
});

test('patient combobox keyboard navigation wraps and supports boundaries', () => {
  assert.equal(nextPatientOptionIndex(-1, 3, 'ArrowDown'), 0);
  assert.equal(nextPatientOptionIndex(2, 3, 'ArrowDown'), 0);
  assert.equal(nextPatientOptionIndex(-1, 3, 'ArrowUp'), 2);
  assert.equal(nextPatientOptionIndex(0, 3, 'ArrowUp'), 2);
  assert.equal(nextPatientOptionIndex(1, 3, 'Home'), 0);
  assert.equal(nextPatientOptionIndex(1, 3, 'End'), 2);
  assert.equal(nextPatientOptionIndex(0, 0, 'ArrowDown'), -1);
});
