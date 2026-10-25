#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spentAttempts, attemptLimit, historyDigest } from './attempt-budget.mjs';
import path from 'node:path';
import os from 'node:os';
import { readFile, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub, controllerFailureCode, stateError } from './github.mjs';
import { createCommentReviewHandoff } from './comment-review-handoff.mjs';
import { createIssueReviewCommunication } from './issue-review-communication.mjs';
import { externalReport } from './external-review.mjs';
import { createStandaloneReview } from './standalone-review.mjs';
import { createModels } from './models.mjs';
import { createWorkspace } from './workspace.mjs';
import { STANDALONE_INFRASTRUCTURE_FILES } from './cli.mjs';

export function handoffErrorDiagnostic(error) {
  const pr = Number.isSafeInteger(error.pr) && error.pr > 0 ? error.pr : null;
  return {
    code: controllerFailureCode(error),
    persisted: typeof error.persisted === 'boolean' ? error.persisted : 'unconfirmed',
    projection: ['request-comment-failed', 'report-publication-failed'].includes(error.projection)
      ? error.projection : undefined,
    next: pr ? `node agent-team/src/bug-pipeline/review-handoff-cli.mjs reconcile --pr ${pr}`
      : 'Inspect durable owner status before retrying',
  };
}

export async function finalizeEnvironment(env) {
  const existingHome = path.join(env.HOME || env.USERPROFILE || os.homedir(), '.codex');
  const existingConfig = await lstat(existingHome).catch((error) =>
    error.code === 'ENOENT' ? null : Promise.reject(error),
  );
  if (env.CODEX_API_KEY)
    throw stateError(
      'codex-auth-conflict',
      'Finalize requires existing Codex subscription authentication; remove CODEX_API_KEY',
    );
  env = {
    ...env,
    ...(env.CODEX_HOME || !existingConfig?.isDirectory() ? {} : { CODEX_HOME: existingHome }),
  };
  if (!env.CODEX_HOME || !(await lstat(env.CODEX_HOME).catch(() => null))?.isDirectory())
    throw stateError(
      'codex-auth-unavailable',
      'Existing Codex authentication directory is required',
    );
  return env;
}

export async function main({
  args = process.argv.slice(2),
  env = process.env,
  dependencies = {},
} = {}) {
  const [command, ...options] = args;
  assert.ok(
    [
      'status',
      'adopt',
      'request',
      'claim',
      'submit',
      'reconcile',
      'finalize',
      'recover',
      'extend-budget',
    ].includes(command),
    'Unknown handoff command',
  );
  assert.ok(options.includes('--pr'), 'Specify --pr');
  const pr = Number(options[options.indexOf('--pr') + 1]);
  assert.ok(Number.isSafeInteger(pr) && pr > 0);
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  if (command === 'finalize') env = await finalizeEnvironment(env);
  const runtimeRoot = path.join(os.tmpdir(), 'clinicos-comment-review-controller');
  const run =
    dependencies.run ??
    createRunner({
      env,
      runtimeRoot,
    });
  const github = dependencies.github ?? createGitHub({ cwd, repo: 'l2v-hub/ClinicOS', run });
  const normal = createCommentReviewHandoff({ github, run, cwd, authorizationVerifier: dependencies.authorizationVerifier });
  const standalone = createStandaloneReview({ github, run, cwd, authorizationVerifier: dependencies.authorizationVerifier });
  await normal.actor();
  const state = await github.createStateStore().load();
  const isStandalone =
    command === 'adopt' || state?.standaloneReviews?.some((item) => item.pr?.number === pr);
  const handoff = isStandalone ? standalone : normal;
  const perform = async () => {
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
    } else if (command === 'recover' || command === 'extend-budget') {
      const option = (name) => {
        assert.ok(options.includes(name), `Specify ${name}`);
        return options[options.indexOf(name) + 1];
      };
      batch =
        command === 'recover'
          ? await handoff.recover(pr, {
              action: option('--action'),
              expectedSha: option('--sha'),
              token: option('--token'),
              round: options.includes('--round') ? Number(option('--round')) : undefined,
              reason: option('--reason'),
              forceLive: options.includes('--force-live'),
              authorizationRef: options.includes('--authorization') ? option('--authorization') : undefined,
            })
          : await handoff.extendBudget(pr, {
              kind: option('--kind'),
              limit: Number(option('--limit')),
              authorizationRef: option('--authorization'),
              reason: option('--reason'),
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
      batch = await handoff.request(pr, { recoverFailed: options.includes('--recover-failed'),
        authorizationRef: options.includes('--authorization') ? options[options.indexOf('--authorization') + 1] : undefined });
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
    if (!['status', 'finalize', 'recover', 'extend-budget'].includes(command)) {
      const communication = isStandalone
        ? standalone
        : createIssueReviewCommunication({
            github,
            cwd,
            run,
            readReport: externalReport,
          });
      try {
        await communication.publishState(batch);
      } catch (error) {
        console.error(
          JSON.stringify({
            code: 'label-projection-failed',
            persisted: true,
            projection: 'failed',
            causeCode: controllerFailureCode(error),
            pr,
            next: `node agent-team/src/bug-pipeline/review-handoff-cli.mjs reconcile --pr ${pr}`,
          }),
        );
        return 1;
      }
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
        implementation: spentAttempts(batch, 'implementation'),
        legacyImplementation: batch.implementation.length,
        implementationLimit: attemptLimit(batch, 'implementation'),
        reviewLimit: attemptLimit(batch, 'reviews'),
        handoff: batch.externalReview,
        baseSha: batch.baseSha,
        packet: batch.packet?.path ?? `artifacts/task-validation/${batch.id}`,
        sourceManifest: batch.sourceManifest,
        releaseHold: batch.releaseHold,
        codexFinalReview: batch.codexFinalReview,
        release: batch.release,
        recoveryTokens: {
          implementation:
            (batch.controllerProgress?.status === 'running' ||
              (batch.controllerProgress?.status === 'failed' &&
                batch.controllerProgress.failureCode === 'implementation-recovery-settled'))
              ? {
                  token: historyDigest(batch.controllerProgress),
                  round: batch.controllerProgress.round,
                }
              : null,
          qa: batch.codexFinalReview
            ? (batch.codexFinalReview.nonce ?? historyDigest(batch.codexFinalReview))
            : null,
          merge: batch.release ? (batch.release.nonce ?? historyDigest(batch.release)) : null,
          resume: historyDigest({ phase: batch.phase, failureCode: batch.failureCode ?? null }),
        },
        failureCode: batch.failureCode,
        ...(command === 'finalize' ? { authMode: 'existing-codex-auth' } : {}),
      }),
    );
    return command === 'finalize' && batch.phase === 'blocked' ? 1 : 0;
  };
  return isStandalone ? standalone.operation(perform) : perform();
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(JSON.stringify(handoffErrorDiagnostic(error)));
    process.exitCode = 1;
  }
}
