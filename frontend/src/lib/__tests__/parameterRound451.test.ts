import test from 'node:test';
import assert from 'node:assert/strict';
import { nextParameterPatient, nextParameterPatientAcrossPages } from '../parameterRound';
import { previousPlaceholder } from '../parameterPad';
import type { PatientParametersPageItem } from '../patientParametersPage';
const day = '2026-10-17';
const row = (
  id: string,
  count?: number,
  pending = false,
  date = day,
): PatientParametersPageItem => ({
  patient: { id, firstName: 'QA', lastName: id, medicalRecordNumber: id },
  cartella: { pazienteId: id, parametriMensili: [], readingCount: count },
  summaryDate: date,
  summaryPending: pending,
});
test('advance skips recorded and unknown/stale patients and wraps without selecting current patient', () => {
  const rows = [
    row('one', 0),
    row('done', 2),
    row('unknown'),
    row('stale', 0, false, '2026-10-16'),
    row('pending', 0, true),
    row('two', 0),
  ];
  assert.equal(nextParameterPatient(rows, 'one', day)?.patient.id, 'two');
  assert.equal(nextParameterPatient(rows, 'two', day)?.patient.id, 'one');
  assert.equal(nextParameterPatient([row('one', 1), row('done', 1)], 'one', day), null);
});
test('previous placeholders only contain actual observation and never missing prose', () => {
  assert.equal(previousPlaceholder({ status: 'loading' }, 'fr'), '');
  assert.equal(previousPlaceholder({ status: 'error' }, 'fr'), '');
  assert.equal(
    previousPlaceholder({ status: 'ready', values: {}, count: 0, hasMore: false }, 'fr'),
    '',
  );
  const text = previousPlaceholder(
    {
      status: 'ready',
      values: { fr: { value: '18', measuredAt: '2026-10-17T07:00:00Z' } },
      count: 1,
      hasMore: false,
    },
    'fr',
    new Date('2026-10-17T10:00:00Z'),
  );
  assert.match(text, /18/);
  assert.match(text, /3/);
});

test('advance reaches the unfinished patient after an entirely completed intermediate page', async () => {
  const calls: string[] = [];
  const next = await nextParameterPatientAcrossPages(
    [row('saved', 1), row('complete', 1)],
    'saved',
    day,
    'second',
    async (cursor) => {
      calls.push(cursor);
      return cursor === 'second'
        ? { items: [row('middle', 1)], nextCursor: 'third' }
        : { items: [row('last', 0)], nextCursor: null };
    },
    () => true,
  );
  assert.equal(next?.patient.id, 'last');
  assert.deepEqual(calls, ['second', 'third']);
});
test('advance stops on cursor loops, unavailable pages and changed day or selection', async () => {
  await assert.rejects(
    nextParameterPatientAcrossPages(
      [row('saved', 1)],
      'saved',
      day,
      'same',
      async () => ({ items: [row('complete', 1)], nextCursor: 'same' }),
      () => true,
    ),
    /pagine successive/,
  );
  assert.equal(
    await nextParameterPatientAcrossPages(
      [row('saved', 1)],
      'saved',
      day,
      'next',
      async () => undefined,
      () => true,
    ),
    null,
  );
  let current = true;
  assert.equal(
    await nextParameterPatientAcrossPages(
      [row('saved', 1)],
      'saved',
      day,
      'next',
      async () => {
        current = false;
        return { items: [row('wrong-context', 0)], nextCursor: null };
      },
      () => current,
    ),
    null,
  );
});
