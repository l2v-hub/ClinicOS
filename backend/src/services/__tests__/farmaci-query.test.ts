import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDrugQuery, packageMatches, parseSearchInput, strengthsIn } from '../farmaci/query.js';
import { validateDraftTherapySelection } from '../../intake/therapy-selection.js';

const known = new Set(['TACHIPIRINA', 'VITAMINA B12', 'COVID19', 'COVID 19']);
test('query-only suffix parsing preserves known brands and parses attached strength/form', () => {
  for (const q of [
    'Tachipirina 1000 compresse',
    'Tachipirina1000compresse',
    'Tachipirina1000 mg compresse',
  ]) {
    const query = parseDrugQuery(q, known);
    assert.equal(query.name, 'TACHIPIRINA');
    assert.equal(query.strength?.value, 1000);
    assert.equal(query.form, 'tablet');
  }
  for (const q of ['VITAMINA B12', 'COVID19', 'COVID 19'])
    assert.equal(parseDrugQuery(q, known).strength, null);
  assert.equal(parseDrugQuery('VITAMINA B12 1000 mcg compresse', known).name, 'VITAMINA B12');
  assert.deepEqual(parseDrugQuery('VITAMINA B12 1000 compresse', known).strength, {
    value: 1000,
    unit: null,
  });
  assert.equal(parseDrugQuery('COVID19 20 mg', known).name, 'COVID19');
  assert.deepEqual(parseDrugQuery('Tachipirina 2,5 compresse', known).strength, {
    value: 2.5,
    unit: null,
  });
  assert.equal(parseDrugQuery('012745170').aic, '012745170');
  assert.equal(
    parseDrugQuery('Tachipirina 1000 mg', new Set(['TACHIPIRINA 1000 MG'])).strength?.value,
    1000,
  );
});
test('strength syntax distinguishes units, ranges and concentration denominators', () => {
  const row = (description: string) => ({
    denominazione: 'TEST',
    descrizione: description,
    forma: 'Compressa',
    principiAttivi: [{ quantita: null, unitaMisura: null }],
  });
  const query = parseDrugQuery('Test 20 mg compresse');
  assert.equal(packageMatches(query, row('20 MG COMPRESSE')), true);
  for (const description of [
    '20 MCG COMPRESSE',
    '10-20 MG COMPRESSE',
    '20 MG/ML COMPRESSE',
    '20 MG COMPRESSE EFFERVESCENTI',
    '200 MG COMPRESSE',
  ])
    assert.equal(packageMatches(query, row(description)), false, description);
  assert.equal(packageMatches(parseDrugQuery('Test 20 mg/ml'), row('20 MG/1 ML')), true);
  assert.equal(packageMatches(parseDrugQuery('Test 20 mg/ml'), row('20 MG/2 ML')), false);
  assert.equal(
    packageMatches(query, { ...row('20 MG/ML COMPRESSE'), denominazione: 'TEST 20 MG' }),
    false,
  );
  assert.equal(
    packageMatches(query, { ...row('10-20 MG COMPRESSE'), denominazione: 'TEST 20 MG' }),
    false,
  );
  assert.equal(packageMatches(parseDrugQuery('Test 1 g'), row('1000 MG COMPRESSE')), false);
  assert.equal(
    packageMatches(parseDrugQuery('Farmaco 5 mg/ml'), {
      ...row('1 FLACONE 20 ML'),
      denominazione: 'FARMACO 5 MG/ML',
    }),
    true,
  );
  assert.equal(
    packageMatches(parseDrugQuery('Vitamina B12 1000 compresse', known), {
      ...row('250 MCG COMPRESSE'),
      denominazione: 'VITAMINA B12',
    }),
    false,
  );
  assert.deepEqual(strengthsIn('2,5 milligrammi'), [{ value: 2.5, unit: 'MG' }]);
  assert.equal(
    packageMatches(parseDrugQuery('Test 20 mg'), {
      ...row('Senza forza dichiarata'),
      principiAttivi: [{ quantita: 20, unitaMisura: 'milligrammi' }],
    }),
    true,
  );
});
test('input validation rejects ambiguous or unbounded request values', () => {
  for (const limit of [0, -1, 26, '1x', [], '1.5'])
    assert.throws(() => parseSearchInput('Test', limit, undefined));
  for (const q of ['', [], 'x'.repeat(81)]) assert.throws(() => parseSearchInput(q, 8, undefined));
  for (const cursor of ['', [], 'x'.repeat(2049)])
    assert.throws(() => parseSearchInput('Test', 8, cursor));
  assert.throws(() => parseDrugQuery('Test 20 mg + 30 mg'));
  assert.equal(parseSearchInput(' Test ', '25', undefined).limit, 25);
});
test('intake selection binds the exact selected package to its persisted form', () => {
  const form = {
    farmacoNome: 'Test',
    dataInizio: '2026-09-23',
    tipo: 'al_bisogno',
    stato: 'attiva',
    viaSomministrazione: 'orale',
    drugPackageRef: '012745170',
  };
  const payload = { ...form, intakeSource: { type: 'manual' as const, index: 0 } };
  assert.doesNotThrow(() => validateDraftTherapySelection({ terapia: [form] }, [payload]));
  assert.throws(() =>
    validateDraftTherapySelection({ terapia: [form] }, [
      { ...payload, drugPackageRef: '012745182' },
    ]),
  );
  assert.throws(() =>
    validateDraftTherapySelection({ terapia: [form] }, [{ ...payload, drugPackageRef: undefined }]),
  );
});
