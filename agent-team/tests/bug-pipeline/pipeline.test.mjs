import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../../src/bug-pipeline/pipeline.mjs';
import { createGitHub } from '../../src/bug-pipeline/github.mjs';
import {
  recordDeployment,
  captureReleaseReviewProof,
  releaseBatch,
  selectAutoReleaseBatch,
  publicationComplete,
} from '../../src/bug-pipeline/release.mjs';
import { feedbackFingerprint, planSchema, sha256 } from '../../src/bug-pipeline/contracts.mjs';
import { adaptivePlanningSchema, validateWorkItems } from '../../src/bug-pipeline/work-items.mjs';

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
        fileMap: issues.map((issue) => ({
          issue,
          files: ['frontend/src/features/patients/filter.ts'],
        })),
        separationReason: '',
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
          {
            command: 'node',
            args: ['--test', 'frontend/src/features/patients/filter.test.mjs'],
          },
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
  now = () => 1_000_000,
  triageWindowMs = 0,
  feedback,
  failSave = false,
  adaptiveWorkItems = { enabled: false, maxParallel: 2 },
} = {}) {
  const log = [];
  const stateRef = { value: clone(initialState) };
  const counts = {
    plan: 0,
    execute: 0,
    simplify: 0,
    verify: 0,
    review: 0,
    checks: 0,
  };
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
        labels: [{ name: 'bug' }, { name: 'codex-triage' }, { name: 'codex-run' }],
        comments: [
          {
            id: number * 10,
            body: `Hydrated comment for #${number}`,
            user: { login: 'reporter' },
          },
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
      return {
        status: 'verified',
        summary: 'Independent acceptance/evidence review.',
      };
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
      assert.deepEqual(
        input.scopeSchema,
        adaptiveWorkItems.enabled ? adaptivePlanningSchema : planSchema,
      );
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
      runPipeline({
        repo,
        event,
        gh,
        models,
        workspace,
        store,
        reviewMode,
        now,
        triageWindowMs,
        adaptiveWorkItems,
      }),
  };
}

function reviewedTerminalBatch(status = 'deployed') {
  const batch = batchFor();
  const report = JSON.stringify({
    subject_sha: batch.sha,
    verdict: 'approved',
    summary: 'Synthetic exact-revision review fixture.',
    findings: [],
  });
  batch.approvedSha = batch.sha;
  batch.reviews = [{ round: 1, status: 'approved', subjectSha: batch.sha }];
  batch.reviewReports = { 'claude-review-1.json': report };
  batch.reviewLedger = {
    rounds: [
      {
        round: 1,
        subject_sha: batch.sha,
        verdict: 'approved',
        review_sha256: sha256(report),
      },
    ],
  };
  batch.feedbackFingerprint = feedbackFingerprint(openFeedback(batch));
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
  return batch;
}

test('merged and deployed batches remain terminal and never restart implementation', async () => {
  for (const status of ['merged', 'deployed']) {
    const batch = reviewedTerminalBatch(status);
    const h = harness({
      initialState: { ...blankState(), batches: [batch] },
      queue: [],
    });
    const result = await h.run();
    assert.equal(result.batches[0].release.status, status);
    assert.equal(h.counts.execute, 0);
    assert.equal(h.counts.review, 0);
    assert.ok(!h.log.includes('gh.reviewFeedback'));
    if (status === 'merged') assert.ok(h.log.includes('gh.setIssueStatus:17:In progress'));
    else {
      assert.ok(!h.log.some((line) => line.startsWith('gh.setIssueStatus:')));
      assert.ok(!h.log.some((line) => line.startsWith('gh.commentIssue:')));
    }
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

test('successive label wake-ups collect related issues durably before one plan, worktree and PR', async () => {
  let clock = 1_000_000;
  const queue = [17];
  const h = harness({ queue, now: () => clock, triageWindowMs: 120_000 });
  await h.run();
  assert.equal(h.counts.plan, 0);
  assert.deepEqual(h.stateRef.value.triageQueue.issues, [17]);
  assert.ok(!h.log.some((line) => line.includes('In progress')));
  clock += 60_000;
  queue.push(18);
  await h.run();
  assert.equal(h.counts.execute, 0);
  assert.equal(h.stateRef.value.triageQueue.openedAt, 1_000_000);
  assert.equal(h.stateRef.value.triageQueue.changedAt, clock);
  clock += 119_999;
  await h.run();
  assert.equal(h.counts.plan, 0);
  clock += 1;
  const final = await h.run();
  assert.equal(h.counts.plan, 1);
  assert.equal(final.triageQueue, undefined);
  assert.deepEqual(final.batches[0].issues, [17, 18]);
  assert.equal(
    final.batches[0].plan.fileMap,
    undefined,
    'old installed reviewer plan schema stays compatible',
  );
  assert.equal(final.batches[0].grouping.fileMap.length, 2);
  assert.equal(h.log.filter((line) => line === 'workspace.prepare').length, 1);
  assert.equal(h.log.filter((line) => line === 'gh.createDraft').length, 1);
  for (const issue of [17, 18])
    assert.ok(
      h.issueComments.some(
        (entry) => entry.number === issue && entry.body.includes('Mappa issue/file'),
      ),
    );
});

test('collection clears revoked entries and is bounded even if queue membership keeps changing', async () => {
  let clock = 1_000_000;
  const queue = [17];
  const h = harness({ queue, now: () => clock, triageWindowMs: 120_000 });
  await h.run();
  queue.length = 0;
  await h.run();
  assert.equal(h.stateRef.value.triageQueue, undefined);
  queue.push(17);
  await h.run();
  clock += 600_000;
  queue.push(18);
  const final = await h.run();
  assert.deepEqual(final.batches[0].issues, [17, 18]);
  assert.equal(h.counts.plan, 1);
});

test('a new issue cannot duplicate an occupied file scope or reset the existing budget', async () => {
  const existing = batchFor({ issues: [99], phase: 'blocked' });
  const before = clone(existing);
  const h = harness({
    issues: [17],
    queue: [17],
    initialState: { ...blankState(), batches: [existing] },
  });
  const state = await h.run();
  assert.deepEqual(state.batches[0], before);
  assert.equal(state.batches[1].phase, 'blocked');
  assert.match(state.batches[1].reason, /bug-batch-99/);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
  assert.ok(!h.log.includes('workspace.prepare'));
});

test('unjustified separate plans touching the same file fail before any worktree or executor', async () => {
  const h = harness({
    plan: {
      groups: [planFor([17]).groups[0], planFor([18]).groups[0]],
      blocked: [],
    },
  });
  await assert.rejects(h.run(), /shared-file groups must be consolidated/);
  assert.equal(h.counts.execute, 0);
  assert.ok(!h.log.includes('workspace.prepare'));
  assert.equal(h.stateRef.value.pendingTriage.status, 'running');
});

test('revoked or externally owned issues cannot enter collection or be claimed after the window', async () => {
  for (const labels of [['bug'], ['bug', 'codex-run', 'ready-for-qa']]) {
    const h = harness({ issues: [17], queue: [17], triageWindowMs: 120_000 });
    h.gh.viewIssue = async (number) => ({ number, state: 'open', labels });
    const state = await h.run();
    assert.equal(state.triageQueue, undefined);
    assert.equal(h.counts.plan, 0);
    assert.ok(!h.log.some((line) => line.includes('In progress')));
  }
  const h = harness({ issues: [17], queue: [17] });
  const view = h.gh.viewIssue;
  let reads = 0;
  h.gh.viewIssue = async (number) => {
    const issue = await view(number);
    if (++reads === 2) issue.labels = ['bug'];
    return issue;
  };
  await assert.rejects(h.run(), /authorization or ownership changed before claim/);
  assert.equal(h.counts.plan, 0);
  assert.equal(h.counts.execute, 0);
  assert.ok(!h.log.some((line) => line.includes('In progress')));
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
  const batch = batchFor({
    reviews: [{ round: 1, status: 'approved', subjectSha: sha('a') }],
  });
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
    {
      number: 17,
      body: 'Hydrated issue body for #17',
      comment: 'Hydrated comment for #17',
    },
    {
      number: 18,
      body: 'Hydrated issue body for #18',
      comment: 'Hydrated comment for #18',
    },
  ]);
  assert.deepEqual(
    h.hydrated.map((issue) => issue.number),
    [17, 18, 17, 18, 17, 18, 17, 18],
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
      openFeedback(current, {
        comments: [{ id: 999, body: 'New PR request' }],
      }),
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
  const originalFeedback = {
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  batch.feedbackFingerprint = feedbackFingerprint(originalFeedback);
  batch.approvedSha = batch.sha;
  const h = harness({
    issues: [17],
    queue: [17],
    initialState: { schemaVersion: 1, repository: repo, batches: [batch] },
    feedback: ({ batch: current }) =>
      openFeedback(current, {
        comments: [{ id: 222, body: 'Please handle this review note' }],
      }),
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
  const h = harness({
    issues: [17],
    queue: [17],
    checks: [false, false, true],
  });
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
  // #1 collects queue; #2 reserves labels; #3 reserves triage; #4 plan; #5 round 1.
  const h = harness({ issues: [17], queue: [17], failSave: 5 });
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
  assert.equal(h.log.filter((entry) => entry === 'store.save').length, 5);
});

test('actual controller defers pending backend completion to protected confirmation and retries without models, merge or deploy', async () => {
  const batch = reviewedTerminalBatch();
  // This case covers a new merge with an immutable source-bound receipt.
  // Genuine pre-cutover terminal subjects remain covered separately above.
  batch.codexFinalReview = {
    status: 'verified',
    subjectSha: batch.sha,
    claudeRound: batch.reviews.length,
    feedbackFingerprint: batch.feedbackFingerprint,
    nonce: 'synthetic-completed-qa',
    reservedAt: '2026-10-23T00:00:00Z',
  };
  batch.release.prNumber = batch.pr.number;
  batch.release.reviewProof = captureReleaseReviewProof(batch, { repository: repo });
  batch.plan.scope.push('backend/src/routes/patients.ts');
  batch.plan.tasks[0].files.push('backend/src/routes/patients.ts');
  batch.plan.fileMap.forEach((entry) => entry.files.push('backend/src/routes/patients.ts'));
  batch.evidence = batch.plan.evidence.map((entry) => ({
    issue: entry.issue,
    files: {
      screenshot: { path: entry.screenshot, bytes: 16, sha256: '1'.repeat(64) },
      trace: { path: entry.trace, bytes: 17, sha256: '2'.repeat(64) },
    },
  }));
  const railwayRunUrl = 'https://github.com/l2v-hub/ClinicOS/actions/runs/123';
  const proof = {
    receipt: { mergeSha: sha('b') },
    reviewedSha: batch.sha,
    runUrl: railwayRunUrl,
    artifactDigest: `sha256:${'7'.repeat(64)}`,
    receiptSha256: '8'.repeat(64),
  };
  batch.release.deployment.railwayRunUrl = railwayRunUrl;
  batch.release.deployment.demo = proof;
  const h = harness({
    initialState: { ...blankState(), batches: [batch] },
    queue: [],
  });
  const requests = [],
    comments = [],
    closed = new Set();
  let failClose = true;
  const gh = createGitHub({
    repo,
    cwd: '/tmp',
    run: async ({ args, input }) => {
      const route = args[1],
        method = args.includes('-X') ? args[args.indexOf('-X') + 1] : 'GET';
      requests.push({ route, method, body: input ? JSON.parse(input) : null });
      const match = route.match(/\/issues\/(\d+)/);
      const issue = Number(match?.[1]);
      let value = {};
      if (method === 'GET' && /\/issues\/\d+$/.test(route))
        value = { number: issue, state: closed.has(issue) ? 'closed' : 'open' };
      else if (method === 'GET' && route.includes('/comments?'))
        value = [comments.filter((item) => item.issue === issue)];
      else if (method === 'GET' && route.includes('/labels?'))
        value = [[{ name: 'customer-label' }]];
      else if (method === 'POST' && route.endsWith('/comments'))
        comments.push({ issue, body: JSON.parse(input).body });
      else if (method === 'PATCH') {
        if (failClose) {
          failClose = false;
          return { ok: false, code: 1, stdout: '{}', stderr: 'HTTP 503' };
        }
        closed.add(issue);
      }
      return { ok: true, code: 0, stdout: JSON.stringify(value), stderr: '' };
    },
  });
  gh.intake = async () => [];
  gh.discoverQueue = async () => [];
  const controller = () =>
    runPipeline({
      repo,
      event: {},
      gh,
      models: h.models,
      workspace: h.workspace,
      store: h.store,
    });
  const beforeBudget = clone(h.stateRef.value.batches[0].implementation);
  await controller();
  assert.equal(
    requests.length,
    0,
    'The controller must not publish or request protected Railway proof',
  );
  assert.equal(gh.verifyDemoRelease, undefined);
  assert.equal(selectAutoReleaseBatch(h.stateRef.value).id, batch.id);
  const { verifyProductionBackend } = await import('../../src/bug-pipeline/demo-deployment.mjs');
  const productionRun = {
    id: 321,
    run_attempt: 1,
    head_sha: sha('b'),
    head_branch: 'main',
    repository: { full_name: repo },
    head_repository: { full_name: repo },
    path: '.github/workflows/deploy-backend.yml',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
  };
  const productionJob = {
    id: 421,
    run_id: 321,
    run_attempt: 1,
    head_sha: sha('b'),
    name: 'deploy',
    status: 'completed',
    conclusion: 'success',
    steps: [{ name: 'Deploy to Railway', status: 'completed', conclusion: 'success' }],
  };
  const productionResponses = {
    [`actions/workflows/deploy-backend.yml/runs?branch=main&head_sha=${sha('b')}&per_page=100`]: {
      total_count: 1,
      workflow_runs: [productionRun],
    },
    'actions/runs/321': productionRun,
    'actions/runs/321/jobs?filter=latest&per_page=100': {
      total_count: 1,
      jobs: [productionJob],
    },
  };
  const productionReader = {
    async getJson(route) {
      assert.ok(
        Object.hasOwn(productionResponses, route),
        `unexpected synthetic production proof route: ${route}`,
      );
      return clone(productionResponses[route]);
    },
  };
  const protectedGh = {
    ...gh,
    // Synthetic metadata exercises the genuine verifier; this is not a provider deployment.
    verifyProductionBackend: (input) =>
      verifyProductionBackend({ ...input, reader: productionReader }),
    verifyDemoRelease: async () => proof,
    reviewFeedback: async () =>
      openFeedback(batch, {
        number: 81,
        url: batch.pr.url,
        state: 'MERGED',
        mergeCommitSha: sha('b'),
      }),
    requiredChecks: async () => ({
      ok: true,
      details: ['all required checks: SUCCESS'],
    }),
    readFileAtRevision: async (file) =>
      file.endsWith('evidence-manifest.json')
        ? { content: JSON.stringify(batch.evidence) }
        : batch.evidence
            .flatMap((item) => Object.values(item.files))
            .find((item) => item.path === file),
  };
  await assert.rejects(
    recordDeployment({
      repo,
      github: protectedGh,
      store: h.store,
      batchId: batch.id,
      mergeSha: sha('b'),
    }),
    /503/,
  );
  assert.equal(h.stateRef.value.batches[0].release.publication.status, 'pending');
  const mutations = requests.filter((request) => request.method !== 'GET').length;
  await controller();
  assert.equal(requests.filter((request) => request.method !== 'GET').length, mutations);
  const retry = selectAutoReleaseBatch(h.stateRef.value);
  const released = await releaseBatch({
    repo,
    github: protectedGh,
    store: h.store,
    batchId: retry.id,
    reviewedSha: retry.sha,
    execute: true,
  });
  assert.equal(released.status, 'deployed');
  assert.deepEqual(released.deployments, {
    frontend: false,
    backend: false,
    runtime: false,
  });
  await recordDeployment({
    repo,
    github: protectedGh,
    store: h.store,
    batchId: batch.id,
    mergeSha: sha('b'),
  });
  assert.equal(publicationComplete(h.stateRef.value.batches[0]), true);
  assert.equal(selectAutoReleaseBatch(h.stateRef.value), null);
  assert.equal(
    comments.length,
    batch.issues.length,
    'Marker retries do not duplicate prior completion facts',
  );
  assert.deepEqual([...closed].sort(), batch.issues);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.plan, 0);
  assert.equal(h.counts.review, 0);
  assert.deepEqual(h.stateRef.value.batches[0].implementation, beforeBudget);
  assert.equal(h.stateRef.value.batches[0].reviews.length, 1);
  const after = requests.length;
  await controller();
  assert.equal(requests.length, after);
});

const takeoverHandback = (protectedSubjects = []) => ({
  active: true,
  nonce: 'test-takeover',
  automation: {
    enabled: true,
    mode: 'new-unclaimed-only',
    protectedSubjects,
    takeoverNonce: 'test-takeover',
    authorizedActor: 'maintainer',
    handedBackAt: '2026-10-22T00:00:00Z',
  },
});

function ownedStandalone(number = 99, issues = [90]) {
  return {
    kind: 'standalone-pr-review',
    schemaVersion: 1,
    repository: repo,
    id: `standalone-pr-${number}`,
    pr: { number, url: `https://github.com/${repo}/pull/${number}` },
    sha: sha('c'),
    baseSha: sha('b'),
    baseRef: 'main',
    branch: `manual/review-${number}`,
    phase: 'waiting-review',
    issues,
    packet: {
      path: `artifacts/task-validation/standalone-review-${number}`,
      files: Object.fromEntries(
        [
          'task-contract.md',
          'analysis.md',
          'implementation-plan.md',
          'validation-report.md',
          'imported-history.json',
        ].map((p) => [p, '1'.repeat(64)]),
      ),
    },
    sourceManifest: [
      {
        path: 'frontend/src/owned.ts',
        blob: sha('c'),
        mode: '100644',
        baseBlob: sha('b'),
        baseMode: '100644',
      },
    ],
    implementation: [
      {
        round: 1,
        status: 'passed',
        subjectSha: sha('c'),
        evidence: 'validation-report.md',
      },
    ],
    reviews: [],
    reviewReports: {},
    adoption: {
      actor: 'synthetic',
      at: '2026-10-22T00:00:00Z',
      manifestSha256: '2'.repeat(64),
    },
    operatorCoordination: { active: true },
  };
}

test('active takeover pauses before intake or any state/status/model mutation', async () => {
  const state = {
    ...blankState(),
    batches: [batchFor()],
    operatorTakeover: { active: true },
  };
  const h = harness({ initialState: state });
  const result = await h.run();
  assert.deepEqual(result, state);
  assert.deepEqual(h.log, ['store.load']);
  assert.deepEqual(h.stateRef.value, state);
});

test('explicit new-only handback processes a new issue without touching protected batch/manual/standalone subjects', async () => {
  const oldBatch = batchFor({ issues: [71], phase: 'implementing' });
  oldBatch.pr = { number: 171, url: `https://github.com/${repo}/pull/171` };
  oldBatch.implementation = [{ round: 1, status: 'running' }];
  const manual = {
    id: 'manual-owned',
    issues: [72],
    operatorCoordination: { active: true },
    plan: { scope: ['frontend/src/manual.ts'] },
    implementation: [{ round: 1, status: 'running' }],
    reviews: [],
  };
  const standalone = ownedStandalone();
  const state = {
    ...blankState(),
    batches: [oldBatch],
    manualBatches: [manual],
    standaloneReviews: [standalone],
    operatorTakeover: takeoverHandback([{ collection: 'batches', id: oldBatch.id }]),
  };
  const h = harness({
    issues: [17],
    initialState: state,
    queue: [71, 72, 90, 17],
  });
  // Keep the incoming scope separate from every retained owner.
  state.batches[0].plan.scope = ['frontend/src/previous.ts'];
  state.batches[0].plan.tasks[0].files = ['frontend/src/previous.ts'];
  state.batches[0].plan.fileMap = [{ issue: 71, files: ['frontend/src/previous.ts'] }];
  h.stateRef.value = clone(state);
  const result = await h.run();
  assert.deepEqual(result.batches[0], state.batches[0]);
  assert.deepEqual(result.manualBatches, state.manualBatches);
  assert.deepEqual(result.standaloneReviews, state.standaloneReviews);
  assert.equal(h.counts.execute, 1);
  assert.equal(result.batches[1].phase, 'ready');
  assert.ok(
    h.log
      .filter((x) => /gh\.(setIssueStatus|commentIssue):/.test(x))
      .every((x) => !/:(71|72|90)(:|$)/.test(x)),
  );
});

test('manual and standalone frozen scope occupancy blocks an overlapping new plan without changing owners', async () => {
  for (const collection of ['manualBatches', 'standaloneReviews']) {
    const owner =
      collection === 'manualBatches'
        ? {
            id: 'manual',
            issues: [90],
            operatorCoordination: { active: true },
            implementation: [],
            reviews: [],
            sourceManifest: [{ path: planFor([17]).groups[0].scope[0] }],
          }
        : ownedStandalone();
    if (collection === 'standaloneReviews')
      owner.sourceManifest[0].path = planFor([17]).groups[0].scope[0];
    const state = {
      ...blankState(),
      [collection]: [owner],
      operatorTakeover: takeoverHandback(),
    };
    const h = harness({ issues: [17], initialState: state });
    const result = await h.run();
    assert.deepEqual(result[collection], state[collection]);
    assert.equal(result.batches[0].phase, 'blocked');
    assert.match(result.batches[0].reason, /overlaps existing/);
    assert.equal(h.counts.execute, 0);
  }
});

test('claimed terminal manual issue is excluded before intake and queue normalization', async () => {
  const owner = {
    id: 'old-manual',
    issues: [17],
    release: { status: 'deployed' },
    implementation: [],
    reviews: [],
  };
  const state = { ...blankState(), manualBatches: [owner] };
  const h = harness({ issues: [17], initialState: state });
  h.gh.intake = async () => assert.fail('claimed event cannot normalize labels');
  h.gh.discoverQueue = async (options) => {
    assert.deepEqual(options, { normalize: true, excludeIssues: [17] });
    return [];
  };
  const result = await h.run({ issue: { number: 17 } });
  assert.deepEqual(result, state);
  assert.equal(h.counts.plan, 0);
});

test('a CAS-reconciled takeover stops before the next model and never diagnoses or restarts the old claim', async () => {
  const state = { ...blankState(), operatorTakeover: takeoverHandback() };
  const h = harness({ issues: [17], initialState: state });
  const original = h.store.save;
  h.store.save = async (value, options) => {
    const merged = clone(value);
    merged.operatorTakeover.automation.enabled = false;
    await options.rebaseIndependentSubjects(merged);
    return original(value);
  };
  await assert.rejects(h.run(), /Automatic ownership changed/);
  assert.equal(h.counts.plan, 0);
  assert.deepEqual(h.stateRef.value, state);
});

test('CAS ownership acquired on the current batch rejects its pending reservation before execution', async () => {
  const h = harness({ issues: [17], initialState: blankState() });
  const save = h.store.save;
  let remoteOwned;
  h.store.save = async (value, options) => {
    if (value.batches[0]?.phase === 'implementing') {
      remoteOwned = clone(h.stateRef.value);
      remoteOwned.batches[0].operatorCoordination = {
        active: true,
        owner: 'synthetic-operator',
      };
      h.stateRef.value = clone(remoteOwned);
      const merged = clone(value);
      merged.batches[0].operatorCoordination = clone(remoteOwned.batches[0].operatorCoordination);
      await options.rebaseIndependentSubjects(merged);
      assert.fail('owned correction reservation must not persist');
    }
    return save(value);
  };
  const result = await h.run();
  assert.deepEqual(result, remoteOwned);
  assert.equal(h.counts.execute, 0);
  assert.deepEqual(h.stateRef.value, remoteOwned);
  assert.equal(remoteOwned.batches[0].implementation.length, 0);
});

test('successful triage CAS handover prevents issue status writes before the later model boundary', async () => {
  for (const boundary of ['queue', 'claiming']) {
    const h = harness({
      issues: [17],
      initialState: { ...blankState(), operatorTakeover: takeoverHandback() },
    });
    const owner = {
      id: 'manual-race',
      issues: [17],
      implementation: [],
      reviews: [],
      operatorCoordination: { active: true },
    };
    const save = h.store.save;
    let injected = false;
    h.store.save = async (value, options) => {
      const target =
        boundary === 'queue'
          ? Boolean(value.triageQueue)
          : value.pendingTriage?.status === 'claiming';
      if (!injected && target) {
        injected = true;
        const merged = clone(value);
        merged.manualBatches = [clone(owner)];
        await options.rebaseIndependentSubjects(merged);
        Object.assign(value, clone(merged));
      }
      return save(value);
    };
    await assert.rejects(h.run(), /another durable owner/);
    assert.equal(h.counts.plan, 0);
    assert.equal(h.log.filter((x) => x.startsWith('gh.setIssueStatus:17:')).length, 0);
    assert.deepEqual(h.stateRef.value.manualBatches, [owner]);
    assert.equal(h.stateRef.value.batches.length, 0);
  }
});

test('Claude1 F4 takeover during QA prevents every later internal publication path', async () => {
  for (const mode of ['initial', 'pr-feedback', 'review-correction']) {
    const b = batchFor({ issues: [17], phase: 'waiting-checks' });
    b.feedbackFingerprint = feedbackFingerprint(openFeedback(b));
    const h = harness({
      issues: [17],
      queue: [],
      initialState: mode === 'initial' ? blankState() : { ...blankState(), batches: [b] },
      reviews:
        mode === 'review-correction'
          ? [{ verdict: 'changes-requested', summary: 'fix', findings: [{}] }]
          : [],
    });
    if (mode === 'initial') h.gh.discoverQueue = async () => [17];
    if (mode === 'pr-feedback')
      h.gh.reviewFeedback = async () =>
        openFeedback(b, { comments: [{ id: 1, body: 'Fix state', user: { login: 'human' } }] });
    let observed = false,
      frozen,
      after = [];
    h.workspace.qa = async () => {
      frozen = clone(h.stateRef.value.batches[0]);
      h.stateRef.value.operatorTakeover = { active: true, nonce: 'new-takeover' };
      observed = true;
      return { status: 'verified' };
    };
    for (const name of ['publish', 'checkpoint'])
      h.workspace[name] = async () => {
        if (observed) after.push(name);
        return sha('b');
      };
    for (const name of ['commentIssue', 'commentPR', 'setIssueStatus', 'createDraft']) {
      const old = h.gh[name];
      h.gh[name] = async (...args) => {
        if (observed) after.push(name);
        return old(...args);
      };
    }
    const result = await h.run();
    assert.equal(observed, true, mode);
    assert.deepEqual(after, [], mode);
    assert.deepEqual(result.batches[0], frozen, mode);
    assert.deepEqual(h.stateRef.value.batches[0], frozen, mode);
  }
});

test('Claude1 F5 actual native409 partial handback skips A and completes B without overwriting A', async (t) => {
  for (const mechanism of ['handback', 'subject'])
    await t.test(mechanism, async () => {
      const a = batchFor({ issues: [17], phase: 'waiting-checks' }),
        b = batchFor({ issues: [18], phase: 'waiting-checks' });
      b.pr = { number: 82, url: 'https://github.com/l2v-hub/ClinicOS/pull/82' };
      for (const batch of [a, b])
        batch.feedbackFingerprint = feedbackFingerprint(openFeedback(batch));
      const h = harness({
        issues: [17, 18],
        queue: [],
        initialState: { ...blankState(), batches: [a, b] },
      });
      let canonical = clone(h.stateRef.value),
        injected = false,
        frozenA,
        puts = 0;
      const { createHash } = await import('node:crypto');
      const metadata = () => {
        const bytes = Buffer.from(JSON.stringify(canonical));
        return {
          type: 'file',
          encoding: 'base64',
          size: bytes.length,
          content: bytes.toString('base64'),
          sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
        };
      };
      const response = (value, extra = {}) => ({
        ok: true,
        code: 0,
        stdout: JSON.stringify(value),
        stderr: '',
        ...extra,
      });
      const native = createGitHub({
        cwd: '/tmp',
        repo,
        run: async ({ args, input }) => {
          if (args[1].includes('/git/ref/heads/')) return response({ object: { sha: sha('a') } });
          if (args.includes('PUT')) {
            puts++;
            const body = JSON.parse(input);
            const intended = JSON.parse(Buffer.from(body.content, 'base64'));
            if (!injected && intended.batches[0].reviews.some((r) => r.status === 'running')) {
              injected = true;
              if (mechanism === 'subject') {
                canonical.batches[0].operatorCoordination = { active: true, owner: 'maintainer' };
                canonical.batches[0].operatorNote = 'Remote owner data must survive exactly';
              }
              frozenA = clone(canonical.batches[0]);
              canonical.operatorTakeover = {
                active: true,
                nonce: 'takeover-1',
                automation: {
                  enabled: true,
                  mode: 'new-unclaimed-only',
                  takeoverNonce: 'takeover-1',
                  authorizedActor: 'maintainer',
                  handedBackAt: '2026-10-22T00:00:00Z',
                  protectedSubjects: [{ collection: 'batches', id: a.id }],
                },
              };
            }
            if (body.sha !== metadata().sha)
              return response({}, { ok: false, code: 1, stderr: 'HTTP 409 conflict' });
            canonical = intended;
            return response({ content: { sha: metadata().sha } });
          }
          if (args[1].includes('/contents/.codex-bug-state.json')) return response(metadata());
          assert.fail('unexpected native fixture request ' + args[1]);
        },
      }).createStateStore();
      h.store.load = () => native.load();
      h.store.observe = () => native.observe();
      h.store.save = (...args) => native.save(...args);
      h.gh.reviewFeedback = async (number) =>
        openFeedback(canonical.batches.find((x) => x.pr.number === number));
      h.gh.commentPR = async () => {};
      h.gh.requiredChecks = async () => ({ ok: true });
      const reviewed = [];
      h.workspace.review = async (batch) => {
        reviewed.push(batch.id);
        return {
          subject_sha: batch.sha,
          verdict: 'approved',
          summary: 'Synthetic approval',
          findings: [],
        };
      };
      const result = await h.run();
      assert.equal(injected, true);
      assert.ok(puts >= 2);
      assert.deepEqual(canonical.batches[0], frozenA);
      assert.deepEqual(result.batches[0], frozenA);
      assert.deepEqual(reviewed, [b.id]);
      assert.equal(result.batches[1].phase, 'ready');
      assert.equal(
        h.log.some((x) => x === 'gh.setIssueStatus:17:Bloccato'),
        false,
      );
    });
});

test('Claude1 F1 stale canonical handback pauses before intake, selection or any mutation', async () => {
  const state = { ...blankState(), operatorTakeover: takeoverHandback() };
  state.operatorTakeover.nonce = 'next-takeover';
  const h = harness({ initialState: state });
  assert.deepEqual(await h.run(), state);
  assert.deepEqual(h.log, ['store.load']);
  assert.equal(h.counts.plan, 0);
});

test('QA6-F1 invalid active types never reach intake or discovery; legitimate inactive/audit states do', async () => {
  for (const active of ['true', 'false', '', 0, 1, null, [], {}]) {
    const takeover = takeoverHandback();
    takeover.active = active;
    const h = harness({ initialState: { ...blankState(), operatorTakeover: takeover }, queue: [] });
    await assert.rejects(h.run(), /invalid operator takeover/);
    assert.deepEqual(h.log, ['store.load']);
    assert.equal(h.counts.plan, 0);
  }
  for (const takeover of [{ active: false }, { nonce: 'legacy-budget-audit' }]) {
    const h = harness({ initialState: { ...blankState(), operatorTakeover: takeover }, queue: [] });
    await h.run();
    assert.ok(h.log.includes('gh.intake'));
    assert.ok(h.log.includes('gh.discoverQueue'));
    assert.equal(h.counts.plan, 0);
  }
});

test('F5 draftReady proxy rechecks takeover before its GitHub effect', async () => {
  const make = () => {
    const batch = batchFor({ issues: [17], phase: 'waiting-review' });
    const h = harness({
      issues: [17],
      queue: [],
      initialState: { ...blankState(), batches: [batch] },
    });
    let calls = 0;
    h.gh.draftReady = async () => {
      calls += 1;
      h.log.push('gh.draftReady');
    };
    return { h, batch, calls: () => calls };
  };

  const taken = make();
  let owned;
  taken.h.gh.reviewFeedback = async function () {
    taken.h.stateRef.value.batches[0].operatorCoordination = { active: true };
    taken.h.stateRef.value.batches[0].remoteNote = 'preserve operator data';
    taken.h.stateRef.value.operatorTakeover = takeoverHandback([
      { collection: 'batches', id: taken.batch.id },
    ]);
    owned = clone(taken.h.stateRef.value.batches[0]);
    return this.draftReady(taken.batch.pr.number);
  };
  await taken.h.run().catch(() => {});
  assert.equal(taken.calls(), 0, 'owned draft must not call the real draftReady effect');
  assert.deepEqual(taken.h.stateRef.value.batches[0], owned);

  const free = make();
  free.h.gh.reviewFeedback = async function () {
    return this.draftReady(free.batch.pr.number);
  };
  await free.h.run();
  assert.equal(free.calls(), 1, 'unowned eligible draft still reaches draftReady');
});

test('QA6-F5 external ownership exception refreshes canonical A before independent B disposition', async () => {
  const a = batchFor({ issues: [17], phase: 'waiting-review' }),
    b = batchFor({ issues: [18], phase: 'waiting-review' });
  a.externalReview = { status: 'published', subjectSha: a.sha };
  b.externalReview = { status: 'published', subjectSha: b.sha };
  const h = harness({
    issues: [17, 18],
    queue: [],
    initialState: { ...blankState(), batches: [a, b] },
  });
  h.gh.createStateStore = () => h.store;
  let frozenA, afterOwnership;
  h.gh.viewIssue = async (number) => {
    if (number === 17) {
      h.stateRef.value.batches[0].operatorCoordination = { active: true };
      h.stateRef.value.batches[0].remoteNote = 'preserve operator data';
      h.stateRef.value.operatorTakeover = takeoverHandback([{ collection: 'batches', id: a.id }]);
      frozenA = clone(h.stateRef.value.batches[0]);
      afterOwnership = h.log.length;
      throw Object.assign(new Error('observed ownership loss'), { code: 'review-operator-owned' });
    }
    assert.equal(number, 18);
    return { state: 'closed' };
  };
  const result = await h.run({ action: 'test' }, 'external');
  assert.deepEqual(result.batches[0], frozenA);
  assert.deepEqual(h.stateRef.value.batches[0], frozenA);
  assert.equal(
    result.batches[1].phase,
    'blocked',
    'closed B is independently reconciled rather than aborted',
  );
  assert.match(result.batches[1].reason, /Source issue was closed/);
  assert.equal(
    h.log
      .slice(afterOwnership)
      .some((x) => x.startsWith('gh.commentIssue:17') || x.startsWith('gh.setIssueStatus:17:')),
    false,
  );
  assert.equal(h.counts.execute, 0);
});

test('Author7 F3 observation failure before execute pauses the same unstarted attempt without model work', async () => {
  const h = harness({ issues: [17] });
  let failed = false;
  h.store.observe = async () => {
    if (!failed && h.stateRef.value?.batches[0]?.phase === 'implementing') {
      failed = true;
      throw Object.assign(new Error('synthetic timeout'), {
        code: 'github-read-transient',
        operation: 'read',
        retryable: true,
        diagnostic: 'timeout',
      });
    }
    return clone(h.stateRef.value);
  };
  await h.run();
  assert.equal(failed, true);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.stateRef.value.batches[0].implementation.length, 1);
  assert.equal(h.stateRef.value.batches[0].implementation[0].status, 'running');
  assert.equal(h.stateRef.value.batches[0].failureCode, 'github-read-transient');
});

test('Author7 F4 ownership acquired while diagnosing a real failure preserves A and still reviews B', async () => {
  const a = batchFor({ issues: [17], phase: 'waiting-checks' }),
    b = batchFor({ issues: [18], phase: 'waiting-checks' });
  b.pr = { number: 82, url: 'https://github.com/l2v-hub/ClinicOS/pull/82' };
  for (const batch of [a, b]) batch.feedbackFingerprint = feedbackFingerprint(openFeedback(batch));
  const h = harness({
    issues: [17, 18],
    queue: [],
    initialState: { ...blankState(), batches: [a, b] },
  });
  let failed = false,
    frozen;
  h.workspace.prepare = async (batch) => {
    if (batch.id === a.id) {
      failed = true;
      throw new Error('genuine preparation failure');
    }
  };
  h.store.observe = async () => {
    if (failed && !frozen) {
      h.stateRef.value.batches[0].operatorCoordination = { active: true };
      h.stateRef.value.batches[0].remoteNote = 'owner';
      h.stateRef.value.operatorTakeover = takeoverHandback([{ collection: 'batches', id: a.id }]);
      frozen = clone(h.stateRef.value.batches[0]);
    }
    return clone(h.stateRef.value);
  };
  h.gh.reviewFeedback = async (n) =>
    openFeedback(h.stateRef.value.batches.find((x) => x.pr.number === n));
  h.gh.commentPR = async () => {};
  h.gh.requiredChecks = async () => ({ ok: true });
  const reviewed = [];
  h.workspace.review = async (batch) => {
    reviewed.push(batch.id);
    return { subject_sha: batch.sha, verdict: 'approved', summary: 'fixture', findings: [] };
  };
  const result = await h.run();
  assert.deepEqual(result.batches[0], frozen);
  assert.deepEqual(h.stateRef.value.batches[0], frozen);
  assert.deepEqual(reviewed, [b.id]);
  assert.equal(result.batches[1].phase, 'ready');
});

test('Author7 F3 pre-invocation unknown read transport pauses without pretending transient or retrying code', async () => {
  const h = harness({ issues: [17] });
  let failed = false;
  h.store.observe = async () => {
    if (!failed && h.stateRef.value?.batches[0]?.phase === 'implementing') {
      failed = true;
      throw Object.assign(Error('Sanitized unknown transport'), {
        code: 'github-read-failed',
        operation: 'read',
        diagnostic: 'unknown',
      });
    }
    return clone(h.stateRef.value);
  };
  await h.run();
  const b = h.stateRef.value.batches[0];
  assert.equal(h.counts.execute, 0);
  assert.equal(b.implementation.length, 1);
  assert.equal(b.implementation[0].status, 'running');
  assert.equal(b.failureCode, 'github-read-failed');
  assert.equal(b.phase, 'blocked');
});
test('Author7 F3 authentication refusal before model is fatal and never starts four code attempts', async () => {
  const h = harness({ issues: [17] });
  let failed = false;
  h.store.observe = async () => {
    if (!failed && h.stateRef.value?.batches[0]?.phase === 'implementing') {
      failed = true;
      throw Object.assign(Error('Sanitized auth refusal'), {
        code: 'github-read-rejected',
        operation: 'read',
        httpStatus: 403,
      });
    }
    return clone(h.stateRef.value);
  };
  await h.run();
  const b = h.stateRef.value.batches[0];
  assert.equal(h.counts.execute, 0);
  assert.equal(b.implementation.length, 1);
  assert.equal(b.phase, 'blocked');
  assert.equal(b.controllerProgress.resumeAuthorization, undefined);
  assert.equal(b.failureCode, 'github-read-rejected');
});

test('Author7 F3 malformed authenticated state is fatal before model and cannot consume repeated code attempts', async () => {
  const h = harness({ issues: [17] });
  let failed = false;
  h.store.observe = async () => {
    if (!failed && h.stateRef.value?.batches[0]?.phase === 'implementing') {
      failed = true;
      return { ...clone(h.stateRef.value), schemaVersion: 99 };
    }
    return clone(h.stateRef.value);
  };
  await h.run();
  const b = h.stateRef.value.batches[0];
  assert.equal(h.counts.execute, 0);
  assert.equal(b.implementation.length, 1);
  assert.equal(b.phase, 'blocked');
  assert.equal(b.controllerProgress.resumeAuthorization, undefined);
});

test('Author7 F2 a durable native merge reservation is terminal to implementation while receipt reconciliation remains separate', async () => {
  const b = batchFor({ issues: [17], phase: 'publishing' });
  b.implementation = [{ round: 1, status: 'running' }];
  b.release = {
    status: 'merging',
    reviewedSha: b.sha,
    prNumber: b.pr.number,
    nonce: 'actual-uncertain-merge',
  };
  const original = clone(b),
    h = harness({ issues: [17], queue: [], initialState: { ...blankState(), batches: [b] } });
  await h.run();
  assert.deepEqual(h.stateRef.value.batches[0], original);
  assert.equal(h.counts.execute, 0);
  assert.equal(h.counts.review, 0);
  assert.ok(!h.log.includes('workspace.prepare'));
});

test('Author7 F3 completed internal feedback stages resume only the unstarted publication after final save observation fails', async () => {
  const b = batchFor({
    issues: [17],
    phase: 'waiting-checks',
    head: sha('b'),
    reviews: [{ round: 1, status: 'approved', subjectSha: sha('b') }],
  });
  b.feedbackFingerprint = feedbackFingerprint(openFeedback(b));
  const h = harness({
    issues: [17],
    queue: [],
    initialState: { ...blankState(), batches: [b] },
    feedback: ({ batch }) =>
      openFeedback(batch, { comments: [{ id: 1, body: 'Actual new note' }] }),
  });
  h.workspace.captureCheckpoint = async () => ({
    schemaVersion: 1,
    output: 'exact-synthetic-controller-output',
  });
  h.workspace.resume = async (_batch, checkpoint) =>
    assert.equal(checkpoint.output, 'exact-synthetic-controller-output');
  let failed = false;
  h.store.observe = async () => {
    const current = h.stateRef.value.batches[0];
    if (!failed && current.controllerProgress?.next === 7) {
      failed = true;
      throw Object.assign(Error('Sanitized final-save timeout'), {
        code: 'github-read-transient',
        operation: 'read',
      });
    }
    return clone(h.stateRef.value);
  };
  await h.run();
  let current = h.stateRef.value.batches[0];
  assert.equal(failed, true);
  assert.equal(current.phase, 'blocked');
  assert.equal(current.controllerProgress.status, 'interrupted');
  assert.equal(h.counts.execute, 1);
  assert.equal(h.counts.simplify, 1);
  const { authorizeObservationResume } =
    await import('../../src/bug-pipeline/operator-authorization.mjs');
  await authorizeObservationResume({
    state: h.stateRef.value,
    subject: current,
    actor: 'maintainer',
    reference: 'test:internal-complete',
    reason: 'Retained exact boundary checkpoint',
    verifier: async ({ binding }) => ({
      provenance: 'user-session',
      grantId: 'test:grant',
      consumptionNonce: 'test:internal-final-save',
      sourceRef: 'test:host',
      binding,
    }),
  });
  await h.run();
  current = h.stateRef.value.batches[0];
  assert.equal(
    current.phase,
    'ready',
    JSON.stringify({
      reason: current.reason,
      code: current.failureCode,
      progress: current.controllerProgress,
      log: h.log,
    }),
  );
  assert.equal(h.counts.execute, 1);
  assert.equal(h.counts.simplify, 1);
  assert.equal(current.controllerProgress.status, 'completed');
});

for (const code of ['model-execution-failed', 'model-result-invalid', undefined])
  test(`Author9 F2 initial unknown ${code ?? 'throw'} keeps one running attempt without automatic inference retry`, async () => {
    const h = harness({ issues: [17] });
    let execute = 0;
    h.workspace.execute = async () => {
      execute++;
      throw Object.assign(new Error('Unknown paid work'), code ? { code } : {});
    };
    await h.run();
    const current = h.stateRef.value.batches[0];
    assert.equal(execute, 1);
    assert.equal(current.implementation.length, 1);
    assert.equal(current.implementation[0].status, 'running');
    assert.equal(current.controllerProgress.status, 'running');
    assert.equal(current.phase, 'blocked');
    await h.run();
    assert.equal(execute, 1);
    assert.equal(h.stateRef.value.batches[0].implementation.length, 1);
  });

for (const format of ['legacy', 'reserved', 'missing-reservation'])
  test(`Author9 F2 ${format} internal observation resume retains exact paid-work identity`, async () => {
    const { authorizeObservationResume, observationProgressDigest } =
      await import('../../src/bug-pipeline/operator-authorization.mjs');
    const b = batchFor({
      issues: [17],
      phase: 'blocked',
      head: sha('b'),
      reviews: [{ round: 1, status: 'approved', subjectSha: sha('b') }],
    });
    const feedback = openFeedback(b, { comments: [{ id: 9, body: 'Retained feedback' }] });
    b.feedbackFingerprint = feedbackFingerprint(openFeedback(b));
    if (format !== 'legacy') b.implementation.push({ round: 2, status: 'running' });
    b.controllerProgress = {
      schemaVersion: 1,
      flow: 'pr-feedback',
      round: format === 'missing-reservation' ? 3 : 2,
      ...(format === 'legacy'
        ? {}
        : { implementationRound: format === 'missing-reservation' ? 3 : 2 }),
      sourceSha: b.sha,
      planSha256: sha256(JSON.stringify(b.plan)),
      feedbackSha256: sha256(JSON.stringify(feedback)),
      feedback,
      status: 'interrupted',
      next: 1,
      completed: [{ step: 'execute' }],
      checkpoint: { exact: 'retained' },
    };
    b.controllerInterruption = {
      code: 'ownership-observation-failed',
      beforeInvocation: true,
      progressSha256: observationProgressDigest(b.controllerProgress),
    };
    const h = harness({
      issues: [17],
      queue: [],
      initialState: { ...blankState(), batches: [b] },
      feedback: ({ batch }) => ({ ...feedback, head: batch.sha }),
    });
    h.workspace.resume = async (_batch, checkpoint) => assert.equal(checkpoint.exact, 'retained');
    h.workspace.captureCheckpoint = async () => ({ exact: 'retained' });
    const before = clone(h.stateRef.value.batches[0].implementation);
    await authorizeObservationResume({
      state: h.stateRef.value,
      subject: h.stateRef.value.batches[0],
      actor: 'maintainer',
      reference: 'test:author9-resume',
      reason: 'Retain exact paid work',
      verifier: async ({ binding }) => ({
        provenance: 'user-session',
        grantId: 'test:author9',
        sourceRef: 'test:session',
        consumptionNonce: `test:${format}`,
        binding,
      }),
    });
    await h.run();
    const current = h.stateRef.value.batches[0];
    assert.equal(h.counts.execute, 0, 'The completed paid executor is never replayed');
    assert.equal(current.implementation.length, before.length);
    if (format === 'missing-reservation') {
      assert.equal(current.phase, 'blocked');
      assert.deepEqual(current.implementation, before);
      assert.equal(current.controllerProgress.status, 'interrupted');
      assert.equal(h.counts.simplify, 0);
    } else {
      assert.equal(current.phase, 'ready');
      assert.equal(current.controllerProgress.status, 'completed');
      assert.equal(h.counts.simplify, 1);
      if (format === 'legacy') assert.deepEqual(current.implementation, before);
      else assert.equal(current.implementation[1].status, 'passed');
    }
  });

function adaptivePlanForTest() {
  const plan = planFor([17]);
  return {
    plan,
    workGraphs: [
      {
        issues: [17],
        nodes: [
          {
            id: 'filter',
            title: 'Correct the filter',
            issues: [17],
            taskIndexes: [0],
            criteriaRefs: [{ issue: 17, index: 0 }],
            dependsOn: [],
            scope: [...plan.groups[0].scope],
            readFiles: [],
            difficulty: 'low',
            risk: { level: 'low', reason: 'Synthetic bounded formatter' },
            coupling: { level: 'isolated', reason: 'One scoped file' },
            conflictKeys: [],
            routePreference: 'auto',
            verificationIndexes: [0, 1],
            summary: 'Implement the accepted filter task',
          },
        ],
      },
    ],
  };
}

test('adaptive intake actually requests the wrapper and durably binds hydrated sources without changing the legacy plan wire format', async () => {
  const response = adaptivePlanForTest();
  const h = harness({
    issues: [17],
    plan: response,
    adaptiveWorkItems: { enabled: true, maxParallel: 1 },
    executeResults: [
      async (batch, options) => {
        assert.equal(options.phase, 'implementation');
        assert.equal(options.implementationRound, 1);
        assert.equal(validateWorkItems(batch).policy.maxParallel, 1);
        assert.equal(batch.plan.workItems, undefined);
        assert.equal(batch.plan.fileMap, undefined);
        assert.ok(h.stateRef.value.batches[0].workItems);
        assert.equal(typeof options.effects.mutate, 'function');
        let saved = false;
        await options.effects.mutate((canonical) => {
          assert.equal(canonical, batch);
          saved = true;
        });
        assert.equal(saved, true);
        assert.equal(options.effects.getBatch(), batch);
        return { status: 'implemented', summary: 'Synthetic pipeline caller' };
      },
    ],
  });
  const state = await h.run();
  assert.equal(h.counts.plan, 1);
  assert.equal(h.counts.execute, 1);
  assert.equal(h.counts.verify, 2);
  assert.equal(h.counts.simplify, 1);
  assert.equal(state.batches[0].workItems.sourceIssues.length, 1);
  const source = h.hydrated.find((issue) => issue.number === 17);
  assert.equal(
    state.batches[0].workItems.sourceIssues[0].bodyAndCommentsSha256,
    sha256(
      JSON.stringify({
        number: 17,
        title: source.title,
        body: source.body,
        comments: source.comments,
      }),
    ),
  );
});

test('actual pipeline adaptive effects poison queued mutations after uncertain persistence without replaying execution', async () => {
  let mutationCount = 0,
    inferenceCount = 0;
  const h = harness({
    issues: [17],
    plan: adaptivePlanForTest(),
    adaptiveWorkItems: { enabled: true, maxParallel: 2 },
    executeResults: [
      async (_batch, options) => {
        inferenceCount++;
        h.store.save = async () => {
          throw new Error('synthetic unknown graph CAS');
        };
        const one = options.effects.mutate(() => {
          mutationCount++;
        });
        const two = options.effects.mutate(() => {
          mutationCount++;
        });
        const results = await Promise.allSettled([one, two]);
        assert.deepEqual(
          results.map((result) => result.status),
          ['rejected', 'rejected'],
        );
        assert.equal(mutationCount, 1);
        await assert.rejects(options.effects.assertOwnership(), /synthetic unknown graph CAS/);
        throw results[0].reason;
      },
    ],
  });
  await assert.rejects(h.run(), /synthetic unknown graph CAS/);
  assert.equal(inferenceCount, 1);
  assert.equal(h.counts.simplify, 0);
  assert.equal(h.counts.review, 0);
  assert(!h.log.includes('workspace.publish'));
});
