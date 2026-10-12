import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  doseForGlucose,
  glucoseRowLabel,
  glucoseRuleDoseText,
  glucoseScaleDoseUnit,
  glucoseScaleFormWarnings,
  glucoseScaleRows,
  glucoseScaleWarnings,
  glucoseScaleWarningText,
  ruleForGlucose,
  validateGlucoseScaleRows,
} from '../glucoseScale.js';

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

test('schema in pompa: protocollo ml/h con dosi aggiuntive e regola completa per glicemia', () => {
  const result = validateGlucoseScaleRows(
    [
      { minMgDl: '151', maxMgDl: '200', units: '2' },
      {
        minMgDl: '351',
        maxMgDl: '',
        units: '6',
        extraDoses: [{ amount: '6', unit: 'unità', route: ' EV ', label: 'bolo' }],
      },
    ],
    'ml/h',
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.protocol?.doseUnit, 'ml/h');
  assert.deepEqual(result.protocol?.rules[1], {
    minMgDl: 351,
    maxMgDl: null,
    units: 6,
    extraDoses: [{ amount: 6, unit: 'unità', route: 'EV', label: 'bolo' }],
  });
  assert.equal(doseForGlucose(result.protocol, 180), 2);
  assert.deepEqual(ruleForGlucose(result.protocol, 400)?.extraDoses, [
    { amount: 6, unit: 'unità', route: 'EV', label: 'bolo' },
  ]);
  assert.equal(ruleForGlucose(result.protocol, 250), null);
  assert.equal(
    glucoseRuleDoseText(ruleForGlucose(result.protocol, 400)!, 'ml/h'),
    '6 ml/h + 6 unità EV (bolo)',
  );
  assert.equal(glucoseScaleDoseUnit(result.protocol), 'ml/h');
  assert.equal(doseForGlucose({ ...result.protocol, doseUnit: 'mg' }, 180), null);
});

test('protocollo salvato senza doseUnit resta in unità (retro-compatibilità)', () => {
  const legacy = {
    kind: 'blood_glucose',
    measurementUnit: 'mg/dL',
    rules: [{ minMgDl: 200, maxMgDl: 300, units: 6 }],
  };
  assert.equal(glucoseScaleDoseUnit(legacy), 'unità');
  assert.equal(doseForGlucose(legacy, 250), 6);
  assert.equal(validateGlucoseScaleRows(glucoseScaleRows(legacy)).protocol?.doseUnit, 'unità');
});

test('dosi aggiuntive non valide bloccano la fascia', () => {
  const extra = { unit: 'unità' as const, route: '', label: '' };
  for (const amount of ['', '0', '2.3', '-1'])
    assert.match(
      validateGlucoseScaleRows([
        { minMgDl: '200', maxMgDl: '', units: '4', extraDoses: [{ ...extra, amount }] },
      ]).errors.join(),
      /Fascia 1: dose aggiuntiva 1 non valida/,
    );
  assert.match(
    validateGlucoseScaleRows([
      {
        minMgDl: '200',
        maxMgDl: '',
        units: '4',
        extraDoses: Array.from({ length: 5 }, () => ({ ...extra, amount: '1' })),
      },
    ]).errors.join(),
    /al massimo 4 dosi aggiuntive/,
  );
});

test('round trip protocollo → righe del form conserva le dosi aggiuntive', () => {
  const rows = [
    {
      minMgDl: '351',
      maxMgDl: '',
      units: '15',
      extraDoses: [{ amount: '5', unit: 'unità' as const, route: 'EV', label: 'bolo' }],
    },
    { minMgDl: '121', maxMgDl: '140', units: '4' },
  ];
  const { protocol } = validateGlucoseScaleRows(rows);
  assert.deepEqual(glucoseScaleRows(protocol), [rows[1], rows[0]]);
  assert.equal(glucoseRowLabel(rows[0]!, 'unità'), '≥351 mg/dL → 15 unità + 5 unità EV (bolo)');
  assert.equal(
    glucoseRowLabel({ minMgDl: '151', maxMgDl: '200', units: '2' }, 'ml/h'),
    '151–200 mg/dL → 2 ml/h',
  );
});

test('avvisi: stessa formulazione del backend per sovrapposizioni, buchi e valori sospetti', () => {
  const warnings = glucoseScaleWarnings([
    { minMgDl: 200, maxMgDl: 250 },
    { minMgDl: 250, maxMgDl: 300 },
    { minMgDl: 350, maxMgDl: 450 },
    { minMgDl: 11, maxMgDl: 120 },
    { minMgDl: 122, maxMgDl: 199 },
  ]).map(glucoseScaleWarningText);
  assert.deepEqual(warnings, [
    'Valore 11 mg/dL sospetto: confrontalo con il documento',
    'Glicemia 121 mg/dL non coperta dallo schema',
    'Fasce sovrapposte a 250 mg/dL: due dosi per la stessa glicemia',
    'Glicemia 301–349 mg/dL non coperta dallo schema',
  ]);
  assert.equal(
    glucoseScaleWarningText({ kind: 'overlap', fromMgDl: 240, toMgDl: 260 }),
    'Fasce sovrapposte tra 240 e 260 mg/dL: due dosi per la stessa glicemia',
  );
  // The domain floor of an open "< N" band is not a written value.
  assert.deepEqual(glucoseScaleWarnings([{ minMgDl: 10, maxMgDl: 80 }]), []);
});

test('nel form le sovrapposizioni sono errori bloccanti, buchi e valori sospetti solo avvisi', () => {
  const rows = [
    { minMgDl: '11', maxMgDl: '120', units: '0' },
    { minMgDl: '200', maxMgDl: '250', units: '4' },
    { minMgDl: '250', maxMgDl: '300', units: '6' },
  ];
  const { errors, protocol } = validateGlucoseScaleRows(rows);
  assert.equal(protocol, null);
  assert.ok(errors.includes('Le fasce glicemiche non possono sovrapporsi.'));
  assert.ok(
    errors.includes('Fasce sovrapposte a 250 mg/dL: due dosi per la stessa glicemia.'),
    errors.join(' | '),
  );
  assert.deepEqual(glucoseScaleFormWarnings(rows), [
    'Valore 11 mg/dL sospetto: confrontalo con il documento',
    'Glicemia 121–199 mg/dL non coperta dallo schema',
  ]);
  const gapOnly = validateGlucoseScaleRows([rows[0]!, rows[1]!]);
  assert.deepEqual(gapOnly.errors, []);
  assert.ok(gapOnly.protocol);
});
