import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DiaryPageInputError,
  decodeDiaryPageCursor,
  encodeDiaryPageCursor,
  parseDiaryPageQuery,
} from '../diary-pagination.js';

test('diary page defaults to 50 and keeps bounded legacy offset support', () => {
  assert.deepEqual(parseDiaryPageQuery({}), {
    limit: 50,
    offset: undefined,
    cursor: undefined,
    authorType: undefined,
    from: undefined,
    to: undefined,
  });
  assert.equal(parseDiaryPageQuery({ limit: '999' }).limit, 100);
  assert.equal(parseDiaryPageQuery({ offset: '25' }).offset, 25);
});

test('diary page rejects ambiguous or abusive bounds and dates', () => {
  for (const query of [
    { limit: '0' },
    { limit: '10foo' },
    { offset: '-1' },
    { offset: '100001' },
    { from: '2026-02-30' },
    { from: '2026-08-30', to: '2026-08-29' },
    { authorType: 'x'.repeat(33) },
    { authorType: ['medico'] },
  ]) {
    assert.throws(() => parseDiaryPageQuery(query), DiaryPageInputError);
  }
});

test('diary cursor is canonical and bound to every active filter', () => {
  const filters = { authorType: 'infermiere', from: '2026-08-01', to: '2026-08-29' };
  const cursor = encodeDiaryPageCursor(
    { entryDateTime: '2026-08-29T10:00', id: 'entry-50' },
    filters,
  );
  assert.deepEqual(decodeDiaryPageCursor(cursor, filters), {
    entryDateTime: '2026-08-29T10:00',
    id: 'entry-50',
  });
  assert.throws(
    () => decodeDiaryPageCursor(cursor, { ...filters, authorType: 'medico' }),
    DiaryPageInputError,
  );
  assert.throws(() => parseDiaryPageQuery({ cursor, offset: '50' }), DiaryPageInputError);
});

test('diary cursor rejects malformed, non-canonical and incomplete payloads', () => {
  const incomplete = Buffer.from(JSON.stringify({ v: 1, id: 'entry-1' })).toString('base64url');
  for (const cursor of ['not-base64!', 'a'.repeat(1025), incomplete]) {
    assert.throws(() => decodeDiaryPageCursor(cursor, {}), DiaryPageInputError);
  }
});
