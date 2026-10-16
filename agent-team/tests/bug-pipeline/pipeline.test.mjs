import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../../src/bug-pipeline/pipeline.mjs';
import { feedbackFingerprint, planSchema } from '../../src/bug-pipeline/contracts.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = (letter) => letter.repeat(40);
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function planFor(issues = [17, 18]) {
  const batch = Math.min(...issues);
  return {
    groups: [
      {
        title: 'Stabilize the patient list filter',
        feature: 'Patient list',
        rationale: 'The related reports share the same filter behavior.',
        execution: {
          difficulty: 'low',
          mode: 'delegate',
          reason: 'Bounded, independently testable change.',
        },
        analysis:
          'Both issues describe the same feature regression with separate reproduction details.',
        issues: [...issues],
        scope: ['frontend/src/features/patients/filter.ts'],
        acceptance: issues.map((issue) => ({
          issue,
          criteria: [`Issue #${issue} reproduces and is fixed`],
        })),
        tasks: [
          {
            title: 'Fix and cover filter behavior',
            files: ['frontend/src/features/patients/filter.ts'],
            steps: ['Correct filter state handling', 'Add regression coverage'],
          },
        ],
        verification: [
          { command: 'node', args: ['--test', 'frontend/src/features/patients/filter.test.mjs'] },
          { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        ],
        evidence: issues.map((issue) => ({
          issue,
          screenshot: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${issue}.png`,
          trace: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${issue}-trace.zip`,
          video: '',
        })),
      },
    ],
    blocked: [],
  };
}

function blankState() {
  return { schemaVersion: 1, repository: repo, batches: [] };
}

function batchFor({ issues = [17, 18], phase = 'ready', head = sha('a'), reviews = [] } = {}) {
  const plan = planFor(issues).groups[0];
  return {
    id: `bug-batch-${Math.min(...issues)}`,
    branch: `codex/bug-batch-${Math.min(...issues)}`,
    issues,
    plan,
    phase,
    implementation: [{ round: 1, status: 'passed' }],
    reviews,
    sha: head,
    pr: { number: 81, url: 'https://github.com/l2v-hub/ClinicOS/pull/81' },
  };
}

function openFeedback(batch, overrides = {}) {
  return {
    state: 'OPEN',
    headRef: batch.branch,
    baseRef: 'main',
    headIsFork: false,
    headRepo: repo,
    head: batch.sha,
    comments: [],
    unresolved: false,
    changesRequested: false,
    ...overrides,
  };
}

function harness({
  issues = [17, 18],
  initialState = null,
  queue = issues,
  plan = null,
  executeResults = [],
  reviews = [],
  checks = [true],
  feedback,
  failSave = false,
} = {}) {
  const log = [];
  const stateRef = { value: clone(initialState) };
  const counts = { plan: 0, execute: 0, simplify: 0, verify: 0, review: 0, checks: 0 };
  let saveCount = 0;
  const hydrated = [];
  const issueComments = [];
  const planningInput = [];
  let currentBatch = null;
  let checkpoint = 0;
  const nextSha = () => sha(String.fromCharCode('a'.charCodeAt(0) + checkpoint++));

  const store = {
    async load() {
      log.push('store.load');
      return clone(stateRef.value);
    },
    async save(state) {
      log.push('store.save');
      saveCount += 1;
      if (failSave === true || (typeof failSave === 'number' && saveCount >= failSave))
        throw new Error('injected remote compare-and-swap conflict');
      stateRef.value = clone(state);
    },
  };
  const gh = {
    async setIssueStatus(number, status) {
      log.push(`gh.setIssueStatus:${number}:${status}`);
    },
    async draftReady() {
      log.push('gh.draftReady');
    },
    async intake(event) {
      log.push('gh.intake');
      assert.deepEqual(event, { action: 'test' });
    },
    async discoverQueue() {
      log.push('gh.discoverQueue');
      return queue;
    },
    async viewIssue(number) {
      log.push(`gh.viewIssue:${number}`);
      const item = {
        number,
        state: 'open',
        title: `Bug ${number}`,
        body: `Hydrated issue body for #${number}`,
        labels: [{ name: 'bug' }, { name: 'codex-triage' }],
        comments: [
          { id: number * 10, body: `Hydrated comment for #${number}`, user: { login: 'reporter' } },
        ],
      };
      hydrated.push(item);
      return item;
    },
    async commentIssue(number, body) {
      log.push(`gh.commentIssue:${number}`);
      issueComments.push({ number, body });
      return { number, body };
    },
    async createDraft(data) {
      log.push('gh.createDraft');
      assert.equal(data.branch, `codex/bug-batch-${Math.min(...issues)}`);
      return { number: 81, url: 'https://github.com/l2v-hub/ClinicOS/pull/81' };
    },
    async reviewFeedback(number) {
      log.push('gh.reviewFeedback');
      assert.equal(number, 81);
      const target =
        currentBatch ??
        stateRef.value?.batches?.find((candidate) => candidate.pr?.number === number);
      return feedback ? feedback({ batch: target, log }) : openFeedback(target);
    },
    async commentPR(number, body) {
      log.push('gh.commentPR');
      assert.equal(number, 81);
      assert.match(body, /Claude review/);
    },
    async requiredChecks(number) {
      log.push('gh.requiredChecks');
      assert.equal(number, 81);
      const check = checks[Math.min(counts.checks, checks.length - 1)];
      counts.checks += 1;
      return { ok: Boolean(check) };
    },
  };
  const workspace = {
    root: '/tmp/clinicos-pipeline-test',
    async qa() {
      log.push('workspace.qa');
      return { status: 'verified', summary: 'Independent acceptance/evidence review.' };
    },
    async prepare(batch) {
      log.push('workspace.prepare');
      currentBatch = batch;
    },
    async execute(batch, options) {
      log.push(`workspace.execute:${options.phase}:${options.round}`);
      counts.execute += 1;
      const result = executeResults[Math.min(counts.execute - 1, executeResults.length - 1)] ?? {
        status: 'implemented',
        summary: 'done',
      };
      return typeof result === 'function' ? result(batch, options) : result;
    },
    async verify() {
      log.push('workspace.verify');
      counts.verify += 1;
    },
    async simplify() {
      log.push('workspace.simplify');
      counts.simplify += 1;
      return { status: 'implemented', summary: 'simplified' };
    },
    async checkpoint(batch) {
      log.push('workspace.checkpoint');
      batch.sha = nextSha();
      return batch.sha;
    },
    async publish(batch) {
      log.push('workspace.publish');
      assert.equal(batch.sha.length, 40);
    },
    prBody() {
      return 'Draft evidence';
    },
    reviewBody(batch, result) {
      return `Claude review ${batch.reviews.length}/4: ${result.verdict}`;
    },
    async issueEvidence(batch) {
      log.push('workspace.issueEvidence');
      return batch.issues.map((number) => `Evidence for #${number}`).join('\n');
    },
    async review(batch) {
      log.push('workspace.review');
      counts.review += 1;
      const result = reviews[Math.min(counts.review - 1, reviews.length - 1)] ?? {
        verdict: 'approved',
        summary: 'Reviewed current SHA.',
        findings: [],
      };
      return { subject_sha: batch.sha, ...result };
    },
  };
  const models = {
    async plan(input) {
      log.push('models.plan');
      counts.plan += 1;
      assert.equal(input.cwd, workspace.root);
      assert.equal(input.issues.length, issues.length);
      assert.deepEqual(input.scopeSchema, planSchema);
      for (const issue of input.issues) {
        assert.match(issue.body, new RegExp(`Hydrated issue body for #${issue.number}`));
        assert.equal(issue.comments[0].body, `Hydrated comment for #${issue.number}`);
        planningInput.push({
          number: issue.number,
          body: issue.body,
          comment: issue.comments[0].body,
        });
      }
      return plan ?? planFor(issues);
    },
    async execute() {
      throw new Error('pipeline must use the workspace executor');
    },
  };
  return {
    log,
    store,
    gh,
    workspace,
    models,
    stateRef,
    counts,
    hydrated,
    issueComments,
    planningInput,
    run: (event = { action: 'test' }, reviewMode = 'internal') =>
      runPipeline({ repo, event, gh, models, workspace, store, reviewMode }),
  };
}

test('merged and deployed batches remain terminal and never restart implementation', async () => {
  for (const status of ['merged', 'deployed']) {
    const batch = batchFor();
    batch.release = {
      status,
      mergeSha: sha('b'),
      reviewedSha: batch.sha,
      deployment: {
        status: 'deployed',
        reviewedSha: batch.sha,
        mergeSha: sha('b'),
        vercelUrl: 'https://clinicos-eosin.vercel.app',
      },
    };
    const h = harness({ initialState: { ...blankState(), batches: [batch] }, queue: [] });
    const result = await h.run();
    assert.equal(result.batches[0].release.status, status);
    assert.equal(h.counts.execute, 0);
    assert.equal(h.counts.review, 0);
    assert.ok(!h.log.includes('gh.reviewFeedback'));
    assert.ok(
      h.log.includes(`gh.setIssueStatus:17:${status === 'deployed' ? 'Risolto' : 'In progress'}`),
    );
  }
});

test('all grouped issues are claimed after remote reservation and before triage; readiness never marks them resolved', async () => {
  const h = harness();
  await h.run();
  for (const number of [17, 18]) {
    const claim = h.log.indexOf(`gh.setIssueStatus:${number}:In progress`);
    assert.ok(claim > h.log.indexOf('store.save'));
    assert.ok(claim < h.log.indexOf('models.plan'));
  }
  assert.equal(
    h.log.some((line) => line.endsWith(':Risolto')),
    false,
  );
});

test('failed claim publication prevents triage and retains its remote claim without consuming implementation or review budgets', async () => {
  const h = harness();
  const publish = h.gh.setIssueStatus;
  h.gh.setIssueStatus = async () => {
    throw new Error('issue status unavailable');
  };
  await assert.rejects(h.run(), /issue status unavailable/);
  assert.deepEqual(h.stateRef.value.pendingTriage.issues, [17, 18]);
  assert.equal(h.counts.plan, 0);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
  assert.equal(h.stateRef.value.pendingTriage.status, 'claiming');
  h.gh.setIssueStatus = publish;
  await h.run();
  assert.equal(h.counts.plan, 1);
  assert.equal(h.counts.review, 1);
});

test('unchanged unresolved human review waits without spending another Claude attempt', async () => {
  const batch = batchFor({ reviews: [{ round: 1, status: 'approved', subjectSha: sha('a') }] });
  batch.approvedSha = batch.sha;
  const feedback = openFeedback(batch, { unresolved: true });
  batch.feedbackFingerprint = feedbackFingerprint(feedback);
  const h = harness({
    initialState: { ...blankState(), batches: [batch] },
    queue: [],
    feedback: () => feedback,
  });
  const result = await h.run();
  assert.equal(result.batches[0].phase, 'waiting-checks');
  assert.equal(result.batches[0].reviews.length, 1);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
});

test('successful grouped flow hydrates every issue, validates, simplifies, revalidates, publishes draft before Claude, and posts evidence to each source issue', async () => {
  const h = harness();
  const final = await h.run();
  assert.equal(h.counts.plan, 1);
  assert.deepEqual(h.planningInput, [
    { number: 17, body: 'Hydrated issue body for #17', comment: 'Hydrated comment for #17' },
    { number: 18, body: 'Hydrated issue body for #18', comment: 'Hydrated comment for #18' },
  ]);
  assert.deepEqual(
    h.hydrated.map((issue) => issue.number),
    [17, 18, 17, 18],
    'issues are rehydrated immediately before work',
  );
  assert.deepEqual(final.batches[0].issues, [17, 18]);
  assert.equal(final.batches[0].phase, 'ready');
  assert.equal(h.counts.execute, 1);
  assert.equal(h.counts.verify, 2);
  assert.equal(h.counts.simplify, 1);
  assert.equal(h.counts.review, 1);
  assert.equal(h.counts.checks, 1);

  const position = (name) => h.log.indexOf(name);
  assert.ok(position('workspace.verify') < position('workspace.simplify'));
  assert.ok(position('workspace.simplify') < h.log.lastIndexOf('workspace.verify'));
  assert.ok(h.log.indexOf('workspace.checkpoint') < position('gh.createDraft'));
  assert.ok(position('gh.createDraft') < position('workspace.review'));
  assert.ok(position('workspace.issueEvidence') < position('workspace.review'));
  assert.ok(position('workspace.publish') < position('gh.createDraft'));
  assert.ok(h.log.lastIndexOf('workspace.verify') < position('workspace.qa'));
  assert.ok(position('workspace.qa') < position('gh.createDraft'));
  for (const issue of [17, 18]) {
    const comments = h.issueComments.filter((entry) => entry.number === issue);
    assert.ok(
      comments.length >= 2,
      `issue #${issue} receives progress and evidence/status comments`,
    );
    assert.ok(
      comments.some((entry) => entry.body.includes(`Evidence for #${issue}`)),
      `issue #${issue} receives its evidence`,
    );
  }
});

test('failed independent QA prevents PR publication and consumes the existing implementation budget', async () => {
  const h = harness();
  h.workspace.qa = async () => ({
    status: 'blocked',
    summary: 'Regression evidence does not support acceptance.',
  });
  const state = await h.run();
  assert.equal(state.batches[0].phase, 'blocked');
  assert.equal(h.counts.execute, 4);
  assert.equal(h.counts.review, 0);
  assert.ok(!h.log.includes('gh.createDraft'));
});

test('four implementation failures exhaust the budget, and a rerun cannot reset or exceed it', async () => {
  const blocked = { status: 'blocked', summary: 'cannot implement' };
  const h = harness({ issues: [17], queue: [17], executeResults: [blocked] });
  const first = await h.run();
  assert.equal(h.counts.execute, 4);
  assert.equal(h.counts.plan, 1);
  assert.equal(h.counts.review, 0);
  assert.equal(first.batches[0].implementation.length, 4);
  assert.ok(first.batches[0].implementation.every((attempt) => attempt.status === 'failed'));
  assert.equal(first.batches[0].phase, 'blocked');

  const second = await h.run();
  assert.equal(second.batches[0].implementation.length, 4);
  assert.equal(h.counts.execute, 4);
  assert.equal(h.counts.plan, 1);
});

test('four changes-requested Claude reviews run no fifth round and retain each correction in the same budget', async () => {
  const h = harness({
    issues: [17],
    queue: [17],
    reviews: Array.from({ length: 4 }, (_, index) => ({
      verdict: 'changes-requested',
      summary: `Finding round ${index + 1}`,
      findings: [],
    })),
  });
  const final = await h.run();
  assert.equal(h.counts.review, 4);
  assert.equal(final.batches[0].reviews.length, 4);
  assert.equal(final.batches[0].phase, 'blocked');
  assert.equal(h.counts.execute, 4, 'one initial implementation plus three review corrections');
  assert.equal(
    h.log.filter((entry) => entry.startsWith('workspace.execute:review-correction')).length,
    3,
  );
  assert.equal(h.log.filter((entry) => entry === 'workspace.publish').length, 4);
});

test('later PR comments cannot restart an exhausted Claude review budget', async () => {
  const batch = batchFor({
    issues: [17],
    phase: 'waiting-checks',
    reviews: Array.from({ length: 4 }, (_, i) => ({
      round: i + 1,
      status: 'changes-requested',
      subjectSha: sha('a'),
    })),
  });
  batch.feedbackFingerprint = feedbackFingerprint({
    comments: [],
    unresolved: false,
    changesRequested: false,
  });
  const state = { schemaVersion: 1, repository: repo, batches: [batch] };
  const h = harness({
    issues: [17],
    queue: [17],
    initialState: state,
    feedback: ({ batch: current }) =>
      openFeedback(current, { comments: [{ id: 999, body: 'New PR request' }] }),
  });
  const final = await h.run();
  assert.equal(final.batches[0].phase, 'blocked');
  assert.equal(final.batches[0].reviews.length, 4);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
  assert.ok(final.batches[0].reason.includes('Four-review limit'));
});

test('a new comment on an approved ready PR triggers correction, revalidation and a review of the new head', async () => {
  const batch = batchFor({
    issues: [17],
    phase: 'ready',
    head: sha('a'),
    reviews: [{ round: 1, status: 'approved', subjectSha: sha('a') }],
  });
  const originalFeedback = { comments: [], unresolved: false, changesRequested: false };
  batch.feedbackFingerprint = feedbackFingerprint(originalFeedback);
  batch.approvedSha = batch.sha;
  const h = harness({
    issues: [17],
    queue: [17],
    initialState: { schemaVersion: 1, repository: repo, batches: [batch] },
    feedback: ({ batch: current }) =>
      openFeedback(current, { comments: [{ id: 222, body: 'Please handle this review note' }] }),
  });
  const final = await h.run();
  assert.equal(h.counts.execute, 1);
  assert.equal(
    h.log.filter((entry) => entry.startsWith('workspace.execute:pr-feedback')).length,
    1,
  );
  assert.equal(h.counts.verify, 2);
  assert.equal(h.counts.simplify, 1);
  assert.equal(h.counts.review, 1);
  assert.equal(final.batches[0].reviews.length, 2);
  assert.equal(final.batches[0].reviews[1].subjectSha, final.batches[0].sha);
  assert.equal(final.batches[0].phase, 'ready');
  assert.equal(final.batches[0].approvedSha, final.batches[0].sha);
});

test('external PR head or fork identity blocks before any executor or review model call', async () => {
  const batch = batchFor({ issues: [17], phase: 'waiting-checks' });
  const h = harness({
    issues: [17],
    queue: [17],
    initialState: { schemaVersion: 1, repository: repo, batches: [batch] },
    feedback: ({ batch: current }) => openFeedback(current, { head: sha('f'), headIsFork: true }),
  });
  const final = await h.run();
  assert.equal(final.batches[0].phase, 'blocked');
  assert.ok(final.batches[0].reason.includes('PR identity or head changed'));
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
});

test('pending required checks remain waiting and can become ready without resetting review or implementation budgets', async () => {
  const h = harness({ issues: [17], queue: [17], checks: [false, false, true] });
  let state = await h.run();
  assert.equal(state.batches[0].phase, 'waiting-checks');
  assert.equal(state.batches[0].reviews.length, 1);
  assert.equal(state.batches[0].approvedSha, state.batches[0].sha);
  assert.ok(h.log.some((entry) => entry.startsWith('gh.commentIssue:17')));

  state = await h.run();
  assert.equal(state.batches[0].phase, 'waiting-checks');
  assert.equal(state.batches[0].reviews.length, 1);
  state = await h.run();
  assert.equal(state.batches[0].phase, 'ready');
  assert.equal(state.batches[0].reviews.length, 1);
  assert.equal(h.counts.execute, 1);
  assert.equal(h.counts.review, 1);
  assert.equal(h.counts.checks, 3);
});

test('interrupted running work is blocked for operator recovery without restarting a model', async () => {
  const batch = batchFor({ issues: [17], phase: 'implementing', reviews: [] });
  batch.implementation = [{ round: 1, status: 'running' }];
  batch.sha = null;
  const h = harness({
    issues: [17],
    queue: [17],
    initialState: { schemaVersion: 1, repository: repo, batches: [batch] },
  });
  const final = await h.run();
  assert.equal(final.batches[0].phase, 'blocked');
  assert.ok(final.batches[0].reason.includes('Previous execution interrupted'));
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
  assert.ok(!h.log.includes('workspace.prepare'));
});

test('remote compare-and-swap failure while reserving an implementation attempt prevents executor invocation', async () => {
  // Save #1 reserves labels; #2 reserves triage; #3 persists its plan; #4 reserves round 1.
  const h = harness({ issues: [17], queue: [17], failSave: 4 });
  let failure;
  try {
    await h.run();
  } catch (error) {
    failure = error;
  }
  assert.ok(
    failure,
    `expected CAS failure; saves: ${h.log.filter((entry) => entry === 'store.save').length}; log: ${h.log.join(',')}`,
  );
  assert.match(failure.message, /compare-and-swap conflict/);
  assert.equal(h.counts.plan, 1);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
  assert.ok(h.log.includes('workspace.prepare'));
  assert.equal(h.log.filter((entry) => entry === 'store.save').length, 4);
});
