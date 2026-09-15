import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePatientPhone } from '../patientPhone';

test('patient phone is mandatory, including whitespace and null values', () => {
  for (const raw of [undefined, null, '', '   ', '\t\n']) {
    assert.deepEqual(validatePatientPhone(raw), {
      ok: false,
      error: 'Il telefono è obbligatorio.',
    });
  }
});

test('patient phone preserves national/international formatting and leading zeroes', () => {
  for (const phone of [
    '0612345678',
    '+39 333 000 0000',
    '+44 (20) 1234-5678',
    '0033.1.23.45.67.89',
    '06/12345678',
    '12345',
    '123456789012345',
  ]) {
    assert.deepEqual(validatePatientPhone(`  ${phone}  `), { ok: true, phone });
  }
});

test('patient phone rejects malformed, oversized and non-string inputs', () => {
  for (const raw of [
    1234567,
    {},
    [],
    true,
    'non disponibile',
    '----',
    '1234',
    '1234567890123456',
    '12+34567',
    '++1234567',
    '12345\n67890',
    '<123456>',
    `12345${'.'.repeat(36)}`,
  ]) {
    assert.equal(validatePatientPhone(raw).ok, false);
  }
});

test('patient phone validation does not invent or infer a country prefix', () => {
  assert.deepEqual(validatePatientPhone(' 020 1234 5678 '), { ok: true, phone: '020 1234 5678' });
  assert.equal(validatePatientPhone('nessuno').ok, false);
});
