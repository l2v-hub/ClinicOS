import assert from 'node:assert/strict';
import { test } from 'node:test';
import { importPollDelayMs } from '../importSessionApi';

test('the job state is read closely at first, every second for a letter, then every two', () => {
  assert.equal(importPollDelayMs(0), 600);
  assert.equal(importPollDelayMs(1), 800);
  assert.equal(importPollDelayMs(2), 1000);
  assert.equal(importPollDelayMs(29), 1000);
  assert.equal(importPollDelayMs(30), 2000);
  // First half minute of a letter: well under one read per second on average.
  const firstThirty = Array.from({ length: 30 }, (_, i) => importPollDelayMs(i)).reduce(
    (a, b) => a + b,
  );
  assert.ok(firstThirty >= 29_000);
});
