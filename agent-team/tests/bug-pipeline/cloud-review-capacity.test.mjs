import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  createReviewSourceReader,
  prepareCloudInference,
  processCloudReview,
} from '../../src/bug-pipeline/cloud-review-worker.mjs';
import { processRecovery } from '../../src/bug-pipeline/cloud-review-recovery-worker.mjs';

const sha = 'a'.repeat(40),
  base = 'b'.repeat(40),
  repo = 'l2v-hub/ClinicOS';
const contextWindow = 1_000_000,
  nativeMargin = 65_536,
  transportMaximum = contextWindow - nativeMargin;
// Observed output capacity in the genuine preceding cloud receipt; fixture only.
const profile = { model: 'claude-opus-5-5', contextWindow, maxOutputTokens: 128_000 };
const clone = structuredClone;
const feedback = {
  number: 81,
  head: sha,
  comments: [],
  unresolved: false,
  changesRequested: false,
};
const approved = {
  subject_sha: sha,
  verdict: 'approved',
  summary: 'Synthetic capacity fixture only.',
  findings: [],
};
const packet = (text = '') => ({ subject_sha: sha, source: text, feedback: clone(feedback) });

function sourceFixture({ sourceSize = 184_000, optionalReports = [], optionalText = 'x'.repeat(60_000) } = {}) {
  const before = new Map(),
    head = new Map(),
    blobs = new Map(),
    texts = new Map();
  const prefix = 'artifacts/task-validation/bug-batch-17/';
  function add(map, file, text) {
    const data = Buffer.from(text),
      id = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    blobs.set(id, {
      sha: id,
      size: data.length,
      encoding: 'base64',
      content: data.toString('base64'),
    });
    map.set(file, { path: file, type: 'blob', mode: '100644', size: data.length, sha: id });
    texts.set((map === head ? 'after:' : 'before:') + file, text);
  }
  for (const file of ['src/alpha.mjs', 'src/beta.mjs']) {
    add(before, file, '// old synthetic source\n' + 'a'.repeat(sourceSize));
    add(head, file, '// new synthetic source\n' + 'b'.repeat(sourceSize));
  }
  for (const name of [
    'task-contract.md',
    'implementation-plan.md',
    'validation-report.md',
    'review-auth-context-report.md',
    'review-ops-context-report.md',
  ])
    add(head, prefix + name, 'Synthetic selected context: ' + name + '\n' + 'c'.repeat(1200));
  for (const name of optionalReports) add(head, prefix + name, optionalText);
  const subject = {
    id: 'bug-batch-17',
    pr: { number: 81 },
    sha,
    baseSha: base,
    branch: 'codex/bug-batch-17',
  };
  const pr = {
    number: 81,
    state: 'open',
    merged: false,
    draft: false,
    head: { sha, ref: subject.branch, repo: { full_name: repo, fork: false } },
    base: { sha: base, ref: 'main', repo: { full_name: repo } },
  };
  const changed = [...new Set([...before.keys(), ...head.keys()])];
  const calls = [];
  const run = async (call) => {
    calls.push(call);
    assert.equal(call.command, 'gh');
    assert.equal(call.envMode, 'controller');
    const endpoint = call.args[1],
      p = `repos/${repo}/`;
    let value;
    if (endpoint === p + 'pulls/81') value = pr;
    else if (endpoint === p + `git/trees/${sha}?recursive=1`)
      value = { truncated: false, tree: [...head.values()] };
    else if (endpoint === p + `git/trees/${base}?recursive=1`)
      value = { truncated: false, tree: [...before.values()] };
    else if (endpoint.startsWith(p + 'compare/'))
      value = {
        base_commit: { sha: base },
        merge_base_commit: { sha: base },
        status: 'ahead',
        files: changed.map((filename) => ({ filename })),
      };
    else if (endpoint.startsWith(p + 'git/blobs/')) value = blobs.get(endpoint.split('/').at(-1));
    else assert.fail('Unexpected synthetic source API');
    return { ok: true, stdout: JSON.stringify(value) };
  };
  return {
    subject,
    prefix,
    head,
    texts,
    calls,
    run,
    retrieve: createReviewSourceReader({ run, cwd: '/private-empty', feedbackReader: async () => clone(feedback) }),
  };
}

test('optional reports cannot block a real128k candidate whose immutable required context fits', async () => {
  const s = sourceFixture({ optionalReports: ['review-one-report.md', 'review-two-report.md', 'review-three-report.md'] });
  const f = nativeFixture(packet());
  f.subject.branch = s.subject.branch;
  f.options.retrieve = s.retrieve;
  const prior = clone(f.subject.reviews), ledger = clone(f.subject.reviewLedger.rounds);
  const model = f.options.run;
  f.options.run = async (call) => {
    const supplied = JSON.parse(call.input.slice(call.input.indexOf('{"repository"')));
    assert.ok(supplied.omittedTextEvidence.length > 0, 'excess optional evidence is explicitly listed');
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

function nativeFixture(sourcePacket, observed = profile) {
  const plan = {
    title: 'Synthetic capacity review',
    feature: 'Review capacity',
    rationale: 'Bounded input.',
    analysis: 'Synthetic only.',
    issues: [17],
    scope: ['src/alpha.mjs'],
    acceptance: [{ issue: 17, criteria: ['Complete context is reviewed.'] }],
    tasks: [{ title: 'Check capacity', files: ['src/alpha.mjs'], steps: ['Verify native gate.'] }],
    verification: [
      { command: 'node', args: ['--test', 'synthetic.test.mjs'] },
      { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
    ],
    evidence: [
      {
        issue: 17,
        screenshot: 'artifacts/task-validation/bug-batch-17/evidence/17.png',
        trace: 'artifacts/task-validation/bug-batch-17/evidence/17.zip',
        video: '',
      },
    ],
  };
  const subject = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    sha,
    baseSha: base,
    phase: 'waiting-review',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [
      { round: 1, subjectSha: base, status: 'changes-requested' },
      { round: 2, subjectSha: base, status: 'approved' },
    ],
    reviewLedger: {
      schema_version: 1,
      max_rounds: 4,
      rounds: [
        { round: 1, subject_sha: base, verdict: 'changes-requested' },
        { round: 2, subject_sha: base, verdict: 'approved' },
      ],
    },
    plan,
    pr: { number: 81 },
    externalReview: {
      channel: 'github-comments',
      status: 'comment-requested',
      subjectSha: sha,
      requestId: 'synthetic-request-3',
    },
  };
  const state = { schemaVersion: 1, repository: repo, batches: [subject] },
    calls = [];
  const options = {
    env: {
      CLAUDE_REVIEW_AUTH_MODE: 'subscription',
      CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-not-a-real-credential',
    },
    cwd: '/private-empty',
    github: { createStateStore: () => ({ load: async () => clone(state) }) },
    retrieve: async () => {
      calls.push('retrieve');
      return { packet: clone(sourcePacket), tracked: new Set(['src/alpha.mjs']) };
    },
    probe: async () => {
      calls.push('probe');
      return { profile: clone(observed) };
    },
    handoff: {
      actor: async () => 'synthetic-reviewer',
      claim: async (_pr, { expectedSubject, expectedFeedbackFingerprint, expectedActor }) => {
        calls.push('claim');
        assert.deepEqual(expectedSubject, subject);
        subject.phase = 'reviewing';
        Object.assign(subject.externalReview, {
          status: 'comment-running',
          owner: expectedActor,
          claimId: 'synthetic-claim-3',
          feedbackFingerprint: expectedFeedbackFingerprint,
        });
        subject.reviews.push({ round: 3, subjectSha: sha, status: 'running' });
        subject.reviewLedger.rounds.push({ round: 3, subject_sha: sha, verdict: 'running' });
        return clone(subject);
      },
      submit: async (_pr, review) => {
        calls.push('submit');
        assert.deepEqual(review, approved);
      },
      reconcilePR: async () => {
        calls.push('reconcile');
        subject.externalReview.status = 'published';
        subject.reviews.at(-1).status = 'approved';
        return clone(subject);
      },
      failOwnedClaim: async () => assert.fail('No synthetic model failure expected'),
    },
    standalone: {},
    communication: {
      publishState: async () => {
        calls.push('project');
      },
    },
    wake: async () => {
      calls.push('wake');
    },
    run: async (call) => {
      calls.push('model');
      assert.equal(call.command, 'claude');
      assert.equal(call.envMode, 'review');
      assert.equal(call.cwd, '/private-empty');
      assert.equal(call.args[call.args.indexOf('--tools') + 1], '');
      return { ok: true, stdout: JSON.stringify({ structured_output: approved }) };
    },
  };
  return { subject, calls, options };
}

test('a complete pinned before/after source packet above old700KiB retains every selected context', async () => {
  const f = sourceFixture(),
    result = await f.retrieve(f.subject);
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
  const prepared = prepareCloudInference({ packet: result.packet, sha, profile });
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
