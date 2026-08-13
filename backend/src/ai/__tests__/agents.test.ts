import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agentAllowsIntent,
  resolveAgent,
  ownerAgent,
  isAgentId,
  AGENT_PROFILES,
} from '../assistant/agents.js';

test('isAgentId accepts only the two known agents', () => {
  assert.equal(isAgentId('facility'), true);
  assert.equal(isAgentId('clinical'), true);
  assert.equal(isAgentId('admin'), false);
  assert.equal(isAgentId(''), false);
  assert.equal(isAgentId(undefined), false);
  assert.equal(isAgentId(null), false);
});

test('facility agent serves its own domain + shared intents, not clinical ones', () => {
  // own domain
  assert.equal(agentAllowsIntent('facility', 'rooms_occupancy'), true);
  assert.equal(agentAllowsIntent('facility', 'data_query'), true);
  // shared / neutral
  assert.equal(agentAllowsIntent('facility', 'patient_search'), true);
  assert.equal(agentAllowsIntent('facility', 'appointments'), true);
  assert.equal(agentAllowsIntent('facility', 'unknown'), true);
  assert.equal(agentAllowsIntent('facility', 'refuse_clinical'), true);
  // clinical domain → refused
  assert.equal(agentAllowsIntent('facility', 'allergies'), false);
  assert.equal(agentAllowsIntent('facility', 'therapies'), false);
  assert.equal(agentAllowsIntent('facility', 'vitals_recent'), false);
  assert.equal(agentAllowsIntent('facility', 'vitals_range'), false);
  assert.equal(agentAllowsIntent('facility', 'timeline'), false);
  assert.equal(agentAllowsIntent('facility', 'narrative_search'), false);
  assert.equal(agentAllowsIntent('facility', 'document_search'), false);
  assert.equal(agentAllowsIntent('facility', 'correlate'), false);
  assert.equal(agentAllowsIntent('facility', 'vitals_trend'), false);
});

test('clinical agent serves its own domain + shared intents, not facility ones', () => {
  assert.equal(agentAllowsIntent('clinical', 'allergies'), true);
  assert.equal(agentAllowsIntent('clinical', 'therapies'), true);
  assert.equal(agentAllowsIntent('clinical', 'vitals_recent'), true);
  assert.equal(agentAllowsIntent('clinical', 'vitals_trend'), true);
  assert.equal(agentAllowsIntent('clinical', 'timeline'), true);
  assert.equal(agentAllowsIntent('clinical', 'correlate'), true);
  // shared
  assert.equal(agentAllowsIntent('clinical', 'patient_search'), true);
  assert.equal(agentAllowsIntent('clinical', 'appointments'), true);
  // facility domain → refused
  assert.equal(agentAllowsIntent('clinical', 'rooms_occupancy'), false);
  assert.equal(agentAllowsIntent('clinical', 'data_query'), false);
});

test('ownerAgent maps domain intents; shared intents have no owner', () => {
  assert.equal(ownerAgent('rooms_occupancy'), 'facility');
  assert.equal(ownerAgent('data_query'), 'facility');
  assert.equal(ownerAgent('allergies'), 'clinical');
  assert.equal(ownerAgent('vitals_recent'), 'clinical');
  assert.equal(ownerAgent('patient_search'), null);
  assert.equal(ownerAgent('appointments'), null);
  assert.equal(ownerAgent('unknown'), null);
  assert.equal(ownerAgent('refuse_clinical'), null);
});

test('resolveAgent routes an out-of-domain intent to its owner instead of refusing', () => {
  // facility selezionato, domanda clinica → risponde il clinico (nessun rimando all'utente)
  assert.equal(resolveAgent('facility', 'allergies'), 'clinical');
  assert.equal(resolveAgent('facility', 'therapies'), 'clinical');
  assert.equal(resolveAgent('facility', 'vitals_recent'), 'clinical');
  // clinical selezionato, domanda di struttura → risponde la gestione struttura
  assert.equal(resolveAgent('clinical', 'rooms_occupancy'), 'facility');
  assert.equal(resolveAgent('clinical', 'staff_list'), 'facility');
  // dominio proprio → resta l'agente selezionato
  assert.equal(resolveAgent('facility', 'rooms_occupancy'), 'facility');
  assert.equal(resolveAgent('clinical', 'allergies'), 'clinical');
  // shared/neutral → resta l'agente selezionato
  assert.equal(resolveAgent('facility', 'patient_search'), 'facility');
  assert.equal(resolveAgent('clinical', 'appointments'), 'clinical');
  assert.equal(resolveAgent('facility', 'operator_queue'), 'facility');
});

test('agent profiles keep their labels (used by the UI/answer metadata)', () => {
  assert.equal(AGENT_PROFILES.clinical.label, 'Assistente clinico');
  assert.equal(AGENT_PROFILES.facility.label, 'Gestione struttura');
});
