import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDischargeTherapy, parseTherapyLine } from '../parse-discharge-therapy.js';

test('numbered prescriptions retain drug names and exact source, without taking the number as dose', () => {
  for (const prefix of ['1. ', '2) ', '(3) ']) {
    const original = `${prefix}Alfa CPR 10 MG (OS) 1 Cpr ore 08:00`;
    const row = parseTherapyLine(original);
    assert.equal(row.farmacoNome, 'ALFA');
    assert.equal(row.originalText, original);
    assert.equal(row.quantita, '1 Cpr');
    assert.deepEqual(row.orari, ['08:00']);
    assert.equal(row.stato, 'ok');
  }
  assert.equal(parseTherapyLine('20 Alfa da verificare').originalText, '20 Alfa da verificare');
});

test('explicit PRN remains a regimen with the original limits, not fixed clock doses', () => {
  const text = 'Alfa CPR 10 MG (OS) 1 Cpr al bisogno massimo 2 volte al giorno';
  const row = parseDischargeTherapy(text)[0];
  assert.equal(row.tipo, 'al_bisogno');
  assert.deepEqual(row.orari, []);
  assert.equal(row.quantita, '1 Cpr');
  assert.equal(row.originalText, text);
  assert.match(row.note, /massimo 2 volte/);
  assert.equal(row.stato, 'da_verificare');
});

test('negative or unspecified PRN never becomes an automatic PRN prescription', () => {
  for (const text of ['Alfa CPR 10 MG (OS) 1 Cpr non al bisogno', 'Alfa CPR 10 MG (OS) 1 Cpr']) {
    const row = parseTherapyLine(text);
    assert.equal(row.tipo, undefined);
    if (text.includes('non')) assert.equal(row.stato, 'da_verificare');
  }
});

test('mixed timed and PRN instructions retain timing and require review rather than losing a regimen', () => {
  const row = parseTherapyLine('Alfa CPR 10 MG (OS) 1 Cpr ore 08:00 e al bisogno');
  assert.equal(row.tipo, undefined);
  assert.deepEqual(row.orari, ['08:00']);
  assert.equal(row.stato, 'da_verificare');
  assert.match(row.note, /al bisogno/);
});
