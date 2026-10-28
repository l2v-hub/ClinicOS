import assert from 'node:assert/strict';
import test from 'node:test';
import { filterIncompletePatients } from './patientIncompleteSummary';

test('summarizes 30 incomplete patients as a bounded filter list', () => {
  const patients = Array.from({ length: 30 }, (_, index) => ({
    id: `patient-${index}`,
    firstName: `Nome${index}`,
    lastName: `Cognome${index}`,
    dateOfBirth: '1980-01-01',
    codiceFiscale: '',
    phone: '3331234567',
  }));

  const pending = filterIncompletePatients(patients);

  assert.equal(pending.length, 30);
  assert.deepEqual(
    pending.map((patient) => patient.id),
    patients.map((patient) => patient.id),
  );
});

test('returns no incomplete patients when identities are complete', () => {
  const patients = [
    {
      id: 'patient-complete',
      firstName: 'Ada',
      lastName: 'Rossi',
      dateOfBirth: '1980-01-01',
      codiceFiscale: 'RSSMRA80A01H501U',
      phone: '3331234567',
    },
  ];

  assert.deepEqual(filterIncompletePatients(patients), []);
});
