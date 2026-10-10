import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTherapyLine } from '../../../../../../backend/src/intake/parse-discharge-therapy';
import {
  dischargeRowToTherapyForm,
  dischargeRowToTherapyInput,
  therapyFormToDischargeRow,
} from '../dischargeTherapy';

test('explicit PRN survives import, operator review, draft reload and confirmation without fixed doses', () => {
  const row = parseTherapyLine('Alfa CPR 10 MG (OS) 1 Cpr al bisogno massimo 2 volte al giorno');
  const form = dischargeRowToTherapyForm(row);
  assert.equal(form.tipo, 'al_bisogno');
  assert.deepEqual(form.schedules, []);
  assert.match(form.note, /1 Cpr/);
  assert.match(form.note, /massimo 2 volte/);
  const saved = JSON.parse(JSON.stringify(therapyFormToDischargeRow(form, row)));
  assert.equal(saved.tipo, 'al_bisogno');
  assert.equal(saved.originalText, row.originalText);
  assert.equal(saved.stato, 'da_verificare');
  assert.deepEqual(dischargeRowToTherapyForm(saved), form);
  const input = dischargeRowToTherapyInput(saved);
  assert.equal(input.tipo, 'al_bisogno');
  assert.deepEqual(input.schedules, []);
  assert.match(String(input.note), /massimo 2 volte/);
});
