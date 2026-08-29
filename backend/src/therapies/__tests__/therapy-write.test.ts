import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTherapyAdministrationBody, TherapyWriteInputError } from '../therapy-write.js';

test('therapy write requires authoritative therapy identity and ignores display fields', () => {
  assert.deepEqual(
    parseTherapyAdministrationBody(
      {
        patientId: 'p_1',
        therapyId: 't-1',
        date: '2030-03-01',
        fascia: 'mattina',
        farmacoNome: 'client value is not authoritative',
        operatoreId: 'spoofed',
      },
      false,
    ),
    {
      patientId: 'p_1',
      therapyId: 't-1',
      date: '2030-03-01',
      fascia: 'mattina',
      motivo: undefined,
      note: undefined,
    },
  );
});

test('therapy write rejects missing therapyId, impossible dates, invalid fascia and long text', () => {
  const base = { patientId: 'p1', therapyId: 't1', date: '2030-03-01', fascia: 'sera' };
  assert.throws(
    () => parseTherapyAdministrationBody({ ...base, therapyId: undefined }, false),
    TherapyWriteInputError,
  );
  assert.throws(
    () => parseTherapyAdministrationBody({ ...base, date: '2030-02-30' }, false),
    TherapyWriteInputError,
  );
  assert.throws(
    () => parseTherapyAdministrationBody({ ...base, fascia: 'alba' }, false),
    TherapyWriteInputError,
  );
  assert.throws(
    () => parseTherapyAdministrationBody({ ...base, motivo: '' }, true),
    TherapyWriteInputError,
  );
  assert.throws(
    () => parseTherapyAdministrationBody({ ...base, note: 'x'.repeat(2001) }, false),
    TherapyWriteInputError,
  );
});
