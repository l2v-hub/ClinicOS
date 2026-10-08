import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doseForGlucose, validateGlucoseScaleRows } from '../glucoseScale.js';

test('validazione schema glicemico: produce protocollo ordinato e conserva i buchi', () => {
  const result = validateGlucoseScaleRows([
    { minMgDl: '350', maxMgDl: '450', units: '8' },
    { minMgDl: '200', maxMgDl: '250', units: '4' },
    { minMgDl: '251', maxMgDl: '300', units: '6' },
  ]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.protocol?.rules.map((rule) => rule.minMgDl),
    [200, 251, 350],
  );
  assert.equal(doseForGlucose(result.protocol, 280), 6);
  assert.equal(doseForGlucose(result.protocol, 325), null);
});

test('validazione schema glicemico: segnala intervalli sovrapposti', () => {
  const result = validateGlucoseScaleRows([
    { minMgDl: '200', maxMgDl: '250', units: '4' },
    { minMgDl: '250', maxMgDl: '300', units: '6' },
  ]);
  assert.match(result.errors.join(' '), /sovrapporsi/);
  assert.equal(result.protocol, null);
});

test('misurazione deve essere intera e nei limiti anche per una fascia aperta', () => {
  const { protocol } = validateGlucoseScaleRows([{ minMgDl: '10', maxMgDl: '', units: '0.5' }]);
  for (const value of [9, 1001, Infinity, NaN, 280.5])
    assert.equal(doseForGlucose(protocol, value), null);
  assert.equal(doseForGlucose(protocol, 1000), 0.5);
});

test('anteprima rifiuta protocolli con unità o tipo non riconosciuti', () => {
  const { protocol } = validateGlucoseScaleRows([{ minMgDl: '200', maxMgDl: '300', units: '6' }]);
  assert.equal(doseForGlucose({ ...protocol, measurementUnit: 'mmol/L' }, 280), null);
  assert.equal(doseForGlucose({ ...protocol, kind: 'weight' }, 280), null);
});
