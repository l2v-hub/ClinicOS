#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { readFile, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub } from './github.mjs';
import { createCommentReviewHandoff } from './comment-review-handoff.mjs';
import { createIssueReviewCommunication } from './issue-review-communication.mjs';
import { externalReport } from './external-review.mjs';

export async function main({ args = process.argv.slice(2), env = process.env } = {}) {
  const [command, ...options] = args;
  assert.ok(
    ['status', 'request', 'claim', 'submit', 'reconcile'].includes(command),
    'Unknown handoff command',
  );
  assert.ok(options.includes('--pr'), 'Specify --pr');
  const pr = Number(options[options.indexOf('--pr') + 1]);
  assert.ok(Number.isSafeInteger(pr) && pr > 0);
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const run = createRunner({
    env,
    runtimeRoot: path.join(os.tmpdir(), 'clinicos-comment-review-controller'),
  });
  const github = createGitHub({ cwd, repo: 'l2v-hub/ClinicOS', run });
  const handoff = createCommentReviewHandoff({ github, run, cwd });
  let batch;
  if (command === 'request')
    batch = await handoff.request(pr, { recoverFailed: options.includes('--recover-failed') });
  else if (command === 'claim') batch = await handoff.claim(pr);
  else if (command === 'submit') {
    assert.ok(options.includes('--report'), 'Specify --report');
    const file = options[options.indexOf('--report') + 1];
    const info = await lstat(file);
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.size <= 60000, 'Invalid report file');
    await handoff.submit(pr, JSON.parse(await readFile(file, 'utf8')));
    batch = await handoff.reconcilePR(pr);
  } else if (command === 'reconcile') batch = await handoff.reconcilePR(pr);
  else {
    await handoff.actor();
    batch = (await handoff.load(pr)).batch;
  }
  if (command !== 'status') {
    const communication = createIssueReviewCommunication({
      github,
      cwd,
      run,
      readReport: externalReport,
    });
    await communication.publishState(batch);
  }
  console.log(
    JSON.stringify({
      pr,
      batch: batch.id,
      sha: batch.sha,
      phase: batch.phase,
      issues: batch.issues,
      reviews: batch.reviews.length,
      implementation: batch.implementation.length,
      handoff: batch.externalReview,
      baseSha: batch.baseSha,
      packet: `artifacts/task-validation/${batch.id}`,
    }),
  );
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch {
    console.error(
      'GitHub review handoff failed: subject, authorization, report or ledger could not be verified. No approval or budget reset.',
    );
    process.exitCode = 1;
  }
}
