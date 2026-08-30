import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MAX_OPERATOR_SCHEDULE_NOTE_LENGTH } from '../OperatorSchedule.js';

test('operator schedule note limit is visible and accessible in the editor', () => {
  assert.equal(MAX_OPERATOR_SCHEDULE_NOTE_LENGTH, 2000);
  const source = readFileSync(new URL('../OperatorSchedule.tsx', import.meta.url), 'utf8');
  assert.match(source, /maxLength=\{MAX_OPERATOR_SCHEDULE_NOTE_LENGTH\}/);
  assert.match(source, /aria-describedby="operator-schedule-note-limit"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /caratteri/);
});
