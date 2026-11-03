import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareCloudInference,
  prepareCloudReviewSource,
  processCloudReview,
} from '../../src/bug-pipeline/cloud-review-worker.mjs';
import { processRecovery } from '../../src/bug-pipeline/cloud-review-recovery-worker.mjs';
import {
  sha,
  base,
  contextWindow,
  nativeMargin,
  transportMaximum,
  profile,
  clone,
  packet,
  sourceFixture,
  nativeFixture,
} from './cloud-review-capacity-fixture.mjs';

test('a complete pinned before/after source packet above old700KiB retains every selected context', async () => {
  const f = sourceFixture(),
    retrieved = await f.retrieve(f.subject, { deferOptionalEvidence: true }),
    { source: result, prepared } = await prepareCloudReviewSource({
      source: retrieved,
      completeOptionalEvidence: retrieved.completeOptionalEvidence,
      sha,
      profile,
    });
  assert.ok(Buffer.byteLength(JSON.stringify(result.packet)) > 700 * 1024);
  assert.deepEqual(result.packet.omittedTextEvidence, []);
  assert.equal(result.packet.changes.length, 2);
  for (const change of result.packet.changes) {
    assert.equal(change.before.text, f.texts.get('before:' + change.file));
    assert.equal(change.after.text, f.texts.get('after:' + change.file));
  }
  for (const name of [
    'task-contract.md',
    'implementation-plan.md',
    'validation-report.md',
    'review-auth-context-report.md',
    'review-ops-context-report.md',
  ])
    assert.equal(result.packet.evidence[f.prefix + name], f.texts.get('after:' + f.prefix + name));
  assert.ok(prepared.capacity.requiredTokensUpperBound <= contextWindow);
  assert.equal(prepared.args[prepared.args.indexOf('--model') + 1], 'claude-opus-5-5[1m]');
  assert.ok(
    f.calls.every((c) => c.command === 'gh'),
    'Reviewed source is never executed',
  );
});

test('the old701KiB fixture is admissible only when full actual input fits the observed profile', async () => {
  const f = nativeFixture(packet('x'.repeat(701 * 1024))),
    prior = clone(f.subject.reviews),
    ledger = clone(f.subject.reviewLedger.rounds);
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'published');
  assert.equal(result.round, 3);
  assert.deepEqual(f.subject.reviews.slice(0, 2), prior);
  assert.deepEqual(f.subject.reviewLedger.rounds.slice(0, 2), ledger);
  assert.equal(f.subject.reviewLedger.max_rounds, 4);
  assert.equal(f.calls.filter((x) => x === 'claim').length, 1);
  assert.equal(f.calls.filter((x) => x === 'model').length, 1);
});

test('exact serialized prompt/schema/output/native boundary passes and one added byte fails', () => {
  const empty = prepareCloudInference({ packet: packet(), sha, profile });
  const remaining = contextWindow - empty.capacity.requiredTokensUpperBound;
  const exact = prepareCloudInference({ packet: packet('x'.repeat(remaining)), sha, profile });
  assert.equal(exact.capacity.requiredTokensUpperBound, contextWindow);
  assert.equal(exact.capacity.nativeOverheadTokens, nativeMargin);
  assert.equal(exact.capacity.inputBytes, Buffer.byteLength(exact.input));
  assert.equal(
    exact.capacity.schemaBytes,
    Buffer.byteLength(exact.args[exact.args.indexOf('--json-schema') + 1]),
  );
  assert.throws(
    () => prepareCloudInference({ packet: packet('x'.repeat(remaining + 1)), sha, profile }),
    /qualified context capacity/,
  );
});

test('Unicode and JSON escaping are counted after serialization, never by string length', () => {
  const unit = '漢字😀\n"\\',
    count = Math.ceil(740_000 / Buffer.byteLength(JSON.stringify(unit).slice(1, -1)));
  const p = packet(unit.repeat(count)),
    prepared = prepareCloudInference({ packet: p, sha, profile });
  assert.ok(Buffer.byteLength(JSON.stringify(p)) > 700 * 1024);
  assert.ok(prepared.capacity.inputBytes > prepared.input.length);
  assert.equal(
    prepared.capacity.requiredTokensUpperBound,
    Buffer.byteLength(prepared.input) +
      Buffer.byteLength(prepared.args[prepared.args.indexOf('--json-schema') + 1]) +
      nativeMargin +
      profile.maxOutputTokens,
  );
  assert.throws(
    () => prepareCloudInference({ packet: packet('\\'.repeat(440_000)), sha, profile }),
    /qualified context capacity/,
  );
});

test('below-static900000-byte input still fails dynamic allowance before native claim/model', async () => {
  const p = packet('x'.repeat(900_000));
  assert.ok(Buffer.byteLength(JSON.stringify(p)) < transportMaximum);
  const f = nativeFixture(p),
    before = clone(f.subject);
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'queue-blocked');
  assert.equal(result.claimed, false);
  assert.equal(result.blockedSubjects[0].status, 'capacity-unavailable');
  assert.deepEqual(f.subject, before);
  assert.ok(!f.calls.includes('claim') && !f.calls.includes('model'));
});

test('derived finite transport ceiling is not an unbounded or caller-configurable allowance', () => {
  assert.equal(transportMaximum, 934_464);
  assert.throws(
    () => prepareCloudInference({ packet: packet('x'.repeat(transportMaximum + 1)), sha, profile }),
    /static capacity bound/,
  );
  for (const change of [
    { contextWindow: 999999 },
    { contextWindow: 2000001 },
    { maxOutputTokens: 0 },
    { maxOutputTokens: NaN },
    { maxOutputTokens: Infinity },
    { maxOutputTokens: Number.MAX_SAFE_INTEGER + 1 },
  ])
    assert.throws(() =>
      prepareCloudInference({ packet: packet(), sha, profile: { ...profile, ...change } }),
    );
});

test('individual source blob ceiling is unchanged despite larger aggregate transport', async () => {
  const f = sourceFixture(),
    entry = f.head.get('src/alpha.mjs');
  entry.size = 256 * 1024 + 1;
  await assert.rejects(f.retrieve(f.subject));
});

test('shared explicit recovery transport also rejects dynamic overflow before its existing claim', async () => {
  let claims = 0,
    models = 0;
  const selector = { pr: 81, sha, round: 3, requestNonce: 'synthetic-existing-recovery' };
  await assert.rejects(
    processRecovery({
      github: { authorizedMaintainer: async () => true },
      run: async () => {
        models++;
        assert.fail('No model permitted');
      },
      cwd: '/private-empty',
      env: {},
      selector,
      actor: 'synthetic-reviewer',
      runId: '99',
      controller: {
        prepare: async () => ({ subject: { sha }, fingerprint: 'f'.repeat(64) }),
        claim: async () => {
          claims++;
          assert.fail('No claim permitted');
        },
      },
      retrieve: async () => ({ packet: packet('x'.repeat(900_000)), tracked: new Set() }),
      qualify: async () => ({ profile }),
    }),
    /qualified context capacity/,
  );
  assert.equal(claims, 0);
  assert.equal(models, 0);
});
