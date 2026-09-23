import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAINAD_KEYS, PAINAD_VERSION } from '../types.js';
import { parseAnswers, parseCreate, parseFinalize, parsePatch } from '../input.js';
import { painadResult, PAINAD_ITEMS } from '../painad.js';
import { randomUUID } from 'node:crypto';
test('all 243 complete and 781 partial PAINAD combinations preserve zero, sums and bands', () => {
  const histogram = Array.from({ length: 11 }, () => 0);
  let complete = 0,
    incomplete = 0;
  for (let encoded = 0; encoded < 1024; encoded++) {
    let rest = encoded;
    const values = PAINAD_KEYS.map(() => {
      const n = rest % 4;
      rest = Math.floor(rest / 4);
      return n === 3 ? null : n;
    });
    const parsed = parseAnswers(
      Object.fromEntries(PAINAD_KEYS.map((key, index) => [key, values[index]])),
    );
    const result = painadResult(parsed);
    if (values.includes(null)) {
      incomplete++;
      assert.equal(result, null);
      continue;
    }
    complete++;
    const total = values.reduce<number>((sum, value) => sum + value!, 0);
    histogram[total]++;
    assert.equal(result!.total, total);
    assert.equal(
      result!.band,
      total === 0 ? 'none' : total <= 3 ? 'mild' : total <= 6 ? 'moderate' : 'severe',
    );
  }
  assert.equal(complete, 243);
  assert.equal(incomplete, 781);
  assert.deepEqual(histogram, [1, 5, 15, 30, 45, 51, 45, 30, 15, 5, 1]);
  assert.equal(PAINAD_ITEMS.length, 5);
  assert(
    PAINAD_ITEMS.every(
      (item) => item.options.length === 3 && item.options.every((option) => option.length > 0),
    ),
  );
});
test('boundary rejects missing/extra/coerced values, spoofed author, invalid dates and version', () => {
  const answers = Object.fromEntries(PAINAD_KEYS.map((key) => [key, null]));
  const body = {
    requestId: randomUUID(),
    type: 'painad',
    formVersion: PAINAD_VERSION,
    assessedAt: '2026-03-29T10:00:00.000Z',
    answers,
  };
  assert.equal(parseCreate(body).answers.respiration, null);
  for (const value of [undefined, '0', false, 3, -1, 0.5, {}, []])
    assert.throws(() => parseAnswers({ ...answers, respiration: value }));
  assert.throws(() => parseAnswers({ ...answers, extra: 0 }));
  assert.throws(() => parseCreate({ ...body, authorOperatorId: 'spoof' }));
  assert.throws(() => parseCreate({ ...body, assessedAt: '2026-02-30T10:00:00.000Z' }));
  assert.throws(() => parseCreate({ ...body, predecessorId: 'previous' }));
  assert.throws(() => parseFinalize({ requestId: randomUUID(), expectedVersion: 0 }));
  assert.throws(() =>
    parsePatch({ expectedVersion: 1, assessedAt: body.assessedAt, answers, score: 0 }),
  );
});
