import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planQuery } from '../assistant/plan.js';
import { ownerAgent, agentAllowsIntent, redirectMessage } from '../assistant/agents.js';

test('staff_list: «elenca il personale» → query_staff_list', () => {
  const p = planQuery('elenca il personale della struttura');
  assert.equal(p.intent, 'staff_list');
  assert.equal(p.tools[0].tool, 'query_staff_list');
  assert.equal(p.requiresCrossPatientAccess, false);
});

test('staff_list: «chi sono gli infermieri?» → staff_list', () => {
  const p = planQuery('chi sono gli infermieri?');
  assert.equal(p.intent, 'staff_list');
});

test('staff_list: «mostra gli operatori con qualifica» anche con paziente aperto', () => {
  const p = planQuery('mostra gli operatori con la loro qualifica', { currentPatientId: 'P1' });
  assert.equal(p.intent, 'staff_list');
  assert.equal(p.tools[0].tool, 'query_staff_list');
});

test('una domanda sui pazienti NON è staff_list', () => {
  const p = planQuery('quali pazienti sono allergici alla penicillina?');
  assert.notEqual(p.intent, 'staff_list');
});

test('staff_list è di dominio facility; il clinico viene rediretto', () => {
  assert.equal(ownerAgent('staff_list'), 'facility');
  assert.equal(agentAllowsIntent('facility', 'staff_list'), true);
  assert.equal(agentAllowsIntent('clinical', 'staff_list'), false);
  assert.ok(redirectMessage('clinical', 'staff_list').includes('Gestione struttura'));
});

test('l’occupazione camere resta rooms_occupancy (non staff_list)', () => {
  const p = planQuery('quanti letti sono occupati?');
  assert.equal(p.intent, 'rooms_occupancy');
});
