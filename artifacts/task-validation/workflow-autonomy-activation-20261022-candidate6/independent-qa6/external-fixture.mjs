import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { externalReviewStep as actualExternalReviewStep } from '../qa-source6/agent-team/src/bug-pipeline/external-review.mjs';
import {
  reviewExternalBatch as actualReviewExternalBatch,
  claudeFailureCode,
} from '../qa-source6/agent-team/src/bug-pipeline/claude-review-cron.mjs';
import { runProcess } from '../qa-source6/agent-team/src/adapters/process-runner.mjs';
import { feedbackFingerprint, sha256 } from '../qa-source6/agent-team/src/bug-pipeline/contracts.mjs';
import { doctor } from '../qa-source6/agent-team/src/bug-pipeline/cli.mjs';

const communication = {
  publishState: async () => {},
  mirrorFeedback: async () => {},
};
const externalReviewStep = (args) => actualExternalReviewStep({ communication, ...args });
const reviewExternalBatch = (args) => actualReviewExternalBatch({ communication, ...args });

const repo = 'l2v-hub/ClinicOS';
const sha = 'a'.repeat(40);
function batchFixture() {
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    phase: 'waiting-checks',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [],
    sha,
    pr: { number: 81, url: `https://github.com/${repo}/pull/81` },
    plan: {
      title: 'Fix filter',
      feature: 'Filter',
      rationale: 'One regression',
      execution: { difficulty: 'low', mode: 'direct', reason: 'Bounded' },
      analysis: 'Filter hides a row',
      issues: [17],
      scope: ['feature.ts'],
      acceptance: [{ issue: 17, criteria: ['Rows visible'] }],
      tasks: [{ title: 'Fix', files: ['feature.ts'], steps: ['Fix filter'] }],
      verification: [
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        { command: 'node', args: ['--test', 'filter.test.mjs'] },
      ],
      evidence: [
        {
          issue: 17,
          screenshot: 'artifacts/task-validation/bug-batch-17/evidence/17.png',
          trace: 'artifacts/task-validation/bug-batch-17/evidence/17.zip',
          video: '',
        },
      ],
    },
  };
  return batch;
}
function feedback(batch) {
  return {
    state: 'OPEN',
    isDraft: false,
    head: batch.sha,
    headRef: batch.branch,
    headRepo: repo,
    headIsFork: false,
    baseRef: 'main',
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
}

function approvedExternalArgs() {
  const batch = batchFixture();
  const raw = JSON.stringify({
    subject_sha: batch.sha,
    verdict: 'approved',
    summary: 'Synthetic review',
    findings: [],
  });
  batch.reviews = [{ round: 1, status: 'approved', subjectSha: batch.sha }];
  batch.reviewReports = { 'claude-review-1.json': raw };
  batch.reviewLedger = {
    rounds: [
      {
        round: 1,
        verdict: 'approved',
        subject_sha: batch.sha,
        review_sha256: sha256(raw),
      },
    ],
  };
  batch.externalReview = {
    status: 'published',
    subjectSha: batch.sha,
    feedbackFingerprint: feedbackFingerprint(feedback(batch)),
    feedbackChanged: false,
  };
  const log = [];
  const args = {
    repo,
    batch,
    gh: {
      viewIssue: async () => ({ state: 'open' }),
      reviewFeedback: async () => feedback(batch),
      requiredChecks: async () => ({ ok: true }),
    },
    workspace: {
      prepare: async () => log.push('prepare'),
      finalQa: async () => {
        assert.equal(batch.codexFinalReview.status, 'running');
        assert.equal(
          batch.codexFinalReview.feedbackFingerprint,
          batch.externalReview.feedbackFingerprint,
        );
        assert.ok(log.includes('save:running'), 'durable reservation must precede fresh inference');
        log.push('qa');
        return { status: 'verified', summary: 'Independent final QA' };
      },
    },
    save: async () => log.push(`save:${batch.codexFinalReview?.status}`),
    report: async () => {},
    block: async (_, reason) => {
      batch.phase = 'blocked';
      batch.reason = reason;
      batch.approvedSha = null;
      log.push('blocked');
    },
  };
  return { args, batch, log };
}

export {approvedExternalArgs};
