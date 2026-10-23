import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { todayReadings, PatientToday, loadTodayReadings } from '../PatientToday';
import { setSessionCapabilities } from '../../../lib/capabilities';
import type { CapabilityMap } from '../../../types';
import type { PatientParameterReading } from '../../../lib/patientParameterReadings';
Object.assign(globalThis, { React });
test('Today vitals use facility civil date and exclude adjacent day and unrelated old readings', () => {
  const readings = [
    { id: 'late', measuredAt: '2026-10-16T22:30:00Z', values: { fr: '18' } },
    { id: 'before', measuredAt: '2026-10-16T21:30:00Z', values: { fr: '19' } },
  ] as PatientParameterReading[];
  assert.deepEqual(
    todayReadings(readings, '2026-10-17').map((r) => r.id),
    ['late'],
  );
});
test('Today surface never offers denied therapy/clinical read or record action', () => {
  setSessionCapabilities({} as CapabilityMap);
  const html = renderToStaticMarkup(
    React.createElement(PatientToday, { patientId: 'QA1', onRecordVitals: () => {} }),
  );
  assert.match(html, /data-patient-today/);
  assert.doesNotMatch(html, /Terapia di oggi|Rileva ora|Somministra/);
  setSessionCapabilities(null);
});

const reading = (id: string, measuredAt = '2026-10-17T09:00:00Z'): PatientParameterReading =>
  ({ id, patientId: 'QA1', measuredAt, values: { fr: '18' } }) as PatientParameterReading;
test('Today counts the complete daily history and selects latest after paginated duplicates', async () => {
  const calls: unknown[] = [];
  const read: Parameters<typeof loadTodayReadings>[3] = async (_api, _patient, filters) => {
    calls.push(filters);
    return filters.cursor
      ? {
          readings: [reading('new', '2026-10-17T10:00:00Z'), reading('old')],
          hasMore: false,
          nextCursor: null,
        }
      : { readings: [reading('old')], hasMore: true, nextCursor: 'second' };
  };
  const rows = await loadTodayReadings('QA1', '2026-10-17', new AbortController().signal, read);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['new', 'old'],
  );
  assert.deepEqual(calls, [
    { date: '2026-10-17', cursor: undefined },
    { date: '2026-10-17', cursor: 'second' },
  ]);
});
test('Today rejects foreign patients, wrong civil days, repeated cursors and failed subsequent pages', async () => {
  for (const entry of [
    { ...reading('foreign'), patientId: 'OTHER' },
    reading('old', '2026-10-16T09:00:00Z'),
  ]) {
    await assert.rejects(
      loadTodayReadings('QA1', '2026-10-17', new AbortController().signal, async () => ({
        readings: [entry],
        hasMore: false,
        nextCursor: null,
      })),
      /non verificabile/,
    );
  }
  await assert.rejects(
    loadTodayReadings('QA1', '2026-10-17', new AbortController().signal, async () => ({
      readings: [reading('x')],
      hasMore: true,
      nextCursor: 'same',
    })),
    /incompleto/,
  );
  let pages = 0;
  await assert.rejects(
    loadTodayReadings('QA1', '2026-10-17', new AbortController().signal, async () => {
      if (pages++) throw new Error('HTTP failure');
      return { readings: [reading('x')], hasMore: true, nextCursor: 'second' };
    }),
    /HTTP failure/,
  );
});
