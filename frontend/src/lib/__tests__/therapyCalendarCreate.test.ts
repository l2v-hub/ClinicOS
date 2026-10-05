import assert from 'node:assert/strict';
import { test } from 'node:test';
import { therapyFormAtCalendarSlot } from '../therapyCalendarCreate';
import type { TherapyFormValue } from '../../components/operator/cartella/TherapyFormFields';

const defaults: TherapyFormValue = {
  farmacoNome: '', pharmaceuticalForm: '', commercialStrengthValue: '', commercialStrengthUnit: 'mg',
  allowedFractions: [], viaSomministrazione: 'orale', tipo: 'periodica', stato: 'attiva',
  dataInizio: '2026-10-05', dataFine: '', giorniSettimana: [], prescrittore: '', note: '',
  dataSomministrazione: '2026-10-05', orarioSomministrazione: '',
  schedules: [{ time: '08:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' }],
};

test('calendar creation preserves selected local date and minute for recurring and one-time fields without changing defaults', () => {
  const form = therapyFormAtCalendarSlot(defaults, '2026-10-28', '09:30');
  assert.ok(form);
  assert.equal(form.dataInizio, '2026-10-28');
  assert.equal(form.dataSomministrazione, '2026-10-28');
  assert.equal(form.schedules[0].time, '09:30');
  assert.equal(form.orarioSomministrazione, '09:30');
  assert.equal(form.farmacoNome, '');
  assert.equal(defaults.schedules[0].time, '08:00');
  assert.equal(defaults.dataInizio, '2026-10-05');
});

test('invalid calendar date or HH:MM cannot initialize a prescription', () => {
  for (const [date, time] of [['2026-02-30', '09:00'], ['2026-10-05', '25:00'], ['2026-10-05', '09:60'], ['2026-10-05', '9:00']]) {
    assert.equal(therapyFormAtCalendarSlot(defaults, date, time), null);
  }
});
