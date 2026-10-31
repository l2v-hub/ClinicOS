#!/usr/bin/env node
// Trusted-main, explicit-dispatch transport only. Never a queue/new-round path.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRunner } from './process.mjs';
import { createGitHub } from './github.mjs';
import { createCloudReviewRecovery } from './cloud-review-recovery.mjs';
import {
  createReviewSourceReader,
  probeCloudClaude,
  prepareCloudInference,
  CLOUD_REVIEW_REPO,
} from './cloud-review-worker.mjs';
import { claudeFailureCode } from './claude-review-cron.mjs';
import { validateReview } from '../../../scripts/quality-gate/claude-bug-review.mjs';
import { communicationText } from './issue-review-communication.mjs';

export function recoverySelector(env) {
  const integer = (value) => {
    assert.match(value ?? '', /^[1-9][0-9]{0,8}$/);
    const number = Number(value);
    assert.ok(Number.isSafeInteger(number));
    return number;
  };
  assert.match(env.CLOUD_RECOVERY_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.CLOUD_RECOVERY_REQUEST_NONCE ?? '', /^[A-Za-z0-9._:-]{1,200}$/);
  return {
    pr: integer(env.CLOUD_RECOVERY_PR),
    sha: env.CLOUD_RECOVERY_SHA,
    round: integer(env.CLOUD_RECOVERY_ROUND),
    requestNonce: env.CLOUD_RECOVERY_REQUEST_NONCE,
  };
}

export async function processRecovery({
  github,
  run,
  cwd,
  env,
  selector,
  actor,
  runId,
  controller = createCloudReviewRecovery({ github }),
  retrieve,
  probe = probeCloudClaude,
}) {
  assert.equal(await github.authorizedMaintainer(actor), true, 'Maintainer dispatch required');
  assert.match(String(runId), /^[1-9][0-9]{0,19}$/);
  // Preparation verifies a separate consumed execution capability. The user's
  // earlier request record alone cannot enable a provider call.
  const prepared = await controller.prepare(selector);
  const reader =
    retrieve ??
    createReviewSourceReader({
      run,
      cwd,
      feedbackReader: github.reviewFeedback,
      recoveryPlan: prepared.subject.canonicalRecoveryPlan,
    });
  const source = await reader(structuredClone(prepared.subject));
  const qualified = await probe({ env, run, cwd });
  const inference = prepareCloudInference({
    packet: source.packet,
    sha: selector.sha,
    profile: qualified.profile,
  });
  const claim = await controller.claim(selector, {
    expectedFingerprint: prepared.fingerprint,
    actor,
    runId: String(runId),
  });
  let review;
  try {
    const outcome = await run({
      command: 'claude',
      args: inference.args,
      input: inference.input,
      cwd,
      envMode: 'review',
      timeoutMs: 20 * 60000,
      maxOutputBytes: 256 * 1024,
    });
    const failure = claudeFailureCode(outcome);
    assert.equal(failure, null, 'Recovery provider did not return a review');
    const validated = validateReview(
      JSON.parse(outcome.stdout).structured_output,
      selector.sha,
      source.tracked,
    );
    review = validateReview(
      {
        ...validated,
        summary: communicationText(validated.summary),
        findings: validated.findings.map((item) => ({
          ...item,
          ...Object.fromEntries(
            ['problem', 'requested_change', 'test_expectation'].map((key) => [
              key,
              communicationText(item[key]),
            ]),
          ),
        })),
      },
      selector.sha,
      source.tracked,
    );
  } catch {
    await controller.fail(claim, 'claude-recovery-provider-failed');
    return {
      status: 'provider-failed',
      pr: selector.pr,
      sha: selector.sha,
      round: selector.round,
      providerExecuted: true,
      claimed: true,
      newRound: false,
    };
  }
  // A genuine report must survive any uncertainty during storage/publication.
  // Do not turn it into a failed provider claim or perform inference again.
  try {
    await controller.retain(claim, review, { tracked: source.tracked });
    const published = await controller.publish(claim);
    return {
      status: 'published',
      pr: selector.pr,
      sha: selector.sha,
      round: selector.round,
      verdict: published.report.verdict,
      reportSha256: published.reportSha256,
      reviewId: published.reviewId,
      reviewUrl: published.reviewUrl,
      providerExecuted: true,
      claimed: true,
      newRound: false,
    };
  } catch {
    return {
      status: 'publication-uncertain',
      pr: selector.pr,
      sha: selector.sha,
      round: selector.round,
      providerExecuted: true,
      claimed: true,
      newRound: false,
      reportSha256: createHash('sha256').update(JSON.stringify(review)).digest('hex'),
      report: review,
    };
  }
}

export async function main({ env = process.env } = {}) {
  assert.equal(env.GITHUB_REPOSITORY, CLOUD_REVIEW_REPO);
  assert.equal(env.GITHUB_ACTIONS, 'true');
  assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.equal(
    env.GITHUB_EVENT_NAME,
    'workflow_dispatch',
    'Recovery is never scheduled/label-triggered',
  );
  assert.ok(
    env.GH_TOKEN && env.CLAUDE_CODE_OAUTH_TOKEN,
    'Subscription/controller credentials required',
  );
  const selector = recoverySelector(env);
  const runtime = await mkdtemp(path.join(os.tmpdir(), 'clinicos-cloud-recovery-'));
  const cwd = path.join(runtime, 'empty');
  await mkdir(cwd, { mode: 0o700 });
  const isolated = { ...env, CLAUDE_REVIEW_AUTH_MODE: 'subscription' };
  for (const name of [
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'OPENAI_API_KEY',
    'CODEX_API_KEY',
    'CLINICOS_CLAUDE_CONFIG_DIR',
    'ANTHROPIC_BASE_URL',
    'CLAUDE_CODE_USE_BEDROCK',
    'CLAUDE_CODE_USE_VERTEX',
    'CLAUDE_CODE_USE_FOUNDRY',
  ])
    delete isolated[name];
  const run = createRunner({ env: isolated, runtimeRoot: runtime });
  const github = createGitHub({ cwd, repo: CLOUD_REVIEW_REPO, run });
  try {
    return await processRecovery({
      github,
      run,
      cwd,
      env: isolated,
      selector,
      actor: env.GITHUB_ACTOR,
      runId: env.GITHUB_RUN_ID,
    });
  } finally {
    assert.equal(path.dirname(path.resolve(runtime)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(runtime).startsWith('clinicos-cloud-recovery-'));
    await rm(runtime, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.deepEqual(process.argv.slice(2), ['--recover']);
    const result = await main();
    console.log(JSON.stringify(result));
    if (result.status !== 'published') process.exitCode = 1;
  } catch {
    console.error(
      'Cloud recovery blocked; preserve the existing round and inspect exact capability, source, ownership and finite receipt.',
    );
    process.exitCode = 1;
  }
}
