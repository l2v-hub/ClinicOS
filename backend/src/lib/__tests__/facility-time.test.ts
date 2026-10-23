import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facilityClock, facilityDate } from '../facility-time.js';
import {
  dayKey,
  collectTherapiesDue,
  isConsegnaOverdue,
} from '../../ai/assistant/facility-signals.js';

test('facility day crosses midnight in Rome before UTC, including the winter year boundary', () => {
  assert.deepEqual(facilityClock(new Date('2026-10-12T22:30:00Z')), {
    date: '2026-10-13',
    minutes: 30,
  });
  assert.equal(dayKey(new Date('2026-10-12T22:30:00Z')), '2026-10-13');
  assert.deepEqual(facilityClock(new Date('2026-12-31T23:30:00Z')), {
    date: '2027-01-01',
    minutes: 30,
  });
});
test('facility clock follows spring and autumn DST changes without using the host clock', () => {
  assert.deepEqual(facilityClock(new Date('2026-03-29T00:30:00Z')), {
    date: '2026-03-29',
    minutes: 90,
  });
  assert.deepEqual(facilityClock(new Date('2026-03-29T01:30:00Z')), {
    date: '2026-03-29',
    minutes: 210,
  });
  assert.deepEqual(facilityClock(new Date('2026-10-25T00:30:00Z')), {
    date: '2026-10-25',
    minutes: 150,
  });
  assert.deepEqual(facilityClock(new Date('2026-10-25T01:30:00Z')), {
    date: '2026-10-25',
    minutes: 150,
  });
});
test('nighttime therapy and handover signals compare local clinical times consistently', () => {
  const now = new Date('2026-10-12T22:30:00Z');
  const source = [
    {
      fascia: 'mattina',
      patients: [
        {
          patientId: 'synthetic',
          firstName: 'Test',
          lastName: 'Night',
          room: '',
          bed: '',
          administrations: [
            {
              therapyId: 'future',
              drugName: 'Synthetic',
              scheduledTime: '08:00',
              status: 'pending' as const,
            },
          ],
        },
      ],
    },
  ];
  assert.deepEqual(collectTherapiesDue(source, now, 15), {
    overdue: [],
    dueSoon: [],
    toVerify: [],
  });
  assert.equal(
    isConsegnaOverdue({ stato: 'aperta', scadenza: '2026-10-13', oraScadenza: '00:45' }, now),
    false,
  );
  assert.equal(
    isConsegnaOverdue(
      { stato: 'aperta', scadenza: '2026-10-13', oraScadenza: '00:45' },
      new Date('2026-10-12T22:46:00Z'),
    ),
    true,
  );
});

test('facilityDate converts explicit instants to the Rome calendar date across seasons, year boundaries, and DST', () => {
  assert.equal(facilityDate(new Date('2026-10-18T22:33:00Z')), '2026-10-19');
  assert.equal(facilityDate(new Date('2026-01-01T00:30:00Z')), '2026-01-01');
  assert.equal(facilityDate(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
  assert.equal(facilityDate(new Date('2026-07-31T22:30:00Z')), '2026-08-01');
  assert.equal(facilityDate(new Date('2026-03-29T00:30:00Z')), '2026-03-29');
  assert.equal(facilityDate(new Date('2026-10-25T00:30:00Z')), '2026-10-25');
});

test('facilityDate with no argument uses the facility date at Rome midnight before UTC', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 9, 18, 22, 33) });
  assert.equal(new Date().toISOString().slice(0, 10), '2026-10-18');
  assert.equal(facilityDate(), '2026-10-19');
});

test('facilityDate with no argument follows the Rome year boundary', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 11, 31, 23, 30) });
  assert.equal(new Date().toISOString().slice(0, 10), '2026-12-31');
  assert.equal(facilityDate(), '2027-01-01');
});
