import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../qa-source7/agent-team/src/bug-pipeline/pipeline.mjs';
import { createGitHub } from '../qa-source7/agent-team/src/bug-pipeline/github.mjs';
import {
  recordDeployment,
  releaseBatch,
  selectAutoReleaseBatch,
  publicationComplete,
} from '../qa-source7/agent-team/src/bug-pipeline/release.mjs';
import { feedbackFingerprint, planSchema, sha256 } from '../qa-source7/agent-team/src/bug-pipeline/contracts.mjs';

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

export {batchFor};
