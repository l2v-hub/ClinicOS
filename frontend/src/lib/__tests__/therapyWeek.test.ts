// Calendario del giro terapia: settimana da lunedì, fasce in ordine, stato onesto delle celle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellLabel, cellTone, weekDays, weekFasce } from '../therapyWeek';
import type { TherapySlot } from '../../types';

function slot(
  fascia: TherapySlot['fascia'],
  ora: string,
  s: Partial<TherapySlot['summary']>,
): TherapySlot {
  return {
    id: `ts-${fascia}`,
    fascia,
    label: fascia,
    ora,
    summary: { total: 0, administered: 0, notAdministered: 0, pending: 0, ...s },
    patients: [],
  };
}

test('the week runs Monday to Sunday around any day, across month and year ends', () => {
  assert.deepEqual(weekDays('2026-09-28'), [
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
  ]);
  assert.equal(weekDays('2026-10-04')[0], '2026-09-28'); // domenica → lunedì precedente
  assert.deepEqual(weekDays('2027-01-01').slice(0, 1), ['2026-12-28']);
});

test('time slots of the week are listed once each, in time order, even if a day lacks one', () => {
  const f = weekFasce({
    a: [slot('sera', '20:00', { total: 1 }), slot('mattina', '08:00', { total: 2 })],
    b: [slot('pranzo', '12:00', { total: 1 })],
    c: undefined,
  });
  assert.deepEqual(
    f.map((x) => x.ora),
    ['08:00', '12:00', '20:00'],
  );
});

test('cell state: empty, complete, to do today, future, and past without records (to verify)', () => {
  const today = '2026-09-28';
  assert.equal(cellTone(undefined, today, today, '10:00'), 'vuota');
  assert.equal(cellTone(slot('mattina', '08:00', { total: 0 }), today, today, '10:00'), 'vuota');
  assert.equal(
    cellTone(
      slot('mattina', '08:00', { total: 3, administered: 2, notAdministered: 1 }),
      today,
      today,
      '10:00',
    ),
    'completa',
  );
  assert.equal(
    cellTone(slot('sera', '20:00', { total: 2, pending: 2 }), today, today, '10:00'),
    'da-fare',
  );
  assert.equal(
    cellTone(slot('mattina', '08:00', { total: 2, pending: 1 }), today, today, '10:00'),
    'mancanti',
  );
  assert.equal(
    cellTone(slot('sera', '20:00', { total: 2, pending: 2 }), '2026-09-27', today, '10:00'),
    'mancanti',
  );
  assert.equal(
    cellTone(slot('mattina', '08:00', { total: 2, pending: 2 }), '2026-09-29', today, '10:00'),
    'futura',
  );
});

test('cell label says what the data says, never "skipped"', () => {
  const s = slot('mattina', '08:00', { total: 5, administered: 2, notAdministered: 1, pending: 2 });
  assert.equal(
    cellLabel(s, 'mancanti'),
    '3 registrate su 5, 1 non somministrate, 2 senza registrazione',
  );
  assert.equal(
    cellLabel(s, 'da-fare'),
    '3 registrate su 5, 1 non somministrate, 2 da somministrare',
  );
  assert.doesNotMatch(cellLabel(s, 'mancanti'), /saltat/);
});
