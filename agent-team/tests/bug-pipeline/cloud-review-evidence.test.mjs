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
  profile,
  clone,
  feedback,
  approved,
  packet,
  sourceFixture,
  nativeFixture,
} from './cloud-review-capacity-fixture.mjs';

test('optional reports cannot block a real128k candidate whose immutable required context fits', async () => {
  const s = sourceFixture({
    optionalReports: ['review-one-report.md', 'review-two-report.md', 'review-three-report.md'],
  });
  const f = nativeFixture(packet());
  f.subject.branch = s.subject.branch;
  delete f.options.retrieve;
  f.options.github.reviewFeedback = async () => clone(feedback);
  const prior = clone(f.subject.reviews),
    ledger = clone(f.subject.reviewLedger.rounds);
  const model = f.options.run;
  f.options.probe = async () => {
    f.calls.push('probe');
    const reads = new Set(
      s.calls
        .filter((call) => call.args[1].includes('/git/blobs/'))
        .map((call) => call.args[1].split('/').at(-1)),
    );
    for (const name of ['task-contract.md', 'implementation-plan.md', 'validation-report.md'])
      assert.ok(
        reads.has(s.head.get(s.prefix + name).sha),
        'mandatory text is verified before qualification',
      );
    assert.equal(
      s.calls.filter((call) => call.args[1].includes('/git/blobs/')).length,
      7,
      'four full source bodies plus three required documents precede qualification (identical bodies may share a SHA)',
    );
    for (const name of ['review-one-report.md', 'review-two-report.md', 'review-three-report.md'])
      assert.ok(
        !reads.has(s.head.get(s.prefix + name).sha),
        'optional reports wait for the actual profile',
      );
    return { profile: clone(profile) };
  };
  f.options.run = async (call) => {
    if (call.command === 'gh') return s.run(call);
    const supplied = JSON.parse(call.input.slice(call.input.indexOf('{"repository"')));
    assert.ok(
      supplied.omittedTextEvidence.length > 0,
      'excess optional evidence is explicitly listed',
    );
    for (const change of supplied.changes) {
      assert.equal(change.before.text, s.texts.get('before:' + change.file));
      assert.equal(change.after.text, s.texts.get('after:' + change.file));
    }
    for (const name of ['task-contract.md', 'implementation-plan.md', 'validation-report.md'])
      assert.equal(supplied.evidence[s.prefix + name], s.texts.get('after:' + s.prefix + name));
    return model(call);
  };
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'published');
  assert.ok(result.capacity.requiredTokensUpperBound <= contextWindow);
  assert.deepEqual(f.subject.reviews.slice(0, 2), prior);
  assert.deepEqual(f.subject.reviewLedger.rounds.slice(0, 2), ledger);
  assert.equal(f.calls.filter((x) => x === 'claim').length, 1);
  assert.equal(f.calls.filter((x) => x === 'model').length, 1);
});

test('required source alone above real128k admission stays blocked before claim or model', async () => {
  const s = sourceFixture({ sourceSize: 210_000, optionalReports: ['review-one-report.md'] });
  const f = nativeFixture(packet());
  f.subject.branch = s.subject.branch;
  f.options.retrieve = s.retrieve;
  const original = clone(f.subject);
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'queue-blocked');
  assert.equal(result.blockedSubjects[0].status, 'capacity-unavailable');
  assert.deepEqual(f.subject, original);
  assert.ok(!f.calls.includes('claim') && !f.calls.includes('model'));
});

test('invalid immutable source is rejected before qualification, claim or model', async () => {
  const s = sourceFixture();
  s.head.get('src/alpha.mjs').size = 256 * 1024 + 1;
  const f = nativeFixture(packet());
  f.options.retrieve = s.retrieve;
  const before = clone(f.subject);
  const result = await processCloudReview(f.options);
  assert.equal(result.status, 'queue-blocked');
  assert.equal(result.blockedSubjects[0].status, 'source-unavailable');
  assert.deepEqual(f.subject, before);
  assert.ok(!f.calls.includes('probe') && !f.calls.includes('claim') && !f.calls.includes('model'));
});

test('optional64KiB ceiling omits oversized reports without fetching their body', async () => {
  const s = sourceFixture({
    sourceSize: 1000,
    optionalReports: ['review-big-report.md'],
    optionalText: 'x'.repeat(64 * 1024 + 1),
  });
  const source = await s.retrieve(s.subject, { deferOptionalEvidence: true });
  const result = await prepareCloudReviewSource({
    source,
    completeOptionalEvidence: source.completeOptionalEvidence,
    sha,
    profile,
  });
  const file = s.prefix + 'review-big-report.md';
  assert.ok(result.source.packet.omittedTextEvidence.includes(file));
  assert.equal(Object.hasOwn(result.source.packet.evidence, file), false);
  assert.ok(!s.calls.some((call) => call.args[1].endsWith('/git/blobs/' + s.head.get(file).sha)));
});

test('direct readers conservatively omit optional reports without a qualified profile', async () => {
  const f = sourceFixture(),
    result = await f.retrieve(f.subject);
  assert.ok(Buffer.byteLength(JSON.stringify(result.packet)) > 700 * 1024);
  assert.equal(result.packet.changes.length, 2);
  assert.deepEqual(result.packet.omittedTextEvidence, [
    f.prefix + 'review-auth-context-report.md',
    f.prefix + 'review-ops-context-report.md',
  ]);
  assert.equal(Object.keys(result.packet.evidence).length, 3);
});

test('deferred optional selection counts exact escaped/control JSON bytes within the real budget', async () => {
  const f = sourceFixture({
    sourceSize: 170_000,
    optionalReports: ['review-control-report.md'],
    optionalText: '\x01"\\'.repeat(20_000),
  });
  const retrieved = await f.retrieve(f.subject, { deferOptionalEvidence: true });
  const snapshot = clone(retrieved.packet);
  const minimal = prepareCloudInference({ packet: snapshot, sha, profile });
  let observedBudget;
  const result = await prepareCloudReviewSource({
    source: retrieved,
    sha,
    profile,
    completeOptionalEvidence: async (options) => {
      observedBudget = options.packetByteBudget;
      return retrieved.completeOptionalEvidence(options);
    },
  });
  assert.equal(
    observedBudget,
    Buffer.byteLength(JSON.stringify(snapshot)) +
      contextWindow -
      minimal.capacity.requiredTokensUpperBound,
  );
  assert.ok(
    result.source.packet.omittedTextEvidence.includes(f.prefix + 'review-control-report.md'),
  );
  assert.equal(
    result.source.packet.evidence[f.prefix + 'review-auth-context-report.md'],
    f.texts.get('after:' + f.prefix + 'review-auth-context-report.md'),
  );
  assert.deepEqual(retrieved.packet, snapshot, 'completion never mutates required input');
  assert.ok(result.prepared.capacity.requiredTokensUpperBound <= contextWindow);
});

test('deferred completion preserves the 24 evidence count and reserves every omitted name', async () => {
  const names = Array.from(
    { length: 28 },
    (_, n) => `review-${String(n).padStart(2, '0')}-report.md`,
  );
  const f = sourceFixture({
    sourceSize: 1000,
    optionalReports: names,
    optionalText: 'small synthetic report',
  });
  const retrieved = await f.retrieve(f.subject, { deferOptionalEvidence: true });
  const result = await prepareCloudReviewSource({
    source: retrieved,
    completeOptionalEvidence: retrieved.completeOptionalEvidence,
    sha,
    profile,
  });
  assert.equal(Object.keys(result.source.packet.evidence).length, 24);
  const added = Object.keys(result.source.packet.evidence).filter(
    (name) => !Object.hasOwn(retrieved.packet.evidence, name),
  );
  assert.deepEqual(
    result.source.packet.omittedTextEvidence,
    retrieved.packet.omittedTextEvidence.filter((name) => !added.includes(name)),
  );
  assert.equal(result.source.packet.omittedTextEvidence.length, 9);
});

test('one exact prospective escaped optional entry fits while a one-byte smaller budget omits it', async () => {
  const f = sourceFixture({
    sourceSize: 1000,
    optionalReports: ['analysis.md'],
    optionalText: '\x01"\\'.repeat(1000),
  });
  const retrieved = await f.retrieve(f.subject, { deferOptionalEvidence: true });
  const file = f.prefix + 'analysis.md',
    text = f.texts.get('after:' + file);
  const prospective = {
    ...retrieved.packet,
    evidence: { ...retrieved.packet.evidence, [file]: text },
    omittedTextEvidence: retrieved.packet.omittedTextEvidence.filter((name) => name !== file),
  };
  const exactBytes = Buffer.byteLength(JSON.stringify(prospective));
  const exact = await retrieved.completeOptionalEvidence({ packetByteBudget: exactBytes });
  assert.equal(exact.packet.evidence[file], text);
  assert.equal(Buffer.byteLength(JSON.stringify(exact.packet)), exactBytes);
  const short = await retrieved.completeOptionalEvidence({ packetByteBudget: exactBytes - 1 });
  assert.ok(short.packet.omittedTextEvidence.includes(file));
  assert.equal(Object.hasOwn(short.packet.evidence, file), false);
});

test('explicit recovery uses deferred actual-budget completion before its one existing claim', async () => {
  const f = sourceFixture({
    optionalReports: ['review-one-report.md', 'review-two-report.md', 'review-three-report.md'],
  });
  let claims = 0,
    models = 0,
    completion = 0;
  const original = await f.retrieve(f.subject, { deferOptionalEvidence: true });
  const snapshot = clone(original.packet);
  const result = await processRecovery({
    github: { authorizedMaintainer: async () => true },
    cwd: '/private-empty',
    env: {},
    selector: { pr: 81, sha, round: 3, requestNonce: 'synthetic-existing-recovery' },
    actor: 'synthetic-reviewer',
    runId: '99',
    controller: {
      prepare: async () => ({ subject: clone(f.subject), fingerprint: 'f'.repeat(64) }),
      claim: async () => {
        claims++;
        assert.equal(completion, 1);
        return {};
      },
      retain: async (_claim, report) => assert.deepEqual(report, approved),
      publish: async () => ({
        report: approved,
        reportSha256: 'd'.repeat(64),
        reviewId: 1,
        reviewUrl: 'https://example.invalid/synthetic',
      }),
      fail: async () => assert.fail('No model failure expected'),
    },
    retrieve: async (_subject, options) => {
      assert.equal(options.deferOptionalEvidence, true);
      return {
        ...original,
        completeOptionalEvidence: async (options) => {
          completion++;
          return original.completeOptionalEvidence(options);
        },
      };
    },
    qualify: async () => {
      original.packet.feedback.head = base;
      return { profile };
    },
    run: async (call) => {
      models++;
      const supplied = JSON.parse(call.input.slice(call.input.indexOf('{"repository"')));
      assert.deepEqual(supplied.feedback, snapshot.feedback);
      assert.ok(supplied.omittedTextEvidence.length > 0);
      return { ok: true, stdout: JSON.stringify({ structured_output: approved }) };
    },
  });
  assert.equal(result.status, 'published');
  assert.equal(result.newRound, false);
  assert.equal(claims, 1);
  assert.equal(models, 1);
});

test('explicit recovery refuses oversized verified mandatory context before completion, claim or model', async () => {
  const f = sourceFixture({ sourceSize: 210_000 });
  let claims = 0,
    models = 0,
    completions = 0;
  await assert.rejects(
    processRecovery({
      github: { authorizedMaintainer: async () => true },
      cwd: '/private-empty',
      env: {},
      selector: { pr: 81, sha, round: 3, requestNonce: 'synthetic-existing-recovery' },
      actor: 'synthetic-reviewer',
      runId: '99',
      controller: {
        prepare: async () => ({ subject: clone(f.subject), fingerprint: 'f'.repeat(64) }),
        claim: async () => {
          claims++;
          assert.fail('No claim permitted');
        },
      },
      retrieve: async (subject, options) => {
        const result = await f.retrieve(subject, options);
        return {
          ...result,
          completeOptionalEvidence: async (options) => {
            completions++;
            return result.completeOptionalEvidence(options);
          },
        };
      },
      qualify: async () => ({ profile }),
      run: async () => {
        models++;
        assert.fail('No model permitted');
      },
    }),
    /qualified context capacity/,
  );
  assert.equal(claims, 0);
  assert.equal(models, 0);
  assert.equal(completions, 0);
});
