import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MAX_OPERATOR_DIRECTORY, boundOperatorDirectory } from '../directory-window.js';

test('operator directory exposes at most 500 rows with an explicit overflow sentinel', () => {
  const exact = boundOperatorDirectory(
    Array.from({ length: MAX_OPERATOR_DIRECTORY }, (_, index) => index),
  );
  assert.equal(exact.items.length, MAX_OPERATOR_DIRECTORY);
  assert.equal(exact.overflow, false);

  const overflow = boundOperatorDirectory(
    Array.from({ length: MAX_OPERATOR_DIRECTORY + 1 }, (_, index) => index),
  );
  assert.equal(overflow.items.length, MAX_OPERATOR_DIRECTORY);
  assert.equal(overflow.items.at(-1), MAX_OPERATOR_DIRECTORY - 1);
  assert.equal(overflow.overflow, true);
});

test('both operator rosters are stable, bounded and count only their returned rows', () => {
  const source = readFileSync(new URL('../../routes/operators.ts', import.meta.url), 'utf8');
  assert.equal((source.match(/take: MAX_OPERATOR_DIRECTORY \+ 1/g) ?? []).length, 2);
  assert.equal((source.match(/boundOperatorDirectory\(operators\)/g) ?? []).length, 2);
  assert.equal(
    (source.match(/orderBy: \[\{ createdAt: 'asc' \}, \{ id: 'asc' \}\]/g) ?? []).length,
    2,
  );
  assert.equal((source.match(/appointments: \{ where: \{ scheduledAt \}\s*\}/g) ?? []).length, 2);
  assert.doesNotMatch(source, /appointmentsTodayByOperator/);
  assert.match(source, /res\.status\(409\)/);
});
