import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applySavedParameterSummary, resetParameterDay } from '../parameterEntrySummary';
import type { PatientParametersPageItem } from '../patientParametersPage';

const date = '2026-09-22';
const item: PatientParametersPageItem = {
  patient: { id: 'qa', firstName: 'Esempio', lastName: 'Sintetico', medicalRecordNumber: 'QA' },
  summaryDate: date,
  cartella: {
    pazienteId: 'qa',
    parametriMensili: [],
    readingCount: 3,
    noteCount: 2,
    lastReadingAt: '2026-09-22T10:00:00Z',
  },
};
test('a late save cannot lower a newer daily snapshot; a newer save enriches an older snapshot', () => {
  assert.deepEqual(
    applySavedParameterSummary(item, {
      date,
      count: 2,
      noteCount: 1,
      lastReadingAt: '2026-09-22T09:00:00Z',
    }),
    item,
  );
  const newer = applySavedParameterSummary(item, {
    date,
    count: 4,
    noteCount: 3,
    lastReadingAt: '2026-09-22T11:00:00Z',
  });
  assert.equal(newer.cartella.readingCount, 4);
  assert.equal(newer.cartella.noteCount, 3);
});
test('day rollover keeps patient identity but invalidates counts, including on a failed refresh', () => {
  const reset = resetParameterDay(item, '2026-09-23');
  assert.equal(reset.patient, item.patient);
  assert.equal(reset.summaryPending, true);
  assert.equal(reset.cartella.noteCount, undefined);
  assert.equal(reset.cartella.readingCount, undefined);
  assert.equal(reset.cartella.lastReadingAt, undefined);
  const saved = applySavedParameterSummary(reset, {
    date: '2026-09-23',
    count: 1,
    noteCount: 1,
    lastReadingAt: '2026-09-23T00:01:00Z',
  });
  assert.equal(saved.cartella.noteCount, 1);
});
