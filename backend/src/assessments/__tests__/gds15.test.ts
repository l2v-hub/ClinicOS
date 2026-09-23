import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GDS15_ITEMS } from '../gds15-definition.js';
import { GDS15_KEYS } from '../gds15-types.js';
import { parseGds15Answers, gds15Completion, gds15Result, gds15SnapshotItems } from '../gds15.js';
import { parseCreate, parsePatch, payloadHash } from '../input.js';
import { gds15Answers, gds15Input } from './gds15-fixture.js';

test('GDS15 exhaustively scores 32768 answer combinations against the source reverse-key mask and every band boundary', () => {
  const reverseMask = (1 << 0) | (1 << 4) | (1 << 6) | (1 << 10) | (1 << 12);
  const histogram = Array.from({ length: 16 }, () => 0);
  assert.deepEqual(
    GDS15_ITEMS.map((item) => item.id),
    GDS15_KEYS,
  );
  for (let mask = 0; mask < 32768; mask++) {
    const answers = gds15Answers();
    GDS15_KEYS.forEach((key, index) => {
      answers[key] = Boolean(mask & (1 << index));
    });
    let bits = mask ^ reverseMask,
      expected = 0;
    while (bits) {
      expected += bits & 1;
      bits >>>= 1;
    }
    const result = gds15Result(parseGds15Answers(answers))!;
    assert.equal(result.total, expected, 'mask ' + mask);
    assert.equal(result.maximum, 15);
    assert.equal(result.band, expected < 6 ? 'none' : expected < 10 ? 'mild_moderate' : 'severe');
    assert.equal(
      result.label,
      expected < 6
        ? 'Assente / Nella norma'
        : expected < 10
          ? 'Depressione lieve–moderata'
          : 'Depressione grave',
    );
    histogram[expected]++;
    const items = gds15SnapshotItems(answers);
    assert.equal(
      items.reduce((sum, item) => sum + item.score, 0),
      expected,
    );
    items.forEach((item) => {
      assert.equal(item.answer, answers[item.id]);
      assert.equal(item.description, answers[item.id] ? 'Sì' : 'No');
    });
  }
  assert.deepEqual(
    histogram,
    [1, 15, 105, 455, 1365, 3003, 5005, 6435, 6435, 5005, 3003, 1365, 455, 105, 15, 1],
  );
  assert.equal(gds15Result(gds15Answers(true))!.total, 10);
  assert.equal(gds15Result(gds15Answers(false))!.total, 5);
});

test('GDS15 partial answers never receive a result, and strict boundaries reject every non-boolean domain or missing key', () => {
  const empty = gds15Answers(null);
  assert.equal(gds15Result(empty), null);
  assert.deepEqual(gds15Completion(empty), { complete: false, missingPaths: [...GDS15_KEYS] });
  for (const key of GDS15_KEYS) {
    const partial = { ...gds15Answers(), [key]: null };
    assert.deepEqual(gds15Completion(partial), { complete: false, missingPaths: [key] });
    assert.equal(gds15Result(partial), null);
    assert.throws(() => gds15SnapshotItems(partial));
    const missing: any = { ...gds15Answers() };
    delete missing[key];
    assert.throws(() => parseGds15Answers(missing));
    for (const value of [undefined, 0, 1, -1, 'true', 'false', '', [], {}])
      assert.throws(() => parseGds15Answers({ ...empty, [key]: value }));
    for (const value of [true, false, null])
      assert.equal(parseGds15Answers({ ...empty, [key]: value })[key], value);
  }
  for (const value of [null, [], false, { ...empty, extra: true }])
    assert.throws(() => parseGds15Answers(value));
  assert.throws(() => parseCreate(gds15Input({ formVersion: 'painad-it-2026-09-22-v1' })));
  assert.throws(() => parseCreate({ ...gds15Input(), author: 'spoofed' }));
  assert.equal(parseCreate(gds15Input()).type, 'gds15');
  assert.deepEqual(
    parsePatch({ expectedVersion: 1, assessedAt: gds15Input().assessedAt, answers: empty }, 'gds15')
      .answers,
    empty,
  );
});

test('GDS15 notes preserve 4000 Unicode codepoints, whitespace and canonical payload hashes without coercion', () => {
  const omitted: any = gds15Answers();
  delete omitted.notes;
  assert.equal(parseGds15Answers(omitted).notes, '');
  for (const notes of ['  prima\nseconda à Ω\r\n\t', '😀'.repeat(4000), '≤ ≥ →'])
    assert.equal(parseGds15Answers({ ...gds15Answers(), notes }).notes, notes);
  for (const notes of [null, 0, false, 'x'.repeat(4001), '\u0000', '\u000b', '\u007f', '\ud800'])
    assert.throws(() => parseGds15Answers({ ...gds15Answers(), notes }));
  const initial = gds15Answers(null);
  const reversed = Object.fromEntries(Object.entries(initial).reverse());
  assert.equal(payloadHash(parseGds15Answers(reversed)), payloadHash(parseGds15Answers(initial)));
  for (const changed of [
    { ...initial, notes: ' ' },
    { ...initial, q1: false },
    { ...initial, q1: true },
  ])
    assert.notEqual(
      payloadHash(parseGds15Answers(changed)),
      payloadHash(parseGds15Answers(initial)),
    );
});
