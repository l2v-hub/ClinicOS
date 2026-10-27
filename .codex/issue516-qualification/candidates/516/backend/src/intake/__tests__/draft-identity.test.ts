import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyReviewedIntakeIdentity,
  corroboratingIntakeIdentity,
  intakeIdentity,
  reviewedIntakeIdentity,
} from '../draft-identity.js';
import { controlChar } from '../../lib/codice-fiscale.js';

const identity = {
  firstName: 'Mario',
  lastName: 'Rossi',
  dateOfBirth: '1980-01-01',
  codiceFiscale: 'RSSMRA80A01H501U',
};
const data = (override: Partial<typeof identity> = {}) => ({
  anagrafica: { ...identity, ...override },
});

test('reviewed identity is an explicit bounded whitelist with a legacy absent protocol', () => {
  assert.equal(reviewedIntakeIdentity(undefined), undefined);
  assert.deepEqual(reviewedIntakeIdentity({ ...identity, firstName: '  Mario  ' }), identity);
  for (const value of [
    null,
    [],
    3,
    {},
    { firstName: 'Mario' },
    { ...identity, role: 'admin' },
    { ...identity, firstName: 3 },
    { ...identity, codiceFiscale: 'x'.repeat(65) },
    Object.assign(Object.create(identity), { a: '', b: '', c: '', d: '' }),
  ])
    assert.throws(() => reviewedIntakeIdentity(value), { code: 'invalid_reviewed_identity' });
});

test('reviewed blanks erase wrong OCR atomically while other clinical/source data stay intact', () => {
  const original = {
    ...data(),
    clinical: { operatorChoice: 'synthetic-retained' },
    _importSource: { manifestRevision: 3, resultHash: 'synthetic-source' },
  };
  const saved = structuredClone(original);
  const reviewed = reviewedIntakeIdentity({
    firstName: '',
    lastName: 'Corretto',
    dateOfBirth: '',
    codiceFiscale: '',
  });
  const next = applyReviewedIntakeIdentity(original, reviewed);
  assert.deepEqual(next.anagrafica, {
    firstName: '',
    lastName: 'Corretto',
    dateOfBirth: '',
    codiceFiscale: '',
  });
  assert.deepEqual(next.clinical, original.clinical);
  assert.deepEqual(next._importSource, original._importSource);
  assert.deepEqual(original, saved);
  assert.equal(applyReviewedIntakeIdentity(original, undefined), original);
});

test('only a complete valid CF with explicit corroborating names and civil birth date matches', () => {
  assert.equal(intakeIdentity(data()).fiscalCode, identity.codiceFiscale);
  assert.equal(
    corroboratingIntakeIdentity(
      data(),
      data({
        firstName: ' MARIO ',
        lastName: 'ROSSI',
        codiceFiscale: identity.codiceFiscale.toLowerCase(),
        dateOfBirth: '1980-01-01T00:00:00.000Z',
      }),
    ),
    true,
  );
  for (const change of [
    { firstName: '' },
    { lastName: 'Altro' },
    { dateOfBirth: '' },
    { dateOfBirth: '1980-01-02' },
    { dateOfBirth: '1980-02-30' },
    { dateOfBirth: '3000-01-01' },
    { codiceFiscale: '' },
    { codiceFiscale: 'RSSMRA80A01H501A' },
  ])
    assert.equal(corroboratingIntakeIdentity(data(), data(change)), false);
  const alternative = 'RSSMRA80A01H50M';
  const distinctCode = alternative + controlChar(alternative);
  assert.equal(intakeIdentity(data({ codiceFiscale: distinctCode })).fiscalCode, distinctCode);
  assert.equal(
    corroboratingIntakeIdentity(data(), data({ codiceFiscale: distinctCode })),
    false,
    'Different assigned full CFs are not fuzzy aliases, even for equal names and DOB',
  );
});
