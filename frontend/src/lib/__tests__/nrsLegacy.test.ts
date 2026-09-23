import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nrsSeverity, nrsLegacyObject, nrsLegacyText, legacyPainPresent } from '../assessments/nrsLegacy';
test('NRS severity applies only to numeric integer scores 0 through 10', () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, -1, 11, .5, '0', '5', false, {}, []]) assert.equal(nrsSeverity(value), null);
  for (let value = 0; value <= 10; value++) assert.equal(nrsSeverity(value)?.label, value === 0 ? 'Assente' : value <= 3 ? 'Lieve' : value <= 6 ? 'Moderato' : 'Severo');
});
test('retained original values remain distinct and pain presence is not based on truthiness', () => {
  for (const value of [null, false, 0, '', {}, []]) assert.equal(legacyPainPresent({ dolore: value }), true);
  assert.equal(legacyPainPresent({}), false);
  assert.equal(legacyPainPresent(Object.create({ dolore: [] })), false);
  assert.equal(nrsLegacyText(null), 'null');
  assert.equal(nrsLegacyText(false), 'false');
  assert.equal(nrsLegacyText(0), '0');
  assert.equal(nrsLegacyObject(null), null);
  const row = { punteggio: -1, note: ' Originale\n ' };
  assert.equal(nrsLegacyObject(row), row);
  assert.deepEqual(JSON.parse(nrsLegacyText(row)), row);
});
