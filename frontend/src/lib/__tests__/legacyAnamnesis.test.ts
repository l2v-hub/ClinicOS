import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasLegacyAnamnesis, legacyAnamnesisRows } from '../legacyAnamnesis.js';

test('hasLegacyAnamnesis: undefined/null/empty -> false', () => {
  assert.equal(hasLegacyAnamnesis(undefined), false);
  assert.equal(hasLegacyAnamnesis(null), false);
  assert.equal(hasLegacyAnamnesis({}), false);
});

test('hasLegacyAnamnesis: blank-string-only fields -> false', () => {
  assert.equal(hasLegacyAnamnesis({ fisiologica: '   ', note: '' }), false);
});

test('hasLegacyAnamnesis: at least one populated field -> true', () => {
  assert.equal(hasLegacyAnamnesis({ patologicaRemota: 'Ipertensione arteriosa (sintetico)' }), true);
});

test('legacyAnamnesisRows: empty input -> []', () => {
  assert.deepEqual(legacyAnamnesisRows(undefined), []);
  assert.deepEqual(legacyAnamnesisRows({}), []);
});

test('legacyAnamnesisRows: maps only populated fields, in canonical order, skips metadata', () => {
  const rows = legacyAnamnesisRows({
    note: 'Nessuna nota particolare',
    patologicaProssima: 'Ricovero per frattura femore',
    updatedAt: '2026-01-01T00:00:00.000Z',
    operatore: 'Dr. Rossi',
    lavorativa: '',
  });
  assert.deepEqual(rows, [
    { label: 'Anamnesi generale', value: 'Ricovero per frattura femore' },
    { label: 'Note aggiuntive', value: 'Nessuna nota particolare' },
  ]);
});

test('legacyAnamnesisRows: surfaces legacy-only familiare/lavorativa fields when populated', () => {
  const rows = legacyAnamnesisRows({
    familiare: 'Padre diabetico',
    lavorativa: 'Impiegato, sedentario',
  });
  assert.deepEqual(rows, [
    { label: 'Anamnesi familiare', value: 'Padre diabetico' },
    { label: 'Contesto lavorativo e sociale', value: 'Impiegato, sedentario' },
  ]);
});
