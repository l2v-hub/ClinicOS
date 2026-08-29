import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  encodeTherapyListCursor,
  parseTherapyListQuery,
  TherapyListInputError,
} from '../list-query.js';

test('therapy list query is bounded and round-trips a stable cursor', () => {
  assert.deepEqual(parseTherapyListQuery({}), { limit: 50, status: 'tutte' });
  assert.deepEqual(parseTherapyListQuery({ limit: '100', status: 'attiva' }), {
    limit: 100,
    status: 'attiva',
  });

  const token = encodeTherapyListCursor(
    { createdAt: new Date('2030-01-02T03:04:05.000Z'), id: 'therapy_123' },
    { status: 'non_attiva', q: 'warfarin', tipo: 'periodica', data: '2030-01-02' },
  );
  assert.deepEqual(
    parseTherapyListQuery({
      cursor: token,
      status: 'non_attiva',
      q: ' warfarin ',
      tipo: 'periodica',
      data: '2030-01-02',
    }),
    {
      limit: 50,
      status: 'non_attiva',
      q: 'warfarin',
      tipo: 'periodica',
      data: '2030-01-02',
      cursor: { createdAt: new Date('2030-01-02T03:04:05.000Z'), id: 'therapy_123' },
    },
  );
  assert.throws(
    () => parseTherapyListQuery({ cursor: token, status: 'attiva' }),
    TherapyListInputError,
  );
});

test('therapy list query rejects malformed bounds, filters and cursors', () => {
  const invalid = [
    { limit: '0' },
    { limit: '101' },
    { limit: '10foo' },
    { status: 'archiviata' },
    { tipo: 'occasionale' },
    { data: '2030-02-30' },
    { q: 'x' },
    { q: 'x'.repeat(81) },
    { q: 'war%' },
    { q: 'met_formina' },
    { cursor: 'not+base64' },
    { cursor: 'a'.repeat(1025) },
    { offset: '10' },
  ];
  for (const query of invalid) {
    assert.throws(() => parseTherapyListQuery(query), TherapyListInputError);
  }
  const token = encodeTherapyListCursor(
    { createdAt: new Date('2030-01-02T03:04:05.000Z'), id: 'therapy_123' },
    { status: 'tutte', q: 'warfarin' },
  );
  assert.throws(
    () => parseTherapyListQuery({ cursor: token, q: 'metformina' }),
    TherapyListInputError,
  );
});
