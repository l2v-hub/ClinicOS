#!/usr/bin/env node
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub } from './github.mjs';
import { validateState } from './contracts.mjs';
import { externalReport } from './external-review.mjs';
import { createIssueReviewCommunication } from './issue-review-communication.mjs';

const FILE = fileURLToPath(import.meta.url);
const REPO = 'l2v-hub/ClinicOS';

export async function syncIssueReviews({ github, communication }) {
  const state = await github.createStateStore().load();
  if (!state) return { status: 'empty', batches: [] };
  validateState(state, REPO);
  const results = [];
  for (const batch of state.batches) {
    if (!batch.pr || !batch.sha || ['merged', 'deployed'].includes(batch.release?.status)) continue;
    try {
      const feedback = await communication.mirrorFeedback(batch);
      const projection = await communication.publishState(batch);
      results.push({ id: batch.id, status: 'synced', ...feedback, ...projection });
    } catch {
      // Never log provider output, feedback text or patient information.
      results.push({ id: batch.id, status: 'blocked' });
    }
  }
  return {
    status: results.some((item) => item.status === 'blocked') ? 'partial' : 'synced',
    batches: results,
  };
}

export async function main({ env = process.env } = {}) {
  assert.equal(env.GITHUB_REPOSITORY, REPO);
  assert.equal(env.GITHUB_ACTIONS, 'true');
  assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Issue-review sync requires trusted main');
  assert.ok(
    ['workflow_dispatch', 'schedule', 'workflow_run'].includes(env.GITHUB_EVENT_NAME),
    'Issue-review sync event is not trusted',
  );
  assert.ok(env.GH_TOKEN, 'CLINICOS_BOT_TOKEN is required for issue events');
  const cwd = path.resolve(path.dirname(FILE), '../../..');
  const run = createRunner({
    env,
    runtimeRoot: path.join(os.tmpdir(), 'clinicos-issue-review-sync'),
  });
  const github = createGitHub({ cwd, repo: REPO, run });
  const communication = createIssueReviewCommunication({
    github,
    cwd,
    run,
    readReport: externalReport,
  });
  const result = await syncIssueReviews({ github, communication });
  console.log(JSON.stringify(result));
  return result.status === 'partial' ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  try {
    process.exitCode = await main();
  } catch {
    console.error(
      'Issue-review sync blocked: verify the trusted workflow, GitHub permissions and durable subjects. No review or budget was restarted.',
    );
    process.exitCode = 1;
  }
}
