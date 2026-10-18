import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  attemptLimit,
  historyDigest,
  implementationAttempts,
  spentAttempts,
  reserveImplementation,
  validateOperatorContinuations,
  activeImplementation,
} from '../../src/bug-pipeline/attempt-budget.mjs';
import { finalizeEnvironment } from '../../src/bug-pipeline/review-handoff-cli.mjs';
import { childEnvironment } from '../../src/bug-pipeline/process.mjs';

function compatibility() {
  const subject = {
    id: 'real-manual-owner',
    pr: { number: 492 },
    implementation: [1, 2, 3, 4].map((round) => ({
      round,
      status: round === 4 ? 'passed' : 'failed',
    })),
    reviews: [],
  };
  subject.operatorContinuations = [
    {
      round: 5,
      kind: 'explicit-operator-compatibility-continuation',
      status: 'running',
      owner: 'operator',
      nonce: 'reservation-5',
      startedAt: '2026-10-18T00:00:00Z',
      reason: 'Explicit owner instruction',
      authorizationRef: 'actual-owner-authorization',
      contractSha256: 'a'.repeat(64),
      preservedEntityDigest: 'b'.repeat(64),
      preservedLegacyImplementationDigest: historyDigest(subject.implementation),
      preservedLegacyReviewsDigest: historyDigest(subject.reviews),
    },
  ];
  const state = {
    manualBatches: [subject],
    operatorTakeover: {
      nonce: 'actual-owner-authorization',
      continuePastFourPreserveHistory: true,
      subjects: [{ collection: 'manualBatches', id: subject.id, pr: 492 }],
    },
  };
  return { subject, state };
}

test('explicit root compatibility continuation counts round5 without folding or rewriting legacy arrays', () => {
  const { subject, state } = compatibility();
  const legacy = JSON.stringify(subject.implementation);
  validateOperatorContinuations(state);
  assert.equal(spentAttempts(subject, 'implementation'), 5);
  assert.equal(attemptLimit(subject, 'implementation'), 5);
  assert.equal(activeImplementation(subject), true);
  subject.operatorContinuations[0].status = 'implemented-awaiting-independent-qa';
  validateOperatorContinuations(state);
  assert.equal(activeImplementation(subject), true);
  subject.operatorContinuations[0].status = 'passed';
  assert.equal(activeImplementation(subject), false);
  assert.throws(() => reserveImplementation(subject), /allowance exhausted/);
  assert.equal(JSON.stringify(subject.implementation), legacy);
  assert.equal(implementationAttempts(subject).at(-1).round, 5);
});

test('one append-only audited extension permits exactly round6; wrong authority, changed history and larger jump reject', () => {
  const { subject, state } = compatibility();
  subject.operatorContinuations[0].status = 'passed';
  Object.assign(subject.operatorContinuations[0], {
    completedAt: '2026-10-18T00:30:00Z',
    evidence: 'old.json',
    subjectSha: 'c'.repeat(40),
    independentQaReportSha256: 'd'.repeat(64),
    independentQaSealSha256: 'e'.repeat(64),
    rootVerification: { approved: true },
  });
  subject.reviews.push({ round: 1, status: 'approved', subjectSha: 'f'.repeat(40) });
  const prefix = structuredClone(implementationAttempts(subject));
  subject.budgetExtensions = [
    {
      entityId: subject.id,
      pr: 492,
      kind: 'implementation',
      previousLimit: 5,
      limit: 6,
      actor: 'maintainer',
      nonce: 'allowance-6',
      at: '2026-10-18T01:00:00Z',
      reason: 'Owner authorizes next attempt',
      authorizationRef: 'owner-instruction-2',
      historyLength: 5,
      historyDigest: historyDigest(prefix),
    },
  ];
  const reservationBaseline = historyDigest(subject);
  const attempt = reserveImplementation(subject, () => new Date('2026-10-18T01:02:03Z'));
  validateOperatorContinuations(state);
  assert.equal(attempt.round, 6);
  for (const key of [
    'completedAt',
    'evidence',
    'subjectSha',
    'independentQaReportSha256',
    'independentQaSealSha256',
    'rootVerification',
  ])
    assert.equal(attempt[key], undefined, `New reservation must not inherit ${key}`);
  assert.equal(attempt.preservedLegacyReviewsDigest, historyDigest(subject.reviews));
  assert.notEqual(
    attempt.preservedLegacyReviewsDigest,
    subject.operatorContinuations[0].preservedLegacyReviewsDigest,
  );
  assert.equal(attempt.preservedEntityDigest, reservationBaseline);
  assert.equal(attempt.budgetExtensionNonce, 'allowance-6');
  assert.equal(attempt.startedAt, '2026-10-18T01:02:03.000Z');
  assert.deepEqual(implementationAttempts(subject).slice(0, 5), prefix);
  attempt.status = 'failed';
  assert.throws(() => reserveImplementation(subject), /allowance exhausted/);
  state.operatorTakeover.continuePastFourPreserveHistory = false;
  assert.throws(() => validateOperatorContinuations(state), /authorization/);
  state.operatorTakeover.continuePastFourPreserveHistory = true;
  subject.budgetExtensions[0].limit = 7;
  assert.throws(() => attemptLimit(subject, 'implementation'));
  subject.budgetExtensions[0].limit = 6;
  subject.implementation[0].status = 'passed';
  assert.throws(() => attemptLimit(subject, 'implementation'), /history changed/);
});

test('legacy entities retain default4; unaudited fifth implementation and cross-entity compatibility authorization reject', () => {
  const { subject, state } = compatibility();
  subject.operatorContinuations[0].status = 'passed';
  assert.equal(attemptLimit({ implementation: [], reviews: [] }, 'reviews'), 4);
  state.operatorTakeover.subjects[0].id = 'another-owner';
  assert.throws(() => validateOperatorContinuations(state), /exact durable entity/);
});

test('F6 application provider key never becomes Codex API auth; missing or conflicting auth blocks before inference', async (t) => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'pr492-auth-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  await assert.rejects(
    finalizeEnvironment({ HOME: home }),
    (e) => e.code === 'codex-auth-unavailable',
  );
  await mkdir(path.join(home, '.codex'));
  const env = await finalizeEnvironment({
    HOME: home,
    CLINICOS_OPENAI_API_KEY: 'synthetic-provider-key',
  });
  assert.equal(env.CODEX_HOME, path.join(home, '.codex'));
  assert.equal(env.CODEX_API_KEY, undefined);
  const child = childEnvironment('model', env, '/tmp/synthetic-runtime');
  assert.equal(child.CODEX_HOME, env.CODEX_HOME);
  assert.equal(child.CODEX_API_KEY, undefined);
  assert.equal(child.CLINICOS_OPENAI_API_KEY, undefined);
  await assert.rejects(
    finalizeEnvironment({ ...env, CODEX_API_KEY: 'synthetic-explicit-key' }),
    (e) => e.code === 'codex-auth-conflict',
  );
});
