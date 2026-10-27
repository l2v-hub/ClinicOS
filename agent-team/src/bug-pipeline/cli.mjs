#!/usr/bin/env node
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spentAttempts } from './attempt-budget.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRunner } from './process.mjs';
import { createGitHub, controllerFailureCode } from './github.mjs';
import { createModels } from './models.mjs';
import { createWorkspace, knownTerminalFailure } from './workspace.mjs';
import { exportFailedCode } from './failed-output-export.mjs';
import { runPipeline } from './pipeline.mjs';
import { requiresHumanReview } from './review-policy.mjs';
import { createStandaloneReview } from './standalone-review.mjs';

// Trusted reviewed-main policy. Neither PR manifests nor environment flags can add files.
export const STANDALONE_INFRASTRUCTURE_FILES = Object.freeze(
  [
    'agent-team/tests/bug-pipeline/models.test.mjs',
    'agent-team/tests/bug-pipeline/standalone-review-contracts.test.mjs',
    'agent-team/tests/bug-pipeline/standalone-review.test.mjs',
    'agent-team/tests/bug-pipeline/workspace.test.mjs',
    'agent-team/tests/bug-pipeline/github.test.mjs',
    'docs/claude-local-review-prompt.md',
    'docs/standalone-pr-review.md',
  ].filter((file) => !requiresHumanReview(file)),
);

export async function exportKnownFailedOutputs({ state, workspace, outputRoot }) {
  const exports = [];
  for (const batch of (state?.batches ?? []).filter(
    (b) => b.controllerProgress?.status === 'failed',
  )) {
    if (!knownTerminalFailure(batch)) {
      exports.push({ batchId: batch.id, status: 'flow-not-eligible' });
      continue;
    }
    try {
      const manifest = await exportFailedCode({ batch, workspace, outputRoot });
      exports.push({
        batchId: batch.id,
        status: 'local-export-created',
        checkpointSha256: manifest.checkpointSha256,
        files: manifest.files.length,
      });
    } catch (error) {
      const status = /already exists/.test(error.message)
        ? 'local-export-already-exists'
        : /Exact known terminal failure required/.test(error.message)
          ? 'flow-not-eligible'
          : 'guard-refused-or-output-unavailable';
      exports.push({ batchId: batch.id, status });
    }
  }
  return exports;
}

export async function retainFailedOutputsAfterControllerError({ observe, exportFailures }) {
  try {
    const state = await observe();
    return { failedOutputExports: await exportFailures(state) };
  } catch (error) {
    return {
      failedOutputExports: [
        { status: 'retention-failed', failureCode: controllerFailureCode(error) },
      ],
    };
  }
}

export async function writeBlockedControllerDiagnostic({
  diagnosticRoot,
  error,
  observe,
  exportFailures,
  modelDiagnostics = [],
  verificationDiagnostics = [],
}) {
  const { failedOutputExports } = await retainFailedOutputsAfterControllerError({
    observe,
    exportFailures,
  });
  const diagnostic = {
    status: 'blocked-controller',
    failureCode: controllerFailureCode(error),
    failedOutputExports,
    modelDiagnostics,
    verificationDiagnostics: verificationDiagnostics.slice(-64),
    reason:
      'Inspect GitHub permissions, durable state and pending triage; no automatic budget reset.',
  };
  await writeFile(
    path.join(diagnosticRoot, 'diagnostic.json'),
    JSON.stringify(diagnostic, null, 2) + '\n',
  );
  return diagnostic;
}

export async function doctor({ run, models, env = process.env, cwd }) {
  const codex = await models.preflight();
  const login = env.CODEX_API_KEY
    ? { ok: true }
    : await run({ command: 'codex', args: ['login', 'status'], cwd, envMode: 'model' });
  const external = env.BUG_PIPELINE_REVIEW_MODE === 'external';
  const claude = external
    ? null
    : await run({ command: 'claude', args: ['auth', 'status'], cwd, envMode: 'review' });
  let claudeAuth = false;
  try {
    claudeAuth = external || (claude.ok && JSON.parse(claude.stdout).loggedIn === true);
  } catch {
    /* missing auth */
  }
  const sandbox = await run({
    command: 'codex',
    args: [
      'sandbox',
      '--permission-profile',
      ':workspace',
      '--cd',
      cwd,
      '--',
      'node',
      '-e',
      'require("node:fs").writeSync(1, "sandbox-ready")',
    ],
    cwd,
    envMode: 'verification',
  });
  const checks = {
    codexCli: codex.ready,
    codexAuth: login.ok,
    ...(external ? { externalReviewer: true } : { claudeAuth }),
    sandbox: sandbox.ok && sandbox.stdout === 'sandbox-ready',
    plannerModel: Boolean(env.CODEX_PLANNER_MODEL),
    executorModel: Boolean(env.CODEX_EXECUTOR_MODEL),
  };
  return { checks, ready: Object.values(checks).every(Boolean) };
}
export async function main({ env = process.env, args = process.argv.slice(2) } = {}) {
  // Cloud secret targets cannot use reserved CODEX_/OPENAI_ names. Only process-local aliases.
  env = {
    ...env,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || env.CLINICOS_ANTHROPIC_API_KEY,
    CODEX_PLANNER_MODEL: env.CODEX_PLANNER_MODEL || env.CLINICOS_PLANNER_MODEL || 'gpt-6.1-sol',
    CODEX_EXECUTOR_MODEL: env.CODEX_EXECUTOR_MODEL || env.CLINICOS_EXECUTOR_MODEL || 'auto',
    CODEX_SMALL_EXECUTOR_MODEL:
      env.CODEX_SMALL_EXECUTOR_MODEL || env.CLINICOS_SMALL_EXECUTOR_MODEL || 'gpt-6-luna',
    BUG_PIPELINE_REVIEW_MODE: env.BUG_PIPELINE_REVIEW_MODE || 'external',
  };
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const diagnosticRoot = path.join(root, 'agent-team', '.runtime', 'bug-pipeline');
  const failedOutputRoot = path.join(diagnosticRoot, 'failed-code');
  // Outputs must be OUTSIDE both the source checkout and every model worktree.
  const runtimeRoot = path.join(env.RUNNER_TEMP || path.dirname(root), '.clinicos-bug-sessions');
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  await mkdir(diagnosticRoot, { recursive: true });
  const run = createRunner({ env, runtimeRoot });
  const modelDiagnostics = [];
  const models = createModels({
    plannerModel: env.CODEX_PLANNER_MODEL,
    executorModel: env.CODEX_EXECUTOR_MODEL,
    delegateModel: env.CODEX_SMALL_EXECUTOR_MODEL,
    run,
    runtimeRoot,
    onDiagnostic: (diagnostic) => {
      if (modelDiagnostics.length === 64) modelDiagnostics.shift();
      modelDiagnostics.push(diagnostic);
      console.log(JSON.stringify({ type: 'model-diagnostic', ...diagnostic }));
    },
  });
  const report = await doctor({ run, models, env, cwd: root });
  if (args.includes('--doctor')) {
    console.log(JSON.stringify(report));
    return report.ready ? 0 : 1;
  }
  if (env.GITHUB_ACTIONS !== 'true' && !args.includes('--run'))
    throw new Error('Use --run explicitly outside GitHub Actions');
  if (!report.ready) {
    await writeFile(
      path.join(diagnosticRoot, 'diagnostic.json'),
      JSON.stringify({ status: 'blocked-prerequisites', ...report, modelDiagnostics }, null, 2) +
        '\n',
    );
    console.log(JSON.stringify({ status: 'blocked-prerequisites', ...report }));
    return 1;
  }
  const repo = env.GITHUB_REPOSITORY || 'l2v-hub/ClinicOS';
  const event = env.GITHUB_EVENT_PATH
    ? JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'))
    : {};
  const gh = createGitHub({ cwd: root, repo, run });
  const store = gh.createStateStore();
  const workspace = createWorkspace({ root, repo, run, models });
  const exportKnownFailures = (state) =>
    exportKnownFailedOutputs({
      state,
      workspace,
      outputRoot: failedOutputRoot,
    });
  const writeVerificationDiagnostic = async () => {
    const entries = workspace.verificationDiagnostics();
    if (!entries.length) return;
    const directory = path.join(diagnosticRoot, 'verification');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      path.join(directory, `${randomUUID()}.json`),
      JSON.stringify(
        { schemaVersion: 1, kind: 'bounded-sanitized-verification-failure', entries },
        null,
        2,
      ) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
  };
  try {
    const state = await runPipeline({
      repo,
      event,
      gh,
      models,
      workspace,
      store,
      reviewMode: env.BUG_PIPELINE_REVIEW_MODE,
      standaloneController: createStandaloneReview({ github: gh, run, cwd: root }),
      standaloneInfrastructureFiles: STANDALONE_INFRASTRUCTURE_FILES,
    });
    const blocked = state.batches.filter((b) => b.phase === 'blocked').length;
    const failedOutputExports = await exportKnownFailures(state);
    const summary = {
      status: blocked ? 'partial' : 'reconciled',
      blocked,
      verificationDiagnostics: workspace.verificationDiagnostics().slice(-64),
      failedOutputExports,
      modelDiagnostics,
      batches: state.batches.map((b) => ({
        id: b.id,
        phase: b.phase,
        implementation: spentAttempts(b, 'implementation'),
        reviews: b.reviews.length,
        sha: b.sha ?? null,
        failureCode: b.failureCode,
      })),
      standaloneReviews: (state.standaloneReviews ?? []).map((s) => ({
        id: s.id,
        pr: s.pr.number,
        sha: s.sha,
        phase: s.phase,
        implementation: spentAttempts(s, 'implementation'),
        reviews: s.reviews.length,
        releaseHold: s.releaseHold,
      })),
    };
    await writeFile(
      path.join(diagnosticRoot, 'diagnostic.json'),
      JSON.stringify(summary, null, 2) + '\n',
    );
    // Successful reconciliation is distinct from every bug being resolved. Terminal blocked
    // batches are reported explicitly and cannot release; they do not starve unrelated ready batches.
    console.log(JSON.stringify(summary));
    return 0;
  } catch (error) {
    // A controller exception may follow a persisted FAILED attempt. Observe the
    // canonical state read-only; export guards still require the exact owned output.
    await writeBlockedControllerDiagnostic({
      diagnosticRoot,
      error,
      observe: typeof store.observe === 'function' ? () => store.observe() : undefined,
      exportFailures: exportKnownFailures,
      modelDiagnostics,
      verificationDiagnostics: workspace.verificationDiagnostics(),
    });
    console.error(
      'Pipeline blocked: GitHub permissions, durable state, triage or execution failed. No budget reset.',
    );
    return 1;
  } finally {
    try {
      await writeVerificationDiagnostic();
    } catch {
      /* original result wins */
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch {
    console.error('Pipeline configuration failed. Run --doctor; no credentials are printed.');
    process.exitCode = 1;
  }
}
