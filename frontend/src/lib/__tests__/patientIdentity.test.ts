import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parsePatientIdentity,
  parsePatientLocation,
  patientIdentifier,
  patientIdentityIncomplete,
  patientLocationLabel,
} from '../patientIdentity';
import {
  assignedLocation,
  identityPatient,
} from '../../components/operator/__tests__/operationalIdentity.fixtures';

test('fiscal identity is preferred, birth date is the fallback, and missing phone is irrelevant', () => {
  assert.equal(patientIdentifier(identityPatient), 'CF RSSMRA80A01H501U');
  assert.equal(patientIdentityIncomplete(identityPatient), false);
  const fallback = {
    ...identityPatient,
    codiceFiscale: null,
    dateOfBirth: '1975-06-15T00:00:00.000Z',
  };
  assert.equal(patientIdentifier(fallback), 'Nato/a il 15/06/1975 · CF da completare');
  assert.equal(patientIdentityIncomplete(fallback), true);
  for (const dateOfBirth of [null, '', '0000-00-00', '1980-02-30', '2999-01-01', 'invalid']) {
    const patient = { ...fallback, dateOfBirth };
    assert.equal(patientIdentifier(patient), 'Codice fiscale e data di nascita non disponibili');
    assert.equal(patientIdentityIncomplete(patient), true);
  }
});

test('assigned location preserves complete relational and partial legacy labels', () => {
  assert.deepEqual(parsePatientLocation(assignedLocation), assignedLocation);
  assert.equal(patientLocationLabel(assignedLocation), 'Camera 201 · Letto B');
  assert.equal(
    patientLocationLabel({ ...assignedLocation, source: 'cartella', bed: null }),
    'Camera 201 · Letto non indicato',
  );
  assert.equal(
    patientLocationLabel({ ...assignedLocation, source: 'cartella', room: null }),
    'Camera non indicata · Letto B',
  );
  assert.equal(
    patientLocationLabel({ ...assignedLocation, bed: null }),
    'Posto letto non disponibile',
  );
});

test('only explicit unassigned is unassigned; unavailable and loading suppress stale labels', () => {
  assert.equal(
    patientLocationLabel({ ...assignedLocation, status: 'unassigned' }),
    'Posto letto non assegnato',
  );
  assert.equal(
    patientLocationLabel({ ...assignedLocation, status: 'unavailable' }),
    'Posto letto non disponibile',
  );
  assert.equal(patientLocationLabel(assignedLocation, true), 'Caricamento posto letto…');
  for (const value of [
    null,
    undefined,
    {},
    { ...assignedLocation, status: 'loading' },
    { ...assignedLocation, asOf: '2026-02-30' },
    { ...assignedLocation, asOf: '2026-09-23T00:00:00Z' },
    { ...assignedLocation, source: 'unknown' },
    { ...assignedLocation, source: 'cartella', bed: {} },
  ]) {
    assert.equal(parsePatientLocation(value), null);
    assert.equal(patientLocationLabel(value), 'Posto letto non disponibile');
  }
});

test('handover identity requires the authorized complete wire shape', () => {
  assert.equal(parsePatientIdentity(identityPatient)?.id, identityPatient.id);
  for (const identity of [
    null,
    undefined,
    {},
    { ...identityPatient, id: '' },
    { ...identityPatient, firstName: {} },
    { ...identityPatient, location: null },
    { ...identityPatient, codiceFiscale: 123 },
  ]) {
    assert.equal(parsePatientIdentity(identity), null);
  }
});
