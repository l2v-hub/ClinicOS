import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  OperatorPageInputError,
  decodeOperatorPageCursor,
  encodeOperatorPageCursor,
  parseOperatorPageQuery,
} from '../page-query.js';

test('operator pages default to 50 and cap every response request at 100', () => {
  assert.deepEqual(parseOperatorPageQuery({}), { limit: 50, q: undefined, cursor: undefined });
  assert.equal(parseOperatorPageQuery({ limit: '1000' }).limit, 100);
  for (const limit of ['0', '-1', '1.5', 'nan']) {
    assert.throws(() => parseOperatorPageQuery({ limit }), OperatorPageInputError);
  }
  assert.throws(() => parseOperatorPageQuery({ q: 'x'.repeat(81) }), OperatorPageInputError);
});

test('operator cursor is canonical and bound to the active search', () => {
  const position = { createdAt: new Date('2026-08-30T10:00:00.000Z'), id: 'operator-1' };
  const cursor = encodeOperatorPageCursor(position, { q: 'rossi' });
  assert.deepEqual(decodeOperatorPageCursor(cursor, { q: 'rossi' }), position);
  assert.throws(() => decodeOperatorPageCursor(cursor, { q: 'bianchi' }), OperatorPageInputError);
  assert.throws(
    () => decodeOperatorPageCursor('not+base64', { q: 'rossi' }),
    OperatorPageInputError,
  );
  const nonCanonicalDate = Buffer.from(
    JSON.stringify({ v: 1, createdAt: '2026-08-30', id: 'operator-1', q: 'rossi' }),
  ).toString('base64url');
  assert.throws(
    () => decodeOperatorPageCursor(nonCanonicalDate, { q: 'rossi' }),
    OperatorPageInputError,
  );
});

test('both roster page routes use stable keyset windows and a 101-row sentinel', () => {
  const source = readFileSync(new URL('../../routes/operators.ts', import.meta.url), 'utf8');
  assert.equal((source.match(/take: input\.limit \+ 1/g) ?? []).length, 2);
  assert.equal((source.match(/encodeOperatorPageCursor/g) ?? []).length >= 3, true);
  assert.equal(
    (source.match(/orderBy: \[\{ createdAt: 'asc' \}, \{ id: 'asc' \}\]/g) ?? []).length >= 4,
    true,
  );
  assert.match(source, /operatorsRouter\.get\('\/directory\/page'/);
  assert.match(source, /operatorsRouter\.get\('\/page'/);
});
