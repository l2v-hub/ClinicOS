import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  doseForGlucose,
  InvalidDoseProtocolError,
  normalizeGlucoseScaleProtocol,
} from '../glucose-scale.js';

test('schema glicemico: calcola la dose dalla fascia misurata senza usare una dose fissa', () => {
  const protocol = normalizeGlucoseScaleProtocol({
    kind: 'blood_glucose',
    rules: [
      { minMgDl: 200, maxMgDl: 250, units: 4 },
      { minMgDl: 251, maxMgDl: 300, units: 6 },
      { minMgDl: 350, maxMgDl: 450, units: 8 },
    ],
  });
  assert.equal(doseForGlucose(protocol, 220), 4);
  assert.equal(doseForGlucose(protocol, 200), 4);
  assert.equal(doseForGlucose(protocol, 250), 4);
  assert.equal(doseForGlucose(protocol, 280), 6);
  assert.equal(doseForGlucose(protocol, 350), 8);
});

test('schema glicemico: supporta una fascia finale aperta', () => {
  const protocol = normalizeGlucoseScaleProtocol({
    kind: 'blood_glucose',
    rules: [{ minMgDl: 350, maxMgDl: null, units: 8 }],
  });
  assert.equal(doseForGlucose(protocol, 350), 8);
  assert.equal(doseForGlucose(protocol, 900), 8);
});

test('schema glicemico: non inventa una dose quando la prescrizione ha un intervallo scoperto', () => {
  const protocol = normalizeGlucoseScaleProtocol({
    kind: 'blood_glucose',
    rules: [
      { minMgDl: 200, maxMgDl: 300, units: 6 },
      { minMgDl: 350, maxMgDl: 450, units: 8 },
    ],
  });
  assert.equal(doseForGlucose(protocol, 325), null);
});

test('schema glicemico: rifiuta fasce sovrapposte', () => {
  assert.throws(
    () =>
      normalizeGlucoseScaleProtocol({
        kind: 'blood_glucose',
        rules: [
          { minMgDl: 200, maxMgDl: 300, units: 4 },
          { minMgDl: 300, maxMgDl: 350, units: 6 },
        ],
      }),
    InvalidDoseProtocolError,
  );
});

test('schema glicemico: rifiuta valori coercibili e dosi fuori dal passo di mezza unità', () => {
  for (const units of ['6', Number.NaN, Number.POSITIVE_INFINITY, 6.25]) {
    assert.throws(
      () =>
        normalizeGlucoseScaleProtocol({
          kind: 'blood_glucose',
          rules: [{ minMgDl: 200, maxMgDl: 300, units }],
        }),
      InvalidDoseProtocolError,
    );
  }
});

test('schema glicemico: rifiuta glicemie fuori dal range DTX e troppe fasce', () => {
  assert.throws(
    () =>
      normalizeGlucoseScaleProtocol({
        kind: 'blood_glucose',
        rules: [{ minMgDl: 0, maxMgDl: 9, units: 0 }],
      }),
    InvalidDoseProtocolError,
  );
  assert.throws(
    () =>
      normalizeGlucoseScaleProtocol({
        kind: 'blood_glucose',
        rules: Array.from({ length: 33 }, (_, index) => ({
          minMgDl: 10 + index * 2,
          maxMgDl: 10 + index * 2,
          units: 1,
        })),
      }),
    InvalidDoseProtocolError,
  );
});

test('invalid maximum cannot silently become an open range', () => {
  for (const maxMgDl of [undefined, '300', Number.NaN, false]) {
    assert.throws(
      () =>
        normalizeGlucoseScaleProtocol({
          kind: 'blood_glucose',
          rules: [{ minMgDl: 200, maxMgDl, units: 6 }],
        }),
      InvalidDoseProtocolError,
    );
  }
});

test('explicit incompatible units cannot be silently reinterpreted as mg/dL and insulin units', () => {
  const protocol = { kind: 'blood_glucose', rules: [{ minMgDl: 200, maxMgDl: 300, units: 6 }] };
  for (const metadata of [
    { measurementUnit: 'mmol/L' },
    { doseUnit: 'mg' },
    { measurementUnit: null },
  ]) {
    assert.throws(
      () => normalizeGlucoseScaleProtocol({ ...protocol, ...metadata }),
      InvalidDoseProtocolError,
    );
  }
});
