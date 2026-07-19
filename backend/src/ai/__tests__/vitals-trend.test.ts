import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planQuery } from '../assistant/plan.js';

const ctx = { currentPatientId: 'P1' };

test('vitals_trend: andamento pressione ultimi 30 giorni → PA / days 30', () => {
  const p = planQuery("mostrami l'andamento della pressione negli ultimi 30 giorni", ctx);
  assert.equal(p.intent, 'vitals_trend');
  const call = p.tools[0];
  assert.equal(call.tool, 'get_patient_vital_signs');
  assert.equal(call.args.label, 'PA');
  assert.equal(call.args.days, 30);
});

test('vitals_trend: graficami la saturazione → SpO2 / default 7', () => {
  const p = planQuery('graficami la saturazione', ctx);
  assert.equal(p.intent, 'vitals_trend');
  assert.equal(p.tools[0].args.label, 'SpO2');
  assert.equal(p.tools[0].args.days, 7);
});

test('vitals_trend: due settimane → 15; temperatura → TC', () => {
  const p = planQuery('andamento temperatura nelle ultime due settimane', ctx);
  assert.equal(p.intent, 'vitals_trend');
  assert.equal(p.tools[0].args.label, 'TC');
  assert.equal(p.tools[0].args.days, 15);
});

test('trend senza un parametro riconosciuto NON è vitals_trend', () => {
  const p = planQuery('andamento generale del paziente', ctx);
  assert.notEqual(p.intent, 'vitals_trend');
});

test('la lettura recente resta vitals_recent (non trend)', () => {
  const p = planQuery('ultimi parametri', ctx);
  assert.equal(p.intent, 'vitals_recent');
});
