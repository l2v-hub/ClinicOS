import { intakeCompletionPending } from '../patientListView';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { intakeDemographicErrors } from '../intakeDemographics';
import { fiscalCodeSex } from '../codiceFiscale';
import { intakeProgress } from '../../components/shared/intake/intakeProgress';

const identity = { firstName: 'Mario', lastName: 'Rossi', codiceFiscale: 'RSSMRA80A01H501U' };
test('476 imported identity may continue without a birthdate; manual intake still requires it', () => {
  assert.deepEqual(intakeDemographicErrors(identity, true, { allowMissingBirthDate: true }), {});
  assert.equal(intakeDemographicErrors(identity, true).dateOfBirth, 'Data di nascita obbligatoria');
  assert.deepEqual(
    intakeProgress({ anagrafica: identity }, { allowMissingBirthDate: true }).missing,
    [],
  );
});
test('476 progressive import retains explicit invalid field errors and therapy review barriers', () => {
  for (const patch of [
    { codiceFiscale: 'invalid' },
    { dateOfBirth: '2999-01-01' },
    { dateOfBirth: '2026-02-30' },
    { phone: 'not a phone' },
  ]) {
    assert.ok(
      Object.keys(
        intakeDemographicErrors({ ...identity, ...patch }, true, { allowMissingBirthDate: true }),
      ).length > 0,
    );
  }
  assert.ok(
    intakeProgress(
      {
        anagrafica: identity,
        terapiaImport: [
          { originalText: 'Ambiguous synthetic prescription', farmacoNome: 'Unknown' },
        ],
      },
      { allowMissingBirthDate: true },
    ).missing.some((step) => step.section === 'terapia'),
  );
});
test('473 fiscal-code sex inference requires valid code and preserves the numeric day distinction', () => {
  assert.equal(fiscalCodeSex('RSSMRA80A01H501U'), 'M');
  assert.equal(fiscalCodeSex('RSSMRA80A01H501A'), null);
  assert.equal(fiscalCodeSex(''), null);
});

test('472/476 an incomplete registered identity stays actionable; missing optional phone does not make a draft', () => {
  assert.equal(intakeCompletionPending(identity), true);
  assert.equal(intakeCompletionPending({ ...identity, dateOfBirth: '1980-01-01' }), false);
  assert.equal(intakeCompletionPending({ ...identity, dateOfBirth: '2999-01-01' }), true);
});
