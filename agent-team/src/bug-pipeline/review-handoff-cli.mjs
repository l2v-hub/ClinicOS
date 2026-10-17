#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { readFile, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub, controllerFailureCode } from './github.mjs';
import { createCommentReviewHandoff } from './comment-review-handoff.mjs';
import { createIssueReviewCommunication } from './issue-review-communication.mjs';
import { externalReport } from './external-review.mjs';
import { createStandaloneReview } from './standalone-review.mjs';
import { createModels } from './models.mjs';
import { createWorkspace } from './workspace.mjs';
import { STANDALONE_INFRASTRUCTURE_FILES } from './cli.mjs';

export async function main({
  args = process.argv.slice(2),
  env = process.env,
  dependencies = {},
} = {}) {
  const [command, ...options] = args;
  assert.ok(
    ['status', 'adopt', 'request', 'claim', 'submit', 'reconcile', 'finalize'].includes(command),
    'Unknown handoff command',
  );
  assert.ok(options.includes('--pr'), 'Specify --pr');
  const pr = Number(options[options.indexOf('--pr') + 1]);
  assert.ok(Number.isSafeInteger(pr) && pr > 0);
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  if (command === 'finalize') {
    const existingHome = path.join(env.HOME || env.USERPROFILE || os.homedir(), '.codex');
    const existingConfig = await lstat(existingHome).catch((error) =>
      error.code === 'ENOENT' ? null : Promise.reject(error),
    );
    env = {
      ...env,
      ...(env.CODEX_HOME || !existingConfig?.isDirectory() ? {} : { CODEX_HOME: existingHome }),
      CODEX_API_KEY: env.CODEX_API_KEY || env.CLINICOS_OPENAI_API_KEY,
    };
  }
  const runtimeRoot = path.join(os.tmpdir(), 'clinicos-comment-review-controller');
  const run =
    dependencies.run ??
    createRunner({
      env,
      runtimeRoot,
    });
  const github = dependencies.github ?? createGitHub({ cwd, repo: 'l2v-hub/ClinicOS', run });
  const normal = createCommentReviewHandoff({ github, run, cwd });
  const standalone = createStandaloneReview({ github, run, cwd });
  await normal.actor();
  const state = await github.createStateStore().load();
  const isStandalone =
    command === 'adopt' || state?.standaloneReviews?.some((item) => item.pr?.number === pr);
  const handoff = isStandalone ? standalone : normal;
  let batch;
  if (command === 'finalize') {
    assert.ok(isStandalone, 'Finalize supports explicitly adopted standalone subjects only');
    const models =
      dependencies.models ??
      createModels({
        plannerModel: env.CODEX_PLANNER_MODEL || env.CLINICOS_PLANNER_MODEL || 'gpt-6.1-sol',
        run,
        runtimeRoot,
      });
    const workspace =
      dependencies.workspace ??
      createWorkspace({ root: cwd, repo: 'l2v-hub/ClinicOS', run, models });
    batch = await standalone.finalize(pr, {
      workspace,
      infrastructureFiles: STANDALONE_INFRASTRUCTURE_FILES,
    });
  } else if (command === 'adopt') {
    assert.ok(options.includes('--manifest'), 'Specify --manifest');
    const file = options[options.indexOf('--manifest') + 1];
    const info = await lstat(file);
    assert.ok(
      info.isFile() && !info.isSymbolicLink() && info.size <= 512000,
      'Invalid adoption manifest',
    );
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(manifest.pr?.number, pr, 'Manifest PR mismatch');
    batch = await standalone.adopt(manifest);
  } else if (command === 'request')
    batch = await handoff.request(pr, { recoverFailed: options.includes('--recover-failed') });
  else if (command === 'claim') batch = await handoff.claim(pr);
  else if (command === 'submit') {
    assert.ok(options.includes('--report'), 'Specify --report');
    const file = options[options.indexOf('--report') + 1];
    const info = await lstat(file);
    assert.ok(
      info.isFile() && !info.isSymbolicLink() && info.size <= (isStandalone ? 512000 : 60000),
      'Invalid report file',
    );
    await handoff.submit(pr, JSON.parse(await readFile(file, 'utf8')));
    batch = await handoff.reconcilePR(pr);
  } else if (command === 'reconcile') batch = await handoff.reconcilePR(pr);
  else {
    await handoff.actor();
    batch = (await handoff.load(pr)).batch;
  }
  if (!['status', 'finalize'].includes(command)) {
    const communication = isStandalone
      ? standalone
      : createIssueReviewCommunication({
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
      kind: batch.kind ?? 'bug-batch',
      batch: batch.id,
      sha: batch.sha,
      phase: batch.phase,
      issues: batch.issues,
      reviews: batch.reviews.length,
      implementation: batch.implementation.length,
      handoff: batch.externalReview,
      baseSha: batch.baseSha,
      packet: batch.packet?.path ?? `artifacts/task-validation/${batch.id}`,
      sourceManifest: batch.sourceManifest,
      releaseHold: batch.releaseHold,
      codexFinalReview: batch.codexFinalReview,
      release: batch.release,
      failureCode: batch.failureCode,
    }),
  );
  return command === 'finalize' && batch.phase === 'blocked' ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(
      `GitHub review handoff failed (${controllerFailureCode(error)}): subject, authorization, report or ledger could not be verified. No approval or budget reset.`,
    );
    process.exitCode = 1;
  }
}
