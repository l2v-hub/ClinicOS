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
import { operatorOwns } from './operator-ownership.mjs';

const FILE = fileURLToPath(import.meta.url);
const REPO = 'l2v-hub/ClinicOS';

export async function syncIssueReviews({ github, communication }) {
  const state = await github.createStateStore().load();
  if (!state) return { status: 'empty', batches: [] };
  validateState(state, REPO);
  const results = [];
  const subjects = ['batches', 'standaloneReviews'].flatMap((collection) =>
    (state[collection] ?? []).map((batch) => ({ collection, batch })),
  );
  const ids = new Set(),
    prs = new Set();
  for (const { batch } of subjects) {
    assert.ok(
      !ids.has(batch.id) && (!batch.pr || !prs.has(batch.pr.number)),
      'Duplicate durable review subject',
    );
    ids.add(batch.id);
    if (batch.pr) prs.add(batch.pr.number);
  }
  for (const { collection, batch } of subjects) {
    if (!batch.pr || !batch.sha || ['merged', 'deployed'].includes(batch.release?.status)) continue;
    if (operatorOwns(state, collection, batch)) {
      results.push({ id: batch.id, status: 'skipped', reason: 'operator-owned' });
      continue;
    }
    try {
      const feedback =
        collection === 'batches'
          ? await communication.mirrorFeedback(batch, { automatic: true })
          : {};
      const projection = await communication.publishState(batch, { collection, automatic: true });
      results.push({ id: batch.id, status: 'synced', ...feedback, ...projection });
    } catch (error) {
      if (error?.code === 'review-operator-owned') {
        results.push({ id: batch.id, status: 'skipped', reason: 'operator-owned' });
        continue;
      }
      if (error?.code === 'review-subject-closed') {
        results.push({ id: batch.id, status: 'skipped', reason: 'closed' });
        continue;
      }
      // Never log provider output, feedback text or patient information.
      results.push({ id: batch.id, status: 'blocked' });
    }
  }
  return {
    status: results.some((item) => item.status === 'blocked')
      ? 'partial'
      : results.some((item) => item.reason === 'operator-owned') &&
          !results.some((item) => item.status === 'synced')
        ? 'skipped'
        : 'synced',
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
