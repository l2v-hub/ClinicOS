import assert from 'node:assert/strict';
import test from 'node:test';
import {
  birthDateValue,
  birthSummary,
  formatBirthDate,
  incompleteDemographicFields,
  patientAge,
} from '../patientDemographics';
import { intakeDemographicErrors, reviewedIdentityPatch } from '../intakeDemographics';
import { parsePatientIntakeReview } from '../patientIntakeReview';

const minimal = { firstName: 'Ada', lastName: 'Rossi' };
test('intake accepts unavailable identity details and records exactly what remains incomplete', () => {
  for (const empty of [undefined, null, '', '  ']) {
    const patient = { ...minimal, codiceFiscale: empty, dateOfBirth: empty, phone: empty };
    assert.deepEqual(intakeDemographicErrors(patient), {});
    assert.deepEqual(incompleteDemographicFields(patient), [
      'dateOfBirth',
      'codiceFiscale',
      'phone',
    ]);
  }
  assert.ok(intakeDemographicErrors({ firstName: ' ' }).firstName);
  assert.ok(intakeDemographicErrors({ firstName: 'Ada' }).lastName);
});

test('provided fields remain validated; complete data clears the incomplete status', () => {
  const invalid = intakeDemographicErrors({
    ...minimal,
    dateOfBirth: '2023-02-29',
    phone: 'nessuno',
    codiceFiscale: 'inventato',
  });
  assert.deepEqual(Object.keys(invalid), ['dateOfBirth', 'codiceFiscale', 'phone']);
  assert.deepEqual(incompleteDemographicFields({ ...minimal, dateOfBirth: '1980-01-01', codiceFiscale: 'inventato', phone: 'nessuno' }), ['codiceFiscale', 'phone']);
  const complete = {
    ...minimal,
    dateOfBirth: '1980-01-01',
    phone: '+39 333 000 0000',
    codiceFiscale: 'RSSMRA80A01H501U',
  };
  assert.deepEqual(intakeDemographicErrors(complete), {});
  assert.deepEqual(incompleteDemographicFields(complete), []);
});

test('unknown, malformed and future DOB never produces 1970, Invalid Date, NaN or an invented age', () => {
  for (const value of [
    null,
    undefined,
    '',
    ' ',
    'non nota',
    '2023-02-29',
    '1980-13-01',
    '9999-01-01',
    {},
    0,
  ]) {
    assert.equal(birthDateValue(value), null);
    assert.equal(patientAge(value), null);
    assert.equal(formatBirthDate(value), 'Non disponibile');
    assert.equal(birthSummary(value), 'Data di nascita non disponibile');
  }
  assert.equal(birthDateValue('1980-01-01T00:00:00.000Z'), '1980-01-01');
  assert.equal(formatBirthDate('1980-01-01T00:00:00.000Z'), '01/01/1980');
  assert.equal(patientAge('1980-09-24', new Date(2026, 8, 23)), 45);
  assert.equal(patientAge('1980-09-24', new Date(2026, 8, 24)), 46);
  assert.equal(birthDateValue('2024-02-29'), '2024-02-29');
});

test('reviewed blanks replace incorrect OCR identity instead of restoring extracted values', () => {
  const seeded = {
    dateOfBirth: '1970-01-01',
    codiceFiscale: 'WRONG',
    phone: '123456',
    firstName: 'Ada',
  };
  const corrected = {
    ...seeded,
    ...reviewedIdentityPatch({ dateOfBirth: '', codiceFiscale: '', phone: '' }),
  };
  assert.equal(corrected.dateOfBirth, '');
  assert.equal(corrected.codiceFiscale, '');
  assert.equal(corrected.phone, '');
  assert.equal(corrected.firstName, 'Ada');
});

test('retained intake review rejects malformed rows instead of hiding missing clinical data', () => {
  assert.deepEqual(
    parsePatientIntakeReview({ draftId: null, deferredTherapies: [], sourceDocumentIds: [] })
      .deferredTherapies,
    [],
  );
  assert.throws(() =>
    parsePatientIntakeReview({
      draftId: 'draft',
      deferredTherapies: [{ name: 'Unknown' }],
      sourceDocumentIds: [],
    }),
  );
});
