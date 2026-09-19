import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  encodeReadingCursor,
  facilityToday,
  parameterDate,
  parseParameterReading,
  parseReadingQuery,
} from '../parameter-reading-input.js';

const requestId = 'bd806dba-1f4e-4f2d-ad31-8e7f2589f753';
const measuredAt = '2026-09-19T09:20:30.123Z';
const valid = (values: unknown = { pa: '120/80' }) => ({ requestId, measuredAt, values });

test('requires bounded typed values and at least one clinical parameter', () => {
  assert.deepEqual(
    parseParameterReading(
      valid({ pa: ' 120 / 80 ', spo2: ' 98 ', temperatura: '36,8', note: '  seduto  ', fc: ' ' }),
    ).values,
    { pa: '120 / 80', spo2: '98', temperatura: '36,8', note: 'seduto' },
  );
  for (const values of [
    null,
    [],
    {},
    { note: 'alone' },
    { fc: 70 },
    { fc: '1e3' },
    { fc: '-4' },
    { spo2: '101' },
    { pa: '120-80' },
    { dtx: '99', custom: 'bad' },
    { temperatura: '36.789' },
    { evacuazione: 'x'.repeat(201) },
    { fc: '72', note: 'x'.repeat(2001) },
  ])
    assert.throws(() => parseParameterReading(valid(values)));
});

test('rejects invalid time, identity and injected author; accepts canonical UTC save instants', () => {
  assert.equal(parseParameterReading(valid()).measuredAt, measuredAt);
  for (const value of [
    '2026-09-19',
    '2026-02-30T10:00:00.000Z',
    '2026-09-19T10:00:00Z',
    '2026-09-19T10:00:00.000+02:00',
    '1999-12-31T00:00:00.000Z',
    '2100-01-01T00:00:00.000Z',
  ]) {
    assert.throws(() => parseParameterReading({ ...valid(), measuredAt: value }));
  }
  assert.throws(() => parseParameterReading({ ...valid(), requestId: 'non-uuid' }));
  assert.throws(() => parseParameterReading({ ...valid(), authorName: 'Forged author' }));
});

test('facility day observes Rome midnight and DST transition dates', () => {
  assert.equal(facilityToday(new Date('2026-09-18T22:00:00.000Z')), '2026-09-19');
  assert.equal(facilityToday(new Date('2026-03-28T23:00:00.000Z')), '2026-03-29');
  assert.equal(facilityToday(new Date('2026-10-24T22:00:00.000Z')), '2026-10-25');
  assert.equal(parameterDate('2028-02-29'), '2028-02-29');
  for (const value of ['2026-02-29', '2026-04-31', '2026-1-01', '1999-01-01', [], null])
    assert.throws(() => parameterDate(value));
});

test('history cursors bind patient/date and paging remains bounded', () => {
  const filters = { patientId: 'patient-a', date: '2026-09-19' };
  const position = { id: requestId, measuredAt };
  const cursor = encodeReadingCursor(position, filters);
  assert.deepEqual(parseReadingQuery('patient-a', { date: filters.date, limit: '100', cursor }), {
    filters,
    limit: 100,
    position,
  });
  assert.equal(parseReadingQuery('patient-a', {}).limit, 50);
  for (const query of [
    { limit: '0' },
    { limit: '101' },
    { limit: 2 },
    { limit: '1.5' },
    { limit: ['1'] },
    { cursor },
    { date: '2026-09-18', cursor },
    { cursor: 'bad' },
    { cursor: 'a'.repeat(601) },
  ]) {
    assert.throws(() => parseReadingQuery('patient-a', query));
  }
  assert.throws(() => parseReadingQuery('patient-b', { date: filters.date, cursor }));
});

test('monthly history validates the month and binds pagination to that month', () => {
  const filters = { patientId: 'patient-a', month: '2026-09' };
  const cursor = encodeReadingCursor({ id: requestId, measuredAt }, filters);
  assert.deepEqual(parseReadingQuery('patient-a', { month: '2026-09', cursor }).filters, filters);
  for (const query of [
    { month: '2026-13' },
    { month: '2026-9' },
    { month: '2026-09', date: '2026-09-19' },
    { month: ['2026-09'] },
    { month: '2026-10', cursor },
    { cursor },
  ]) {
    assert.throws(() => parseReadingQuery('patient-a', query));
  }
});
