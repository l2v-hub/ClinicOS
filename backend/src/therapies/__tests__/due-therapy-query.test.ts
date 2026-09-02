import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../due-therapy-query.ts', import.meta.url), 'utf8');

test('due-therapy CTE projects the schedule dose fields consumed by the final select', () => {
  const dueProjection = source
    .split('WITH due_therapy AS (')[1]
    ?.split('FROM "PatientTherapy" pt')[0];

  assert.ok(dueProjection, 'due_therapy projection not found');
  assert.match(dueProjection, /schedule\."quantityNumerator"/);
  assert.match(dueProjection, /schedule\."quantityDenominator"/);
  assert.match(dueProjection, /schedule\."administrationUnit"/);
});
