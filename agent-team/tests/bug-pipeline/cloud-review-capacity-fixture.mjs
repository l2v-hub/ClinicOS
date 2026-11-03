import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReviewSourceReader } from '../../src/bug-pipeline/cloud-review-worker.mjs';

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

function sourceFixture({
  sourceSize = 184_000,
  optionalReports = [],
  optionalText = 'x'.repeat(60_000),
} = {}) {
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
    retrieve: createReviewSourceReader({
      run,
      cwd: '/private-empty',
      feedbackReader: async () => clone(feedback),
    }),
  };
}

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

export {
  sha,
  base,
  repo,
  contextWindow,
  nativeMargin,
  transportMaximum,
  profile,
  clone,
  feedback,
  approved,
  packet,
  sourceFixture,
  nativeFixture,
};
