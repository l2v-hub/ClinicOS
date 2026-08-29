import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppointmentListInputError, parseAppointmentListQuery } from '../list-query.js';

test('appointment list accepts a day or a bounded inclusive range', () => {
  assert.deepEqual(parseAppointmentListQuery({ date: '2026-08-29' }), {
    from: '2026-08-29',
    to: '2026-08-29',
    operatorId: undefined,
    limit: 1000,
  });
  assert.deepEqual(
    parseAppointmentListQuery({
      from: '2026-08-01',
      to: '2026-09-11',
      operatorId: 'operator-1',
      limit: '25',
    }),
    { from: '2026-08-01', to: '2026-09-11', operatorId: 'operator-1', limit: 25 },
  );
});

test('appointment list rejects missing, impossible, repeated and oversized inputs', () => {
  for (const query of [
    {},
    { date: '2026-02-30' },
    { from: '2026-08-01', to: '2026-09-12' },
    { date: '2026-08-29', from: '2026-08-29', to: '2026-08-29' },
    { date: ['2026-08-29'] },
    { date: '2026-08-29', operatorId: '../other' },
    { date: '2026-08-29', limit: '1001' },
  ]) {
    assert.throws(() => parseAppointmentListQuery(query), AppointmentListInputError);
  }
});
