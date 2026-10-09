import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertTherapyScalarInput,
  assertTherapyRouteUpdate,
  TherapyInputError,
} from '../input-validation.js';
import { validateTherapyCreateInput } from '../therapy-create.js';

const regimes = [
  'al bisogno',
  'AL_BISOGNO',
  'al-bisogno',
  ' PRN ',
  'p.r.n.',
  'periodica',
  'una tantum',
];
const legacy = { viaSomministrazione: 'al bisogno', tipo: 'periodica' };

test('shared create preflight rejects regimen routes across all types without converting input', () => {
  for (const viaSomministrazione of regimes)
    for (const tipo of ['periodica', 'al_bisogno', 'una_tantum']) {
      const input = {
        farmacoNome: 'Sintetico',
        dataInizio: '2026-10-09',
        viaSomministrazione,
        tipo,
      };
      const before = JSON.stringify(input);
      assert.throws(() => assertTherapyScalarInput(input), TherapyInputError);
      assert.throws(() => validateTherapyCreateInput(input), TherapyInputError);
      assert.equal(JSON.stringify(input), before);
    }
});

test('bounded actual routes and existing aliases remain accepted across therapy types', () => {
  for (const viaSomministrazione of [
    'orale',
    'SC',
    'IM',
    'IV',
    'EV',
    'sottocutanea',
    'per os',
    'INAL',
    'via personalizzata',
  ]) {
    for (const tipo of ['periodica', 'al_bisogno', 'una_tantum']) {
      const input = { viaSomministrazione, tipo };
      assert.doesNotThrow(() => assertTherapyScalarInput(input));
      assert.equal(
        assertTherapyRouteUpdate(input, { viaSomministrazione: 'orale', tipo: 'periodica' }),
        false,
      );
    }
  }
  for (const viaSomministrazione of [undefined, null, ''])
    assert.doesNotThrow(() => assertTherapyScalarInput({ viaSomministrazione }));
});

test('legacy updates cannot bypass clinician review by omitting route or type', () => {
  for (const input of [
    {},
    { note: 'nota' },
    { schedules: [] },
    { tipo: 'al_bisogno' },
    { viaSomministrazione: 'orale' },
    { stato: 'attiva' },
    { stato: 'sospesa', note: '' },
    { stato: 'conclusa', extra: true },
    { viaSomministrazione: null, tipo: 'periodica' },
    { viaSomministrazione: '', tipo: 'periodica' },
    { viaSomministrazione: 'orale', tipo: null },
    { viaSomministrazione: 'orale', tipo: 'altro' },
  ]) {
    assert.throws(
      () => assertTherapyRouteUpdate(input, legacy),
      TherapyInputError,
      JSON.stringify(input),
    );
  }
});

test('legacy safe exception is exactly suspension/conclusion; reviewed repair is explicit', () => {
  for (const stato of ['sospesa', 'conclusa'])
    assert.equal(assertTherapyRouteUpdate({ stato }, legacy), true);
  for (const tipo of ['periodica', 'al_bisogno', 'una_tantum']) {
    assert.equal(assertTherapyRouteUpdate({ viaSomministrazione: 'SC', tipo }, legacy), false);
  }
  assert.deepEqual(legacy, { viaSomministrazione: 'al bisogno', tipo: 'periodica' });
});

test('effective normal updates reject incoming regime route and leave compatible status changes alone', () => {
  const existing = { viaSomministrazione: 'orale', tipo: 'al_bisogno' };
  assert.equal(assertTherapyRouteUpdate({ stato: 'attiva' }, existing), false);
  assert.throws(
    () => assertTherapyRouteUpdate({ viaSomministrazione: 'PRN' }, existing),
    TherapyInputError,
  );
});
