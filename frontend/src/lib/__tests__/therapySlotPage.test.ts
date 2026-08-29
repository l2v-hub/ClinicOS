import assert from 'node:assert/strict';
import test from 'node:test';
import type { TherapySlot } from '../../types';
import {
  buildTherapySlotPageUrl,
  mergeTherapySlotPages,
  parseTherapySlotPage,
} from '../therapySlotPage';

const slot = (therapyId: string, total: number): TherapySlot => ({
  id: 'ts-mattina',
  fascia: 'mattina',
  label: 'Terapia Mattina',
  ora: therapyId === 't1' ? '09:00' : '08:30',
  summary: { total, administered: 0, notAdministered: 0, pending: total },
  patients: [
    {
      patientId: 'p1',
      firstName: 'Ada',
      lastName: 'Test',
      room: '1',
      bed: 'A',
      administrations: [
        {
          administrationId: null,
          therapyId,
          drugName: therapyId,
          dosage: '1 mg',
          route: 'orale',
          scheduledTime: '09:00',
          status: 'pending',
          administeredAt: null,
          administeredBy: null,
          notAdministeredReason: null,
        },
      ],
    },
  ],
});

test('therapy slot URL is bounded and carries an opaque cursor', () => {
  const url = buildTherapySlotPageUrl('https://api.test', '2030-06-15', 'opaque+/=');
  assert.equal(
    url,
    'https://api.test/therapy-slots/page?date=2030-06-15&limit=100&cursor=opaque%2B%2F%3D',
  );
});

test('therapy pages merge patients and therapies while replacing exact summaries', () => {
  const merged = mergeTherapySlotPages([slot('t1', 5001)], [slot('t2', 1)]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.summary.total, 5001);
  assert.equal(merged[0]!.ora, '08:30');
  assert.deepEqual(
    merged[0]!.patients[0]!.administrations.map((row) => row.therapyId),
    ['t1', 't2'],
  );
});

test('therapy page parser rejects partial responses without a continuation cursor', () => {
  assert.throws(() =>
    parseTherapySlotPage({
      slots: [],
      pageInfo: {
        hasMore: true,
        nextCursor: null,
        loadedTherapies: 100,
        completeness: 'partial',
        summaryExact: true,
      },
    }),
  );
});
