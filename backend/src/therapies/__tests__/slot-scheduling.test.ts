import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTherapyClock,
  oneTimeSlot,
  oneTimeVerificationReason,
} from '../slot-scheduling.js';
import { parseTherapyAdministrationBody } from '../therapy-write.js';

test('one-off spelling normalization never invents an invalid clock', () => {
  for (const [raw, expected] of [
    ['8:30', '08:30'],
    [' 8:30 ', '08:30'],
    ['00:15', '00:15'],
    ['23:59', '23:59'],
  ])
    assert.equal(normalizeTherapyClock(raw), expected);
  for (const raw of [null, '', '99:00', '24:00', '12:60', '8:3', '08:30:00'])
    assert.equal(normalizeTherapyClock(raw), null);
});

test('one-off ambiguity is one verification category, independent of legacy flags', () => {
  const base = { tipo: 'una_tantum', orarioSomministrazione: '8:30', schedules: [] };
  assert.deepEqual(oneTimeSlot(base), { time: '08:30', fascia: 'mattina' });
  assert.deepEqual(
    oneTimeSlot({ ...base, schedules: [{ time: '08:30', fascia: 'mattina' }] }),
    oneTimeSlot(base),
  );
  for (const schedules of [
    [{ time: '09:30', fascia: 'mattina' }],
    [{ time: '08:30', fascia: 'sera' }],
    [{ time: '08:30' }, { time: '8:30' }],
  ]) {
    assert.equal(oneTimeVerificationReason({ ...base, schedules }), 'conflicting_schedule');
    assert.equal(oneTimeSlot({ ...base, schedules }), null);
  }
  assert.equal(
    oneTimeVerificationReason({ ...base, orarioSomministrazione: null }),
    'missing_time',
  );
  assert.equal(
    oneTimeVerificationReason({ ...base, orarioSomministrazione: '99:00' }),
    'invalid_time',
  );
  assert.equal(oneTimeVerificationReason({ ...base, tipo: 'periodica' }), null);
});

test('only confirm accepts an observed refused state; pending-only remains explicit', () => {
  const body = {
    patientId: 'p1',
    therapyId: 't1',
    date: '2030-01-01',
    fascia: 'mattina',
    expectedStato: 'non_erogata',
  };
  assert.equal(parseTherapyAdministrationBody(body, false).expectedStato, 'non_erogata');
  assert.throws(
    () => parseTherapyAdministrationBody({ ...body, motivo: 'rifiuto' }, true),
    /Stato atteso/,
  );
  assert.throws(
    () => parseTherapyAdministrationBody({ ...body, expectedStato: 'erogata' }, false),
    /Stato atteso/,
  );
  assert.equal(
    parseTherapyAdministrationBody({ ...body, expectedStato: 'da_erogare' }, false).expectedStato,
    'da_erogare',
  );
});
