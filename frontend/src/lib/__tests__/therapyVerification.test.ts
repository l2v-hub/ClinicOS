import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FacilitySnapshotBody, OperatorQueueBody } from '../../components/shared/agnos/AgnosBrief';
import { TherapyVerificationPanel } from '../../components/shared/TherapyVerificationPanel';
import { administrationBody } from '../therapyAdministrationWrite';
import { parseTherapySlots, mergeTherapySlotPages } from '../therapySlotPage';
import { giroTimes } from '../therapyGiro';
import { summarizeDashboardTherapies } from '../dashboardTherapies';
import { buildPatientTherapyDay } from '../patientTherapyCalendar';
import type { PatientTherapyAPI, TherapyVerificationGroup } from '../../types';

Object.assign(globalThis, { React });
const group = (id = 't1', total = 2): TherapyVerificationGroup => ({
  kind: 'verification',
  id: 'therapy-verification',
  date: '2030-01-01',
  label: 'Da verificare',
  fascia: null,
  ora: null,
  summary: { total, verification: total },
  patients: [
    {
      patientId: 'p1',
      firstName: 'Ada',
      lastName: 'Synthetic',
      room: '1',
      bed: 'A',
      items: [
        {
          therapyId: id,
          drugName: 'Farmaco sintetico',
          status: 'to_verify',
          reason: 'conflicting_schedule',
          scheduledTime: null,
          quantityLabel: null,
          dosage: null,
          canAdminister: false,
        },
      ],
    },
  ],
});

test('verification survives serialization and pagination without becoming a timed administration', () => {
  const first = parseTherapySlots(JSON.parse(JSON.stringify([group()])));
  const merged = mergeTherapySlotPages(first, [group('t2', 1)]);
  const verification = merged[0];
  assert.equal(verification.kind, 'verification');
  if (verification.kind !== 'verification') throw new Error('missing verification');
  assert.equal(verification.summary.total, 2);
  assert.deepEqual(
    verification.patients[0].items.map((item) => item.therapyId),
    ['t1', 't2'],
  );
  assert.equal(mergeTherapySlotPages(merged, [group('t2', 1)])[0].summary.total, 2);
  assert.deepEqual(giroTimes(merged), []);
  const summary = summarizeDashboardTherapies(merged, [], new Date('2030-01-01T10:00:00Z'));
  assert.equal(summary.daVerificare, 2);
  assert.equal(summary.totale, 2);
  assert.equal(summary.daFare, 0);
  assert.equal(summary.inRitardo, 0);
  assert.deepEqual(summary.scadute, []);
  assert.equal(summary.verificationGroups.length, 1);
  const html = renderToStaticMarkup(
    React.createElement(TherapyVerificationPanel, { groups: first }),
  );
  assert.match(html, /Da verificare · 2/);
  assert.match(html, /Mostrate 1 di 2/);
  assert.match(html, /Farmaco sintetico/);
  assert.doesNotMatch(html, /<button|08:00|Somministra ora|1 compressa/);
});

test('verification parser rejects a fabricated writable identity or quantity', () => {
  for (const patch of [{ fascia: 'mattina' }, { ora: '08:00' }])
    assert.throws(() => parseTherapySlots([{ ...group(), ...patch }]));
  for (const patch of [
    { scheduledTime: '08:00' },
    { dosage: '1 compressa' },
    { quantityLabel: '1' },
    { canAdminister: true },
    { status: 'pending' },
  ]) {
    const value = group();
    Object.assign(value.patients[0].items[0], patch);
    assert.throws(() => parseTherapySlots([value]));
  }
});

test('explicit refusal correction changes only the expected state and keeps a supplied retry key', () => {
  const info = {
    patientId: 'p1',
    therapyId: 't1',
    date: '2030-01-01',
    fascia: 'mattina',
    scheduledTime: '08:30',
  };
  const pending = administrationBody(info, { kind: 'administered' });
  const correction = administrationBody(
    info,
    { kind: 'administered' },
    { expectedStato: 'non_erogata', requestId: 'correction-123' },
  );
  assert.equal(pending.expectedStato, 'da_erogare');
  assert.equal(correction.expectedStato, 'non_erogata');
  assert.equal(correction.requestId, 'correction-123');
  assert.equal('farmacoDose' in correction, false);
});

test('prescription calendar checks one-off consistency before accepting a schedule', () => {
  const base = {
    id: 't1',
    patientId: 'p1',
    tipo: 'una_tantum',
    stato: 'attiva',
    farmacoNome: 'Synthetic',
    dosaggio: 'Prescribed',
    viaSomministrazione: 'orale',
    dataSomministrazione: '2030-01-01',
    orarioSomministrazione: '8:30',
    schedules: [],
  } as unknown as PatientTherapyAPI;
  assert.equal(buildPatientTherapyDay([base], 'p1', '2030-01-01').events[0].time, '08:30');
  const schedule = {
    id: 's1',
    therapyId: 't1',
    time: '09:30',
    fascia: 'mattina',
    quantityNumerator: 1,
    quantityDenominator: 1,
    administrationUnit: 'compressa',
  };
  for (const therapy of [
    { ...base, orarioSomministrazione: null },
    { ...base, schedules: [schedule] },
    {
      ...base,
      schedules: [
        { ...schedule, time: '08:30' },
        { ...schedule, time: '08:30' },
      ],
    },
  ]) {
    const day = buildPatientTherapyDay([therapy], 'p1', '2030-01-01');
    assert.deepEqual(day.events, []);
    assert.equal(day.unscheduled.length, 1);
    assert.match(day.unscheduled[0].reason, /Da verificare/);
  }
});

test('visible assistant counts verification and never declares all-clear or fabricated delay', () => {
  const verification = {
    therapyId: 't1',
    drugName: 'Synthetic verification drug',
    patientName: 'Synthetic Ada',
  };
  const common = {
    therapiesOverdueCount: 0,
    therapiesOverdueSampleCount: 0,
    therapiesOverdue: [],
    therapiesToVerifyCount: 2,
    therapiesToVerify: [verification],
  };
  const facility = renderToStaticMarkup(
    React.createElement(FacilitySnapshotBody, {
      snapshot: {
        ...common,
        occupancy: null,
        consegneOverdueCount: 0,
        consegneOverdueSampleCount: 0,
        consegneOverdue: [],
        appointmentsTodayCount: 0,
      },
    }),
  );
  assert.match(facility, /Terapie da verificare/);
  assert.match(facility, /Synthetic verification drug/);
  assert.match(facility, /Riepilogo parziale/);
  assert.doesNotMatch(facility, /Tutto sotto controllo|08:00|in ritardo di/);
  const queue = renderToStaticMarkup(
    React.createElement(OperatorQueueBody, {
      queue: {
        ...common,
        windowMinutes: 60,
        therapiesDueSoonCount: 0,
        therapiesDueSoonSampleCount: 0,
        therapiesDueSoon: [],
        myLikelyConsegneCount: 0,
        myLikelyConsegneSampleCount: 0,
        myLikelyConsegne: [],
        otherOpenConsegneCount: 0,
        otherOpenConsegneSampleCount: 0,
        otherOpenConsegne: [],
      },
    }),
  );
  assert.match(queue, /kpi-alert-card__val">2/);
  assert.match(queue, /da verificare/);
  assert.doesNotMatch(queue, /Nessuna attività in scadenza|08:00|tra \d+ min/);
});
