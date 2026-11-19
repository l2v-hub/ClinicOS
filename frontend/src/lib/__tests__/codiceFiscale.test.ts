import assert from 'node:assert/strict';
import { test } from 'node:test';
import CodiceFiscale from 'codice-fiscale-js';
import { computeCF, deriveAutoCFUpdate, type ComputeCFInput } from '../codiceFiscale';
import { isValidCF, normalizeCF } from '../cfCheck';

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

test('the dependency-free check agrees with the library on valid, mistyped and malformed codes', () => {
  // Generatore deterministico: stessi casi a ogni esecuzione.
  let seed = 20261118;
  const next = (n: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  const pick = (alphabet: string) => alphabet[next(alphabet.length)];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIGITS = '0123456789LMNPQRSTUV'; // cifre e lettere di omocodia
  const body = () =>
    Array.from({ length: 6 }, () => pick(LETTERS)).join('') +
    pick(DIGITS) +
    pick(DIGITS) +
    pick('ABCDEHLMPRST') +
    pick(DIGITS) +
    pick(DIGITS) +
    pick(LETTERS) +
    pick(DIGITS) +
    pick(DIGITS) +
    pick(DIGITS);
  let valid = 0;
  for (let i = 0; i < 20000; i++) {
    const base = body();
    const cases = [
      base + CodiceFiscale.getCheckCode(base), // corretto
      base + pick(LETTERS), // carattere di controllo a caso
      (base + pick(LETTERS)).toLowerCase(), // minuscolo: normalizzato
      ` ${base}${CodiceFiscale.getCheckCode(base)} `, // spazi attorno
      base.slice(1) + pick(LETTERS), // troppo corto
      base.slice(0, 8) + pick('FGIJKNOQUVWXYZ0') + base.slice(9) + pick(LETTERS), // mese non valido
    ];
    for (const raw of cases) {
      const expected = normalizeCF(raw).length === 16 && CodiceFiscale.check(normalizeCF(raw));
      assert.equal(isValidCF(raw), expected, JSON.stringify(raw));
      if (expected) valid++;
    }
  }
  assert.ok(valid > 40000, `casi validi coperti: ${valid}`);
  for (const raw of [
    '',
    'RSSMRA80A01H501',
    'RSSMRA80A01H501UU',
    'RSSMRA80A01H501Ù',
    '1234567890123456',
  ])
    assert.equal(isValidCF(raw), false, raw);
});
