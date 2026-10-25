import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_TARGET,
  DEMO_SOURCE_POLICIES,
  verifyDemoPreflight,
} from '../qa-source6/agent-team/src/bug-pipeline/demo-deployment.mjs';
import { createGitHub } from '../qa-source6/agent-team/src/bug-pipeline/github.mjs';
import {
  releaseBatch,
  selectAutoReleaseBatch,
  publicationComplete,
  recordDeployment,
  ReleaseGateError,
  publishDeploymentCompletion,
  recoverExactRelease,
} from '../qa-source6/agent-team/src/bug-pipeline/release.mjs';
import { feedbackFingerprint, sha256 } from '../qa-source6/agent-team/src/bug-pipeline/contracts.mjs';

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
      tasks: [
        {
          title: 'Render rows',
          files: [scope[0]],
          steps: ['Update component'],
        },
      ],
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
      rounds: [
        {
          round: 1,
          subject_sha: sha,
          verdict: 'approved',
          review_sha256: sha256(report),
        },
      ],
    },
    feedbackFingerprint: feedbackFingerprint(feedback),
  };
  const state = {
    schemaVersion: 1,
    repository: 'l2v-hub/ClinicOS',
    batches: [batch],
  };
  let saved = state;
  const calls = [];
  const github = {
    async setIssueStatus(number, status) {
      calls.push(['status', number, status]);
    },
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
  return {
    batch,
    feedback,
    state,
    github,
    store,
    calls,
    getSaved: () => saved,
  };
}

const configured = { botToken: true, vercel: true, railway: true };

export {fixture};
