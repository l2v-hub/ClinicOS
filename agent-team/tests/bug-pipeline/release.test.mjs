import test from 'node:test';
import assert from 'node:assert/strict';
import {
  releaseBatch,
  recordDeployment,
  ReleaseGateError,
} from '../../src/bug-pipeline/release.mjs';
import { feedbackFingerprint, sha256 } from '../../src/bug-pipeline/contracts.mjs';

const sha = 'a'.repeat(40);
const mergeSha = 'b'.repeat(40);
const screenshotPath = 'artifacts/task-validation/bug-batch-5/evidence/issue-5.png';
const tracePath = 'artifacts/task-validation/bug-batch-5/evidence/issue-5.zip';
const screenshot = { path: screenshotPath, sha256: '1'.repeat(64), bytes: 16 };
const trace = { path: tracePath, sha256: '2'.repeat(64), bytes: 17 };
const recorded = [{ issue: 5, files: { screenshot, trace } }];
const report = JSON.stringify({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'The implementation meets the accepted plan.',
  findings: [],
});

function fixture(scope = ['frontend/src/Patient.jsx']) {
  const feedback = {
    number: 9,
    url: 'https://github.com/l2v-hub/ClinicOS/pull/9',
    state: 'OPEN',
    head: sha,
    headRef: 'codex/bug-batch-5',
    headRepo: 'l2v-hub/ClinicOS',
    headIsFork: false,
    baseRef: 'main',
    isDraft: false,
    mergeCommitSha: null,
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const batch = {
    id: 'bug-batch-5',
    branch: 'codex/bug-batch-5',
    issues: [5],
    plan: {
      title: 'Fix patient list display',
      feature: 'Patient list',
      rationale: 'The list hides rows.',
      execution: {
        difficulty: 'low',
        mode: 'delegate',
        reason: 'Bounded, independently testable change.',
      },
      analysis: 'Patient rows should be visible.',
      issues: [5],
      scope,
      acceptance: [{ issue: 5, criteria: ['Rows render'] }],
      tasks: [{ title: 'Render rows', files: [scope[0]], steps: ['Update component'] }],
      verification: [
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        { command: 'node', args: ['--test', 'patient.test.mjs'] },
      ],
      evidence: [{ issue: 5, screenshot: screenshotPath, trace: tracePath, video: '' }],
    },
    phase: 'ready',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [{ round: 1, status: 'approved', subjectSha: sha }],
    sha,
    approvedSha: sha,
    pr: { number: 9, url: feedback.url },
    evidence: recorded,
    reviewReports: { 'claude-review-1.json': report },
    reviewLedger: {
      rounds: [{ round: 1, subject_sha: sha, verdict: 'approved', review_sha256: sha256(report) }],
    },
    feedbackFingerprint: feedbackFingerprint(feedback),
  };
  const state = { schemaVersion: 1, repository: 'l2v-hub/ClinicOS', batches: [batch] };
  let saved = state;
  const calls = [];
  const github = {
    async viewIssue(number) {
      return { number, state: 'open', comments: [] };
    },
    async reviewFeedback() {
      return structuredClone(feedback);
    },
    async requiredChecks() {
      return { ok: true, details: ['build: SUCCESS'] };
    },
    async readFileAtRevision(file) {
      calls.push(['read', file]);
      if (file.endsWith('evidence-manifest.json')) return { content: JSON.stringify(recorded) };
      if (file === screenshotPath) return screenshot;
      if (file === tracePath) return trace;
      throw new Error(`Unexpected evidence path ${file}`);
    },
    async draftReady() {
      calls.push(['ready']);
    },
    async mergePullRequest(number, subject) {
      calls.push(['merge', number, subject]);
      return { mergeSha, reviewedSha: subject };
    },
    async commentIssue(number, body) {
      calls.push(['comment', number, body]);
    },
  };
  const store = {
    async load() {
      return structuredClone(saved);
    },
    async save(value) {
      calls.push(['save']);
      saved = structuredClone(value);
    },
  };
  return { batch, feedback, state, github, store, calls, getSaved: () => saved };
}

const configured = { botToken: true, vercel: true, railway: true };

test('release dry-run verifies persisted proof and never merges', async () => {
  const f = fixture();
  const result = await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
  });
  assert.equal(result.status, 'ready-to-release');
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
});

test('release execution rechecks then merges only the approved exact SHA', async () => {
  const f = fixture();
  const result = await releaseBatch({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    reviewedSha: sha,
    configured,
    execute: true,
  });
  assert.equal(result.status, 'merged');
  assert.deepEqual(
    f.calls.filter(([call]) => call === 'merge'),
    [['merge', 9, sha]],
  );
  assert.equal(f.getSaved().batches[0].release.mergeSha, mergeSha);
});

test('release blocks stale SHA, missing review proof, and absent required deployment credentials', async (t) => {
  for (const [label, mutate, env] of [
    [
      'stale SHA',
      (f) => {
        f.batch.approvedSha = 'c'.repeat(40);
      },
      configured,
    ],
    [
      'review report digest',
      (f) => {
        f.batch.reviewReports['claude-review-1.json'] = '{}';
      },
      configured,
    ],
    ['missing Vercel config', () => {}, { ...configured, vercel: false }],
    [
      'missing Railway config for runtime',
      (f) => {
        f.batch.plan.scope = ['clinicos-ai-runtime/main.py'];
        f.batch.plan.tasks[0].files = ['clinicos-ai-runtime/main.py'];
      },
      { ...configured, railway: false },
    ],
    [
      'pending checks',
      (f) => {
        f.github.requiredChecks = async () => ({ ok: false, details: ['build: pending'] });
      },
      configured,
    ],
    [
      'fork PR',
      (f) => {
        f.github.reviewFeedback = async () => ({ ...f.feedback, headIsFork: true });
      },
      configured,
    ],
  ]) {
    await t.test(label, async () => {
      const f = fixture();
      mutate(f);
      await assert.rejects(
        () =>
          releaseBatch({
            repo: f.state.repository,
            github: f.github,
            store: f.store,
            batchId: f.batch.id,
            reviewedSha: sha,
            configured: env,
          }),
        ReleaseGateError,
      );
      assert.equal(
        f.calls.some(([call]) => call === 'merge'),
        false,
      );
    });
  }
});

test('release blocks changed evidence digest before mutation', async () => {
  const f = fixture();
  f.github.readFileAtRevision = async (file) =>
    file.endsWith('evidence-manifest.json')
      ? { content: JSON.stringify(recorded) }
      : { sha256: 'f'.repeat(64), bytes: file === screenshotPath ? 16 : 17 };
  await assert.rejects(
    () =>
      releaseBatch({
        repo: f.state.repository,
        github: f.github,
        store: f.store,
        batchId: f.batch.id,
        reviewedSha: sha,
        configured,
      }),
    /digest mismatch/,
  );
  assert.equal(
    f.calls.some(([call]) => call === 'merge'),
    false,
  );
});

test('deployment recording validates the merge, posts true deployment links, and leaves issues open', async () => {
  const f = fixture();
  f.batch.release = {
    status: 'merged',
    reviewedSha: sha,
    mergeSha,
    prNumber: 9,
    deployments: { frontend: true, backend: false },
  };
  f.store.load = async () => structuredClone(f.state);
  f.store.save = async (value) => {
    f.state.batches[0] = structuredClone(value.batches[0]);
  };
  const result = await recordDeployment({
    repo: f.state.repository,
    github: f.github,
    store: f.store,
    batchId: f.batch.id,
    mergeSha,
    vercelUrl: 'https://clinicos-eosin.vercel.app',
  });
  assert.equal(result.status, 'deployed');
  const comment = f.calls.find(([call]) => call === 'comment');
  assert.match(comment[2], /clinicos-eosin\.vercel\.app/);
  assert.match(comment[2], /resta aperta/);
});
