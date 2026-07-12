import test from 'node:test';
import assert from 'node:assert/strict';
import { isDevelopmentEligible, isQaEligible, assertTransition } from '../../src/core/state-machine.mjs';

const labels = { readyForDev: 'ready-for-dev', assignedToClaude: 'assigned-to-claude', working: 'agent-working', readyForQa: 'ready-for-qa', qaPassed: 'qa-passed', qaFailed: 'qa-failed', blocked: 'blocked' };
const issue = (...names) => ({ labels: names.map((name) => ({ name })) });

test('development requires both intake labels', () => {
  assert.equal(isDevelopmentEligible(issue('ready-for-dev', 'assigned-to-claude'), labels), true);
  assert.equal(isDevelopmentEligible(issue('ready-for-dev'), labels), false);
});

test('QA requires ready-for-qa and excludes terminal current states', () => {
  assert.equal(isQaEligible(issue('ready-for-qa'), labels), true);
  assert.equal(isQaEligible(issue('ready-for-qa', 'qa-passed'), labels), false);
});

test('state machine rejects Claude to qa-passed', () => assert.throws(() => assertTransition('agent-working', 'qa-passed', 'claude'), /forbidden/));
