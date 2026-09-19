import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ClinicalSummaryEntry, Paziente } from '../../types';
import { sortPatientRoster, togglePatientSort, type PatientRosterSort } from '../patientRosterSort';

const patient = (
  id: string,
  lastName: string,
  firstName = 'Anna',
  codiceFiscale: string | null = id,
): Paziente => ({
  id,
  lastName,
  firstName,
  codiceFiscale,
  medicalRecordNumber: '',
  dateOfBirth: '1980-01-01',
  sex: 'F',
  phone: null,
  email: null,
});
const summary = (
  patientId: string,
  overrides: Partial<ClinicalSummaryEntry> = {},
): ClinicalSummaryEntry => ({
  patientId,
  statoRicovero: 'ricoverato',
  hasCriticalVitals: false,
  hasHighRisk: false,
  allergieCount: 0,
  hasSevereAllergy: false,
  terapieTotali: 0,
  terapieCompletate: 0,
  consegneAperte: 0,
  ...overrides,
});
const context = (entries: ClinicalSummaryEntry[] = []) => ({
  summaryMap: new Map(entries.map((entry) => [entry.patientId, entry])),
  consegneAperteMap: new Map<string, number>(),
  anomalies: new Map<string, { totale: number }>(),
});
const ids = (rows: Paziente[]) => rows.map((row) => row.id);

test('all fields start ascending and toggle both ways', () => {
  for (const field of ['patient', 'fiscalCode', 'admission', 'signals'] as const) {
    const current: PatientRosterSort = { field, direction: 'asc' };
    assert.deepEqual(togglePatientSort(current, field), { field, direction: 'desc' });
    assert.deepEqual(togglePatientSort({ field, direction: 'desc' }, field), current);
    assert.equal(
      togglePatientSort(
        { field: field === 'patient' ? 'signals' : 'patient', direction: 'desc' },
        field,
      ).direction,
      'asc',
    );
  }
});

test('names use Italian surname and given name order; empty names remain last both ways', () => {
  const rows = [
    patient('z', 'Zeta'),
    patient('b', ' BÈTA ', 'Zoe'),
    patient('a', 'beta', 'Anna'),
    patient('n', ' ', ''),
    patient('f', '', 'Alba'),
  ];
  assert.deepEqual(
    ids(sortPatientRoster(rows, { field: 'patient', direction: 'asc' }, context())),
    ['f', 'a', 'b', 'z', 'n'],
  );
  assert.deepEqual(
    ids(sortPatientRoster(rows, { field: 'patient', direction: 'desc' }, context())),
    ['z', 'b', 'a', 'f', 'n'],
  );
});

test('tax codes are case-insensitive and missing values stay last, including whitespace', () => {
  const rows = [
    patient('a', 'Alfa', 'Anna', ' ZZZ '),
    patient('b', 'Beta', 'Anna', 'aaa'),
    patient('c', 'C', 'Anna', null),
    patient('d', 'D', 'Anna', ' '),
  ];
  assert.deepEqual(
    ids(sortPatientRoster(rows, { field: 'fiscalCode', direction: 'asc' }, context())),
    ['b', 'a', 'c', 'd'],
  );
  assert.deepEqual(
    ids(sortPatientRoster(rows, { field: 'fiscalCode', direction: 'desc' }, context())),
    ['a', 'b', 'c', 'd'],
  );
});

test('admissions sort by displayed labels with unavailable summaries/status last', () => {
  const rows = ['r', 'd', 'h', 'a', 'm', 'n'].map((id) => patient(id, id));
  const data = context([
    summary('r'),
    summary('d', { statoRicovero: 'dimesso' }),
    summary('h', { statoRicovero: 'day_hospital' }),
    summary('a', { statoRicovero: 'ambulatoriale' }),
    summary('n', { statoRicovero: null }),
  ]);
  assert.deepEqual(ids(sortPatientRoster(rows, { field: 'admission', direction: 'asc' }, data)), [
    'a',
    'h',
    'd',
    'r',
    'm',
    'n',
  ]);
  assert.deepEqual(ids(sortPatientRoster(rows, { field: 'admission', direction: 'desc' }, data)), [
    'r',
    'd',
    'h',
    'a',
    'm',
    'n',
  ]);
});

test('signals are numeric: critical counts once, all visible sources contribute, missing is not zero', () => {
  const rows = ['zero', 'critical', 'two', 'ten', 'mixed', 'missing'].map((id) => patient(id, id));
  const data = context([
    summary('zero', { hasSevereAllergy: true }), // No separate badge for this flag.
    summary('critical', { hasCriticalVitals: true, hasHighRisk: true }),
    summary('two', { allergieCount: 2 }),
    summary('ten', { allergieCount: 10 }),
    summary('mixed', { allergieCount: 1 }),
  ]);
  data.anomalies.set('mixed', { totale: 1 });
  data.consegneAperteMap.set('mixed', 1);
  assert.deepEqual(ids(sortPatientRoster(rows, { field: 'signals', direction: 'asc' }, data)), [
    'zero',
    'critical',
    'two',
    'mixed',
    'ten',
    'missing',
  ]);
  assert.deepEqual(ids(sortPatientRoster(rows, { field: 'signals', direction: 'desc' }, data)), [
    'ten',
    'mixed',
    'two',
    'critical',
    'zero',
    'missing',
  ]);
});

test('equal field values use deterministic name/id ties independent of incoming page order', () => {
  const rows = [
    patient('b', 'Beta', 'Anna', 'same'),
    patient('a2', 'Alfa', 'Anna', 'same'),
    patient('a1', 'Alfa', 'Anna', 'SAME'),
  ];
  for (const direction of ['asc', 'desc'] as const) {
    assert.deepEqual(ids(sortPatientRoster(rows, { field: 'fiscalCode', direction }, context())), [
      'a1',
      'a2',
      'b',
    ]);
    assert.deepEqual(
      ids(sortPatientRoster([...rows].reverse(), { field: 'fiscalCode', direction }, context())),
      ['a1', 'a2', 'b'],
    );
  }
});

test('sorting does not mutate inputs and reorders appended rows and asynchronously resolved signals', () => {
  const rows = Object.freeze([
    Object.freeze(patient('a', 'Alfa')),
    Object.freeze(patient('b', 'Beta')),
  ]);
  const data = context([
    summary('a'),
    summary('b', { allergieCount: 2 }),
    summary('c', { allergieCount: 4 }),
  ]);
  const sort = { field: 'signals', direction: 'desc' } as const;
  assert.deepEqual(ids(sortPatientRoster(rows, sort, data)), ['b', 'a']);
  data.anomalies.set('a', { totale: 3 });
  assert.deepEqual(ids(sortPatientRoster(rows, sort, data)), ['a', 'b']);
  assert.deepEqual(ids(sortPatientRoster([...rows, patient('c', 'Gamma')], sort, data)), [
    'c',
    'a',
    'b',
  ]);
  assert.deepEqual(ids([...rows]), ['a', 'b']);
});
