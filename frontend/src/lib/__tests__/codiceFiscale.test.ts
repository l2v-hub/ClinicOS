import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeCF,
  deriveAutoCFUpdate,
  isValidCF,
  normalizeCF,
  type ComputeCFInput,
} from '../codiceFiscale';

const mario: ComputeCFInput = {
  nome: 'Mario',
  cognome: 'Rossi',
  sesso: 'M',
  dataNascita: '1980-01-01',
  comuneNascita: 'Roma',
  provinciaNascita: 'RM',
};

test('normalizes, computes and validates an Italian fiscal code', () => {
  assert.equal(normalizeCF(' rssmra80a01h501u '), 'RSSMRA80A01H501U');
  const result = computeCF(mario);
  assert.deepEqual(result, { ok: true, cf: 'RSSMRA80A01H501U' });
  assert.equal(isValidCF(result.ok ? result.cf : ''), true);
});

test('automatic fill applies only when every authoritative source is complete', () => {
  assert.deepEqual(deriveAutoCFUpdate(mario, ''), {
    kind: 'apply',
    cf: 'RSSMRA80A01H501U',
  });

  for (const incomplete of [
    { ...mario, nome: '' },
    { ...mario, cognome: '' },
    { ...mario, sesso: '' },
    { ...mario, dataNascita: '' },
    { ...mario, comuneNascita: '' },
  ]) {
    assert.deepEqual(deriveAutoCFUpdate(incomplete, ''), {
      kind: 'preserve',
      reason: 'incomplete',
    });
  }
});

test('manual and imported fiscal codes are never overwritten', () => {
  for (const origin of ['manual', 'import'] as const) {
    assert.deepEqual(deriveAutoCFUpdate(mario, 'VRDLGI80A01H501Q', origin), {
      kind: 'preserve',
      reason: origin,
    });
  }
});

test('an automatically generated code follows source changes and never stays stale', () => {
  const changed = deriveAutoCFUpdate({ ...mario, nome: 'Luigi' }, 'RSSMRA80A01H501U', 'auto');
  assert.equal(changed.kind, 'apply');
  if (changed.kind === 'apply') {
    assert.notEqual(changed.cf, 'RSSMRA80A01H501U');
    assert.equal(isValidCF(changed.cf), true);
  }
  assert.deepEqual(deriveAutoCFUpdate({ ...mario, sesso: '' }, 'RSSMRA80A01H501U', 'auto'), {
    kind: 'clear',
    reason: 'incomplete',
  });
  assert.deepEqual(
    deriveAutoCFUpdate(
      { ...mario, comuneNascita: 'Comune inesistente' },
      'RSSMRA80A01H501U',
      'auto',
    ),
    { kind: 'clear', reason: 'invalid' },
  );
});

test('an unchanged automatic value is a no-op and cannot trigger an autosave loop', () => {
  assert.deepEqual(deriveAutoCFUpdate(mario, 'RSSMRA80A01H501U', 'auto'), {
    kind: 'preserve',
    reason: 'unchanged',
  });
});
