import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NarrativeInputError, parseNarrativeSaveInput } from '../narrative-input.js';

test('narrative input preserves bounded text and known review states', () => {
  assert.deepEqual(
    parseNarrativeSaveInput({ reviewedText: 'Testo verificato', reviewStatus: 'reviewed' }),
    { reviewedText: 'Testo verificato', reviewStatus: 'reviewed' },
  );
});

test('narrative input rejects oversized text, wrong types and unknown states', () => {
  for (const input of [
    null,
    { reviewedText: 'x'.repeat(100_001) },
    { originalText: 42 },
    { reviewStatus: 'approved-by-client' },
  ]) {
    assert.throws(() => parseNarrativeSaveInput(input), NarrativeInputError);
  }
});
