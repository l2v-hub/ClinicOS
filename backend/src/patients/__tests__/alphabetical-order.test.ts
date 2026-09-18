import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  containsPattern,
  patientAlphabeticalAfter,
  patientAlphabeticalOrder,
} from '../alphabetical-order.js';

test('alphabetical keyset uses the same accent/case normalization and collation as ORDER BY', () => {
  const cursor = patientAlphabeticalAfter({
    lastName: 'ÈRba',
    firstName: 'A\u0300NNA',
    id: 'id-1',
  });
  for (const sql of [patientAlphabeticalOrder.text, cursor.text]) {
    assert.match(sql, /normalize\(btrim\(p\."lastName"\), NFD\)/);
    assert.match(sql, /normalize\(btrim\(p\."firstName"\), NFD\)/);
    assert.match(sql, /p\."id" COLLATE "C"/);
  }
  assert.match(cursor.text, /> \(/);
  assert.ok(cursor.values.includes('ÈRba'));
  assert.ok(cursor.values.includes('A\u0300NNA'));
});

test('cursor names and ids remain bound parameters, never executable SQL', () => {
  const input = "x'); DELETE FROM Patient; --";
  const cursor = patientAlphabeticalAfter({ lastName: input, firstName: input, id: input });
  assert.equal(cursor.text.includes(input), false);
  assert.equal(cursor.values.filter((value) => value === input).length, 3);
});

test('literal search wildcards are escaped inside a bound contains pattern', () => {
  assert.equal(containsPattern('A%_\\B'), '%A\\%\\_\\\\B%');
});
