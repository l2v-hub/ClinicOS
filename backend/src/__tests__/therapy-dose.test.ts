// REQ-093 (BUG-055): exact-fraction dosing helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fasciaFromTime,
  normalizeFraction,
  formatFraction,
  scheduleDoseLabel,
  deriveLegacyFromSchedules,
  normalizeSchedules,
  assertValidSchedulesInput,
  assertValidTherapyDateRange,
  normalizeTherapyDateRange,
  InvalidTherapySchedulesError,
  MAX_THERAPY_SCHEDULES,
  TherapyDateRangeError,
} from '../lib/therapy-dose.js';

test('fasciaFromTime maps 08:00→mattina and 18:00→sera (two distinct buckets)', () => {
  assert.equal(fasciaFromTime('08:00'), 'mattina');
  assert.equal(fasciaFromTime('18:00'), 'sera');
  assert.equal(fasciaFromTime('12:00'), 'pranzo');
  assert.equal(fasciaFromTime('16:00'), 'pomeriggio');
  assert.equal(fasciaFromTime('23:00'), 'notte');
});

test('fractions stay exact, never approximated to decimals', () => {
  assert.deepEqual(normalizeFraction(2, 4), { num: 1, den: 2 });
  assert.equal(formatFraction(1, 3), '1/3'); // exact, not 0.333
  assert.equal(formatFraction(3, 4), '3/4');
  assert.equal(formatFraction(2, 1), '2');
});

test('scheduleDoseLabel computes mg equivalent for divisible solid', () => {
  const s = {
    time: '08:00',
    quantityNumerator: 1,
    quantityDenominator: 2,
    administrationUnit: 'compressa',
    fascia: 'mattina',
  };
  assert.equal(scheduleDoseLabel(s, 100, 'mg'), '1/2 compressa — 50 mg');
  const q = {
    time: '18:00',
    quantityNumerator: 1,
    quantityDenominator: 4,
    administrationUnit: 'compressa',
    fascia: 'sera',
  };
  assert.equal(scheduleDoseLabel(q, 100, 'mg'), '1/4 compressa — 25 mg');
  const t = {
    time: '12:00',
    quantityNumerator: 1,
    quantityDenominator: 3,
    administrationUnit: 'compressa',
    fascia: 'pranzo',
  };
  assert.equal(scheduleDoseLabel(t, 100, 'mg'), '1/3 compressa — ≈ 33.33 mg');
});

test('deriveLegacyFromSchedules unions fasce + lists specific times', () => {
  const d = deriveLegacyFromSchedules([
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
      fascia: 'mattina',
    },
    {
      time: '18:00',
      quantityNumerator: 1,
      quantityDenominator: 4,
      administrationUnit: 'compressa',
      fascia: 'sera',
    },
  ]);
  assert.equal(d.fasceMattina, true);
  assert.equal(d.fasceSera, true);
  assert.equal(d.fascePranzo, false);
  assert.equal(d.orarioSpecifico, '08:00,18:00');
});

test('normalizeSchedules dedupes same (time,unit) so therapy rows never duplicate', () => {
  const out = normalizeSchedules([
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 4,
      administrationUnit: 'compressa',
    }, // dup time+unit
    {
      time: '18:00',
      quantityNumerator: 1,
      quantityDenominator: 4,
      administrationUnit: 'compressa',
    },
    { time: 'bad', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' }, // invalid
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].time, '08:00');
  assert.equal(out[1].time, '18:00');
  assert.equal(out[1].fascia, 'sera');
});

test('strict schedule boundary rejects silent-clear payloads, impossible times and oversized arrays', () => {
  for (const raw of [
    null,
    '08:00',
    [{ time: '25:99' }],
    [{ time: '08:00', quantityNumerator: 5000 }],
    [{ time: '08:00', quantityDenominator: 1.5 }],
  ]) {
    assert.throws(
      () => assertValidSchedulesInput(raw),
      (error: unknown) => error instanceof InvalidTherapySchedulesError,
    );
  }
  assert.throws(
    () =>
      assertValidSchedulesInput(
        Array.from({ length: MAX_THERAPY_SCHEDULES + 1 }, (_, index) => ({
          time: `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
        })),
      ),
    (error: unknown) => error instanceof InvalidTherapySchedulesError,
  );
  assert.doesNotThrow(() => assertValidSchedulesInput([]));
  assert.doesNotThrow(() =>
    assertValidSchedulesInput([{ time: '23:59', administrationUnit: 'compressa' }]),
  );
  assert.deepEqual(
    normalizeSchedules([{ time: '8:00' }]).map((item) => item.time),
    ['08:00'],
  );
});

test('therapy dates are real ISO calendar dates and cannot run backwards', () => {
  assert.doesNotThrow(() => assertValidTherapyDateRange('2026-08-29', '2026-09-01'));
  assert.doesNotThrow(() => assertValidTherapyDateRange('2026-08-29', null));
  assert.deepEqual(normalizeTherapyDateRange(' 2026-08-29 ', ' 2026-09-01 '), {
    dataInizio: '2026-08-29',
    dataFine: '2026-09-01',
  });
  for (const [start, end] of [
    ['2026-02-30', null],
    ['29/08/2026', null],
    ['2026-09-02', '2026-09-01'],
  ]) {
    assert.throws(
      () => assertValidTherapyDateRange(start, end),
      (error: unknown) => error instanceof TherapyDateRangeError,
    );
  }
});
