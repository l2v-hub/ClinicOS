import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTherapyLine } from '../../../../backend/src/intake/parse-discharge-therapy';
import { dischargeRowToTherapyForm, therapyFormToDischargeRow, dischargeRowToTherapyInput } from '../../../../frontend/src/components/shared/intake/dischargeTherapy';
test('QA numbered decoration never promotes decimal doses or consumes source text', () => {
 for (const text of ['(23) Delta CPR 10 MG (OS) 1 Cpr al bisogno', '4) Gamma CPR 10 MG (OS) 1 Cpr ore 08:00', '5. Epsilon CPR 10 MG (OS) 1 Cpr al bisogno']) {
  const row = parseTherapyLine(text); assert.equal(row.originalText, text); assert.ok(row.farmacoNome.length > 0);
  assert.equal(row.quantita, '1 Cpr');
 }
 const decimal = parseTherapyLine('0.5 Alfa CPR 10 MG (OS) 1 Cpr ore 08:00');
 assert.equal(decimal.originalText, '0.5 Alfa CPR 10 MG (OS) 1 Cpr ore 08:00');
 assert.equal(decimal.stato, 'da_verificare');
});
test('QA negative and mixed wording cannot silently produce an automatic PRN regimen', () => {
 for (const text of ['Alfa CPR 10 MG (OS) 1 Cpr non al bisogno', 'Alfa CPR 10 MG (OS) 1 Cpr ore 08:00 e al bisogno']) {
  const row = parseTherapyLine(text); assert.equal(row.tipo, undefined); assert.equal(row.stato, 'da_verificare');
  assert.notEqual(dischargeRowToTherapyForm(row).tipo, 'al_bisogno');
  assert.match(row.note, /al bisogno/);
 }
});
test('QA PRN fraction and frequency limits survive repeated draft edits without a schedule/default dose', () => {
 const text = 'Alfa CPR 10 MG (OS) 1/2 Cpr al bisogno massimo 2 volte al giorno';
 let row = parseTherapyLine(text); const form = dischargeRowToTherapyForm(row);
 assert.equal(form.tipo, 'al_bisogno'); assert.deepEqual(form.schedules, []);
 for (let i = 0; i < 3; i++) row = JSON.parse(JSON.stringify(therapyFormToDischargeRow(dischargeRowToTherapyForm(row), row)));
 assert.equal(row.originalText, text); assert.equal(row.stato, 'da_verificare');
 const input = dischargeRowToTherapyInput(row); assert.equal(input.tipo, 'al_bisogno');
 assert.deepEqual(input.schedules, []); assert.match(String(input.note), /1\/2 Cpr/); assert.match(String(input.note), /massimo 2 volte/);
 assert.equal(String(input.note).split('Quantità riportata').length, 2);
});
