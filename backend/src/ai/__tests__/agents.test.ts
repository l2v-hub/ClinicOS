import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agentAllowsIntent,
  redirectMessage,
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
});

test('clinical agent serves its own domain + shared intents, not facility ones', () => {
  assert.equal(agentAllowsIntent('clinical', 'allergies'), true);
  assert.equal(agentAllowsIntent('clinical', 'therapies'), true);
  assert.equal(agentAllowsIntent('clinical', 'vitals_recent'), true);
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

test('redirectMessage points to the owning agent only when out of domain', () => {
  // facility asked a clinical thing → redirect to the clinical agent
  const r1 = redirectMessage('facility', 'allergies');
  assert.ok(r1.includes(AGENT_PROFILES.clinical.label));
  // clinical asked a facility thing → redirect to the facility agent
  const r2 = redirectMessage('clinical', 'rooms_occupancy');
  assert.ok(r2.includes(AGENT_PROFILES.facility.label));
  // own domain → no redirect
  assert.equal(redirectMessage('facility', 'rooms_occupancy'), '');
  assert.equal(redirectMessage('clinical', 'allergies'), '');
  // shared/neutral → no redirect
  assert.equal(redirectMessage('facility', 'patient_search'), '');
  assert.equal(redirectMessage('clinical', 'appointments'), '');
});
