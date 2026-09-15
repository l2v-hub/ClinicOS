import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TherapyAdministration, TherapySlot } from '../../types';
import { summarizeDashboardTherapies, therapyCalendar, therapyTime } from '../dashboardTherapies';
import { parseTherapySlots } from '../therapySlotPage';

const now = new Date('2026-09-14T08:00:00Z'); // 10:00 a Roma
function dose(time: string, changes: Partial<TherapyAdministration> = {}): TherapyAdministration {
  return {
    administrationId: null,
    therapyId: `therapy-${time}`,
    drugName: 'Farmaco test',
    dosage: '10 mg',
    route: 'orale',
    scheduledTime: time,
    status: 'pending',
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
    ...changes,
  };
}
function slots(administrations: TherapyAdministration[]): TherapySlot[] {
  return [
    {
      id: 'morning',
      fascia: 'mattina',
      label: 'Mattina',
      ora: '06:00',
      summary: {
        total: administrations.length,
        pending: administrations.length,
        administered: 0,
        notAdministered: 0,
      },
      patients: [
        {
          patientId: 'patient-test',
          firstName: 'Persona',
          lastName: 'Test',
          room: '1',
          bed: 'A',
          administrations,
        },
      ],
    },
  ];
}

test('orders individual due times, keeps adesso upcoming, and separates overdue doses', () => {
  const result = summarizeDashboardTherapies(
    slots([dose('13:00'), dose('8:30'), dose('10:00'), dose('11:15')]),
    slots([dose('08:00')]),
    now,
  );
  assert.deepEqual(
    result.prossime.map((row) => [row.data, row.ora, row.minuti]),
    [
      ['2026-09-14', '10:00', 0],
      ['2026-09-14', '11:15', 75],
      ['2026-09-14', '13:00', 180],
      ['2026-09-15', '08:00', 1320],
    ],
  );
  assert.equal(result.scadute[0].ora, '08:30');
  assert.equal(result.inRitardo, 1);
  assert.equal(result.daFare, 4); // domani non aumenta i KPI odierni
  assert.equal(result.ritardi[0].voci[0].minutiRitardo, 90);
});

test('terminal or unknown statuses never appear as pending deadlines', () => {
  const result = summarizeDashboardTherapies(
    slots([
      dose('11:00', { status: 'administered' }),
      dose('12:00', { status: 'not_administered' }),
      dose('13:00', { status: 'unexpected' as TherapyAdministration['status'] }),
    ]),
    [],
    now,
  );
  assert.equal(result.prossime.length, 0);
  assert.equal(result.fatte, 1);
  assert.equal(result.nonErogate, 1);
  assert.equal(result.daFare, 0);
});

test('prescribed fractional quantity wins over dosage without arithmetic or fallback from slot time', () => {
  const result = summarizeDashboardTherapies(
    slots([
      dose('10:45', {
        quantityLabel: '1/2 compressa — equivalente a 50 mg',
        dosage: '100 mg',
        route: 'orale',
      }),
    ]),
    [],
    now,
  );
  assert.equal(result.prossime[0].dose, '1/2 compressa — equivalente a 50 mg');
  assert.equal(result.prossime[0].via, 'orale');
  assert.equal(result.prossime[0].ora, '10:45');
  assert.equal(result.prossime[0].patientId, 'patient-test');
});

test('invalid or missing times remain visible as needing verification, never a fabricated deadline', () => {
  for (const value of ['24:00', '08:60', '-1:00', '', undefined, null])
    assert.equal(therapyTime(value), null);
  assert.equal(therapyTime('8:30'), 510);
  const result = summarizeDashboardTherapies(
    slots([dose('25:00'), dose(''), dose('09:99')]),
    [],
    now,
  );
  assert.equal(result.senzaOrario.length, 3);
  assert.equal(result.inRitardo, 0);
  assert.equal(result.prossime.length, 0);
  assert.equal(result.daFare, 3);
});

test('deduplicates identical dose identities but retains distinct therapies, patients and days', () => {
  const today = slots([dose('10:00'), dose('10:00'), dose('10:00', { therapyId: 'second' })]);
  today[0].patients.push({
    ...today[0].patients[0],
    patientId: 'other',
    administrations: [dose('10:00')],
  });
  const result = summarizeDashboardTherapies(today, slots([dose('10:00')]), now);
  assert.equal(result.totale, 3);
  assert.equal(result.prossime.length, 4);
  assert.equal(new Set(result.prossime.map((row) => row.id)).size, 4);
});

test('large overdue groups do not consume the upcoming list and order patients by worst delay', () => {
  const today = slots(
    Array.from({ length: 30 }, (_, i) => dose('08:00', { therapyId: `old-${i}` })),
  );
  today[0].patients.push({
    ...today[0].patients[0],
    patientId: 'earlier',
    administrations: [dose('07:00')],
  });
  today[0].patients[0].administrations.push(dose('11:00'));
  const result = summarizeDashboardTherapies(today, [], now);
  assert.equal(result.scadute.length, 31);
  assert.equal(result.prossime.length, 1);
  assert.equal(result.prossime[0].ora, '11:00');
  assert.equal(result.ritardi[0].patientId, 'earlier');
});

test('facility calendar handles Rome midnight, DST and year rollover independently of host timezone', () => {
  assert.deepEqual(therapyCalendar(new Date('2026-09-14T22:01:00Z')), {
    oggi: '2026-09-15',
    domani: '2026-09-16',
    minuto: 1,
  });
  assert.equal(therapyCalendar(new Date('2026-03-28T23:30:00Z')).domani, '2026-03-30');
  assert.equal(therapyCalendar(new Date('2026-10-25T22:30:00Z')).domani, '2026-10-26');
  assert.equal(therapyCalendar(new Date('2026-12-31T22:30:00Z')).domani, '2027-01-01');
});

test('clock progression moves the same dose from upcoming to overdue at the next minute', () => {
  const data = slots([dose('10:00')]);
  assert.equal(summarizeDashboardTherapies(data, [], now).prossime.length, 1);
  const after = summarizeDashboardTherapies(data, [], new Date('2026-09-14T08:01:00Z'));
  assert.equal(after.prossime.length, 0);
  assert.equal(after.scadute[0].minuti, -1);
});

test('complete response parser rejects malformed data rather than declaring no therapy', () => {
  assert.throws(() => parseTherapySlots({ error: 'not an array' }));
  assert.throws(() => parseTherapySlots([{ patients: [] }]));
  assert.throws(() =>
    parseTherapySlots(
      slots([dose('10:00', { status: 'unknown' as TherapyAdministration['status'] })]),
    ),
  );
  assert.deepEqual(parseTherapySlots([]), []);
  assert.equal(parseTherapySlots(slots([dose('10:00')]))[0].patients.length, 1);
});

test('untrusted missing dose fields cannot become JSX objects or inferred prescriptions', () => {
  const result = summarizeDashboardTherapies(
    slots([
      dose('12:00', {
        dosage: null as unknown as string,
        quantityLabel: {} as string,
        route: null as unknown as string,
      }),
    ]),
    [],
    now,
  );
  assert.equal(result.prossime[0].dose, 'Dose non indicata');
  assert.equal(result.prossime[0].via, 'Via non indicata');
});
