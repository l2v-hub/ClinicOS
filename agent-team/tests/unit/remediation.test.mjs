import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRemediationState } from '../../src/core/remediation.mjs';

const failed = (sha, fingerprint) => ({
  decision: 'qa-failed',
  subject_sha: sha,
  findings: [{ fingerprint, status: 'open' }],
});

test('three equivalent failures without changed SHA become blocked', () =>
  assert.equal(
    nextRemediationState({
      qaResults: [failed('a', 'x'), failed('a', 'x'), failed('a', 'x')],
      noProgressLimit: 3,
    }),
    'blocked',
  ));

test('a changed SHA restarts remediation eligibility', () =>
  assert.equal(
    nextRemediationState({ qaResults: [failed('a', 'x'), failed('b', 'x')], noProgressLimit: 3 }),
    'ready-for-dev',
  ));
