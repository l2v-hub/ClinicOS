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

function withOutcome(status: 'administered' | 'not_administered', id = 't1', total = 1) {
  const value = group(id, total);
  value.patients[0].items[0].recordedOutcome = {
    administrationId: 'record-' + id,
    therapyId: id,
    patientId: 'p1',
    date: value.date,
    status,
    recordedAt: '2030-01-01T08:45:00.000Z',
    recordedBy: 'Verified synthetic operator',
    notAdministeredReason: status === 'not_administered' ? 'rifiutata_paziente' : null,
  };
  value.summary = {
    total,
    verification: total,
    administered: status === 'administered' ? 1 : 0,
    notAdministered: status === 'not_administered' ? 1 : 0,
    unrecorded: total - 1,
  };
  return value;
}

test('both actual recorded outcomes survive reload read-only without an invented scheduled dose', () => {
  for (const status of ['administered', 'not_administered'] as const) {
    const source = withOutcome(status);
    const loaded = parseTherapySlots(JSON.parse(JSON.stringify([source])));
    const html = renderToStaticMarkup(
      React.createElement(TherapyVerificationPanel, { groups: loaded }),
    );
    assert.match(
      html,
      status === 'administered' ? /Già somministrata/ : /Già registrata come non somministrata/,
    );
    assert.match(html, /Verified synthetic operator/);
    assert.match(html, /Registrata il/);
    assert.match(html, /Esito registrato in sola lettura/);
    assert.doesNotMatch(html, /<button|Somministra ora|08:00|compressa/);
    assert.deepEqual(giroTimes(loaded), []);
    const summary = summarizeDashboardTherapies(loaded, [], new Date('2030-01-01T10:00:00Z'));
    assert.equal(summary.totale, 1);
    assert.equal(summary.fatte, status === 'administered' ? 1 : 0);
    assert.equal(summary.nonErogate, status === 'not_administered' ? 1 : 0);
    assert.equal(summary.daFare, 0);
    assert.deepEqual(summary.scadute, []);
    const filtered = renderToStaticMarkup(
      React.createElement(TherapyVerificationPanel, {
        groups: loaded,
        patientId: 'another-patient',
      }),
    );
    assert.equal(filtered, '');
  }
  const legacy = parseTherapySlots([group('legacy', 1)])[0];
  assert.equal(legacy.kind, 'verification');
  if (legacy.kind !== 'verification') throw new Error('verification required');
  assert.equal(legacy.patients[0].items[0].recordedOutcome, null);
  assert.doesNotMatch(
    renderToStaticMarkup(React.createElement(TherapyVerificationPanel, { groups: [legacy] })),
    /Già somministrata|Già registrata come/,
  );
});

test('recorded metadata rejects cross-patient, cross-therapy, wrong-day, malformed and contradictory facts', () => {
  for (const patch of [
    { patientId: 'p2' },
    { therapyId: 't2' },
    { date: '2030-01-02' },
    { status: 'pending' },
    { status: true },
    { administrationId: '' },
    { recordedAt: '08:45' },
    { recordedAt: '2030-02-30T08:45:00.000Z' },
    { recordedAt: undefined },
    { recordedBy: {} },
    { notAdministeredReason: 'refused-but-given' },
    { scheduledTime: '08:00' },
  ]) {
    const value = withOutcome('administered');
    Object.assign(value.patients[0].items[0].recordedOutcome!, patch);
    assert.throws(() => parseTherapySlots([value]));
  }
  for (const recordedOutcome of [false, true, [], 'administered', {}]) {
    const value = withOutcome('administered');
    Object.assign(value.patients[0].items[0], { recordedOutcome });
    assert.throws(() => parseTherapySlots([value]));
  }
  const inconsistent = withOutcome('administered');
  inconsistent.summary = {
    total: 1,
    verification: 1,
    administered: 0,
    notAdministered: 0,
    unrecorded: 1,
  };
  assert.throws(() => parseTherapySlots([inconsistent]));
  const crossPatient = withOutcome('administered');
  crossPatient.patients.push({ ...crossPatient.patients[0], patientId: 'p2' });
  assert.throws(() => parseTherapySlots([crossPatient]));
});

test('continuation merges recorded outcomes once and preserves first-page exact totals', () => {
  const first = withOutcome('administered', 't1', 2);
  first.summary = { total: 2, verification: 2, administered: 1, notAdministered: 1, unrecorded: 0 };
  const second = withOutcome('not_administered', 't2');
  const merged = mergeTherapySlotPages(parseTherapySlots([first]), parseTherapySlots([second]));
  const replay = mergeTherapySlotPages(merged, parseTherapySlots([second]));
  assert.equal(replay[0].summary.total, 2);
  if (replay[0].kind !== 'verification') throw new Error('verification required');
  assert.equal(replay[0].patients[0].items.length, 2);
  const summary = summarizeDashboardTherapies(replay, [], new Date('2030-01-01T10:00:00Z'));
  assert.equal(summary.fatte, 1);
  assert.equal(summary.nonErogate, 1);
  assert.equal(summary.daFare, 0);
});

test('pagination rejects a therapy moved to another patient and keeps actual missing record fields unknown', () => {
  const first = withOutcome('not_administered');
  const moved = withOutcome('not_administered');
  moved.patients[0].patientId = 'p2';
  moved.patients[0].items[0].recordedOutcome!.patientId = 'p2';
  assert.throws(() =>
    mergeTherapySlotPages(parseTherapySlots([first]), parseTherapySlots([moved])),
  );
  first.patients[0].items[0].recordedOutcome!.recordedAt = null;
  first.patients[0].items[0].recordedOutcome!.recordedBy = null;
  const loaded = parseTherapySlots([first]);
  const html = renderToStaticMarkup(
    React.createElement(TherapyVerificationPanel, { groups: loaded }),
  );
  assert.match(html, /Già registrata come non somministrata/);
  assert.doesNotMatch(html, /Registrata il|Operatore:|08:00|<button/);
});
