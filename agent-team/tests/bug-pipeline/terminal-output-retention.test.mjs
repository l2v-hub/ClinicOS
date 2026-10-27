import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createWorkspace, runImplementationStages } from '../../src/bug-pipeline/workspace.mjs';
import { exportFailedCode } from '../../src/bug-pipeline/failed-output-export.mjs';
import { exportKnownFailedOutputs } from '../../src/bug-pipeline/cli.mjs';
import { sha256 } from '../../src/bug-pipeline/contracts.mjs';
const exec = promisify(execFile);
const env = {
  PATH: process.env.PATH,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.test',
  GIT_COMMITTER_NAME: 'fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.test',
};
async function fixture(
  t,
  {
    step = 'qa',
    initial = false,
    summary = 'Save failure leaves navigation blocked.',
    expectUnknown = false,
    reportFailure = null,
  } = {},
) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'terminal-retain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = async (...args) => (await exec('git', args, { cwd: root, env })).stdout.trim();
  await git('init', '-q');
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/feature.mjs'), 'export const answer = 1;\n');
  await writeFile(
    path.join(root, 'src/feature.test.mjs'),
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { answer } from './feature.mjs';\ntest('actual fixture verification', () => assert.equal(answer, 2));\n",
  );
  await git('add', 'src');
  await git('commit', '-qm', 'baseline');
  const source = await git('rev-parse', 'HEAD');
  const id = 'bug-batch-81',
    branch = 'codex/' + id;
  const cwd = path.join(root, 'agent-team/.worktrees', id);
  await mkdir(path.dirname(cwd), { recursive: true });
  await git('worktree', 'add', '-b', branch, cwd, source);
  const packet = `artifacts/task-validation/${id}`;
  await mkdir(path.join(cwd, packet), { recursive: true });
  const batch = {
    id,
    issues: [81],
    branch,
    baseSha: source,
    sha: initial ? null : source,
    pr: initial ? null : { number: 81 },
    phase: 'implementing',
    packetHashes: {},
    implementation: [{ round: 1, status: 'running' }],
    reviews: [],
    plan: {
      scope: ['src/feature.mjs'],
      verification: [{ command: 'node', args: ['--test', 'src/feature.test.mjs'] }],
      evidence: [],
    },
  };
  const run = async ({ command, args, cwd: where }) => {
    if (command === 'codex') {
      // Inject only the sandbox/process boundary. Execute the actual owned Node
      // assertion; do not invoke a CLI, provider, database or production service.
      assert.equal(args[0], 'sandbox');
      const separator = args.lastIndexOf('--');
      assert.ok(args.some((a) => String(a).endsWith('/bug-pipeline/verification.mjs')));
      assert.deepEqual(args.slice(separator + 1), ['node', '--test', 'src/feature.test.mjs']);
      command = 'node';
      args = args.slice(separator + 2);
    }
    assert.ok(command === 'git' || command === 'node', 'Only local synthetic fixture commands');
    try {
      const r = await exec(command === 'node' ? process.execPath : command, args, {
        cwd: where,
        env,
      });
      return { ok: true, code: 0, stdout: r.stdout, stderr: r.stderr };
    } catch (error) {
      return {
        ok: false,
        code: error.code,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      };
    }
  };
  const models = {
    execute: async () => {
      await writeFile(path.join(cwd, 'src/feature.mjs'), 'export const answer = 2;\n');
      const reportDir = path.join(cwd, packet, 'model-results');
      if (reportFailure === 'conflict') {
        await mkdir(reportDir, { recursive: true });
        await writeFile(path.join(reportDir, '1-execute.json'), '{"old":"report"}\n');
      }
      if (reportFailure === 'symlink-file') {
        const external = path.join(root, 'external-file.json');
        await writeFile(
          external,
          JSON.stringify(
            {
              schemaVersion: 1,
              kind: 'terminal-model-result',
              step: 'execute',
              round: 1,
              status: 'blocked',
              summary,
              summaryDisposition: 'retained',
              originalSummarySha256: sha256(summary),
            },
            null,
            2,
          ) + '\n',
        );
        await mkdir(reportDir, { recursive: true });
        await symlink(external, path.join(reportDir, '1-execute.json'));
      }
      if (reportFailure === 'symlink') {
        const external = path.join(root, 'external-report-target');
        await mkdir(external);
        await symlink(external, reportDir);
      }
      return { status: step === 'execute' ? 'blocked' : 'implemented', summary };
    },
    simplify: async () => ({ status: step === 'simplify' ? 'blocked' : 'implemented', summary }),
    qa: async () => ({ status: 'blocked', summary }),
  };
  const workspace = createWorkspace({ root, repo: 'l2v-hub/ClinicOS', run, models });
  let interruption;
  await assert.rejects(
    runImplementationStages({
      batch,
      workspace,
      save: async () => {},
      context: {
        phase: initial ? 'implementation' : 'external-review-correction',
        round: 1,
        implementationRound: 1,
        feedback: null,
      },
    }),
    (error) => {
      interruption = error;
      return true;
    },
  );
  if (expectUnknown) {
    assert.equal(batch.controllerProgress.status, 'running');
    assert.equal(batch.implementation[0].status, 'running');
    return { root, cwd, packet, batch, workspace, outputRoot: path.join(root, 'export') };
  }
  assert.equal(batch.controllerProgress.status, 'failed', interruption?.message);
  assert.equal(batch.controllerProgress.failedStep, step);
  assert.equal(batch.implementation[0].status, 'failed');
  return { root, cwd, packet, batch, workspace, outputRoot: path.join(root, 'export') };
}
function destination(f, manifest) {
  return path.join(
    f.outputRoot,
    f.batch.id,
    `round-1-${f.batch.controllerProgress.failedStep}-${manifest.checkpointSha256}`,
  );
}
for (const step of ['execute', 'simplify', 'qa'])
  for (const initial of [false, true])
    test(`native ${initial ? 'initial' : 'correction'} ${step} BLOCKED retains exact source and its typed report`, async (t) => {
      const f = await fixture(t, { step, initial });
      const before = structuredClone(f.batch);
      const records = await exportKnownFailedOutputs({
        state: { batches: [f.batch] },
        workspace: f.workspace,
        outputRoot: f.outputRoot,
      });
      assert.equal(records[0]?.status, 'local-export-created');
      const base = path.join(
        f.outputRoot,
        f.batch.id,
        `round-1-${step}-${records[0].checkpointSha256}`,
      );
      const manifest = JSON.parse(await readFile(path.join(base, 'manifest.json')));
      assert.equal(manifest.modelReport.availability, 'retained');
      assert.equal(manifest.modelReport.status, 'blocked');
      const report = JSON.parse(await readFile(path.join(base, manifest.modelReport.exportedPath)));
      assert.equal(report.status, 'blocked');
      assert.equal(report.step, step);
      assert.equal(report.summary, 'Save failure leaves navigation blocked.');
      assert.equal(
        sha256(await readFile(path.join(base, manifest.modelReport.exportedPath))),
        manifest.modelReport.sha256,
      );
      assert.equal(
        manifest.modelReport.sha256,
        f.batch.controllerProgress.checkpoint.output[manifest.modelReport.file].sha256,
      );
      assert.equal(
        await readFile(path.join(base, 'files/src/feature.mjs'), 'utf8'),
        'export const answer = 2;\n',
      );
      assert.deepEqual(f.batch, before, 'Retention never changes status, attempts or history');
    });

test('safe typed report redacts credential lines without exporting raw QA markdown', async (t) => {
  const f = await fixture(t, { summary: 'Error: GH_TOKEN = fixtureCredential123456' });
  const manifest = await exportFailedCode(f),
    base = destination(f, manifest);
  assert.equal(manifest.modelReport.availability, 'retained');
  const report = JSON.parse(await readFile(path.join(base, manifest.modelReport.exportedPath)));
  assert.equal(report.status, 'blocked');
  assert.equal(report.summaryDisposition, 'sanitized');
  assert.equal(report.summary, '[REDACTED_SENSITIVE_LINE]');
  async function scan(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) await scan(file);
      else assert.ok(!(await readFile(file, 'utf8')).includes('fixtureCredential123456'));
    }
  }
  await scan(base);
});

test('missing model report is explicit partial source retention, never a fabricated report', async (t) => {
  const f = await fixture(t);
  const file = Object.keys(f.batch.controllerProgress.checkpoint.output).find((p) =>
    p.includes('/model-results/'),
  );
  assert.ok(file);
  await rm(path.join(f.cwd, file));
  f.batch.controllerProgress.checkpoint = await f.workspace.captureCheckpoint(f.batch);
  const manifest = await exportFailedCode(f);
  assert.equal(manifest.modelReport.availability, 'not-recorded');
  assert.equal(manifest.modelReport.exportedPath, undefined);
});

for (const reportFailure of ['conflict', 'symlink'])
  test(`optional report ${reportFailure} failure preserves BLOCKED settlement and exports not-recorded`, async (t) => {
    const f = await fixture(t, { step: 'execute', reportFailure });
    assert.equal(f.batch.controllerProgress.status, 'failed');
    assert.equal(f.batch.controllerProgress.failureCode, 'implementation-blocked');
    assert.equal(f.batch.implementation[0].status, 'failed');
    assert.equal(f.batch.controllerProgress.modelReportRetention.execute, 'not-recorded');
    if (reportFailure === 'conflict') {
      const records = await exportKnownFailedOutputs({
        state: { batches: [f.batch] },
        workspace: f.workspace,
        outputRoot: f.outputRoot,
      });
      const manifest = JSON.parse(
        await readFile(path.join(destination(f, records[0]), 'manifest.json')),
      );
      assert.equal(manifest.modelReport.availability, 'not-recorded');
      assert.equal(manifest.modelReport.exportedPath, undefined);
      assert.equal(
        await readFile(path.join(f.cwd, f.packet, 'model-results/1-execute.json'), 'utf8'),
        '{"old":"report"}\n',
      );
    } else assert.deepEqual(await readdir(path.join(f.root, 'external-report-target')), []);
  });

test('JSON escaped summary near 32 KiB is consistently omitted at the report byte limit', async (t) => {
  const f = await fixture(t, { step: 'execute', summary: '"\\'.repeat(16 * 1024) });
  const manifest = await exportFailedCode(f);
  assert.equal(manifest.modelReport.availability, 'retained');
  assert.equal(manifest.modelReport.summaryDisposition, 'omitted-oversized');
  const report = JSON.parse(
    await readFile(path.join(destination(f, manifest), manifest.modelReport.exportedPath)),
  );
  assert.equal(report.summary, null);
  assert.equal(report.summaryDisposition, 'omitted-oversized');
});

for (const fault of [
  'running',
  'unknown',
  'publish',
  'scope',
  'feedback',
  'plan',
  'active',
  'review',
  'publishing',
  'pending-publish',
  'changed-output',
])
  test(`refuses ${fault} without output`, async (t) => {
    const f = await fixture(t),
      p = f.batch.controllerProgress;
    if (fault === 'publishing') f.batch.phase = 'publishing';
    if (fault === 'pending-publish') p.pending = 'publish';
    if (fault === 'running') p.status = 'running';
    if (fault === 'unknown') p.status = 'interrupted';
    if (fault === 'publish') p.failedStep = 'publish';
    if (fault === 'scope') {
      p.failedStep = 'verify-before';
      p.failureCode = 'workspace-scope-invalid';
    }
    if (fault === 'feedback') p.feedbackSha256 = 'a'.repeat(64);
    if (fault === 'plan') f.batch.plan.scope.push('src/other.mjs');
    if (fault === 'active') f.batch.implementation[0].status = 'running';
    if (fault === 'review') f.batch.reviews.push({ status: 'running' });
    if (fault === 'changed-output')
      await writeFile(path.join(f.cwd, 'src/feature.mjs'), 'export const answer = 3;\n');
    await assert.rejects(exportFailedCode(f));
    assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
  });

for (const step of ['verify-before', 'verify-after', 'revision'])
  test(`legacy known ${step} retains source without inventing model evidence`, async (t) => {
    const f = await fixture(t);
    f.batch.controllerProgress.failedStep = step;
    f.batch.controllerProgress.pending = step;
    f.batch.controllerProgress.failureCode =
      step === 'revision' ? 'implementation-revision-unchanged' : 'workspace-verification-failed';
    const manifest = await exportFailedCode(f);
    assert.equal(manifest.failedStep, step);
    assert.equal(manifest.modelReport, null);
  });
for (const fault of ['source', 'pr', 'round', 'round-pair', 'feedback', 'review'])
  test(`initial ${fault} drift never becomes a retained failure`, async (t) => {
    const f = await fixture(t, { initial: true });
    if (fault === 'source') f.batch.controllerProgress.sourceSha = f.batch.baseSha;
    if (fault === 'pr') f.batch.pr = { number: 81 };
    if (fault === 'round') f.batch.controllerProgress.implementationRound = 2;
    if (fault === 'round-pair') {
      f.batch.controllerProgress.implementationRound = 2;
      f.batch.implementation[0].round = 2;
    }
    if (fault === 'feedback') f.batch.controllerProgress.feedbackSha256 = 'a'.repeat(64);
    if (fault === 'review') f.batch.reviews.push({ status: 'running' });
    await assert.rejects(exportFailedCode(f));
    assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
  });
for (const fault of ['verified-status', 'extra-field', 'unsafe-summary', 'forged-summary-hash'])
  test(`report ${fault} is not copied or normalized into a blocked result`, async (t) => {
    const f = await fixture(t);
    const file = Object.keys(f.batch.controllerProgress.checkpoint.output).find((p) =>
      p.includes('/model-results/'),
    );
    const report = JSON.parse(await readFile(path.join(f.cwd, file)));
    if (fault === 'verified-status') report.status = 'verified';
    if (fault === 'extra-field') report.unexpected = 'not a trusted report field';
    if (fault === 'unsafe-summary') report.summary = 'Error: GH_TOKEN = fixtureCredential123456';
    if (fault === 'forged-summary-hash') report.originalSummarySha256 = 'a'.repeat(64);
    await writeFile(path.join(f.cwd, file), JSON.stringify(report) + '\n');
    f.batch.controllerProgress.checkpoint = await f.workspace.captureCheckpoint(f.batch);
    const manifest = await exportFailedCode(f);
    assert.equal(manifest.modelReport.availability, 'invalid-or-unsafe');
    assert.equal(manifest.modelReport.status, undefined);
    assert.equal(manifest.modelReport.exportedPath, undefined);
    assert.deepEqual((await readdir(destination(f, manifest))).sort(), [
      'files',
      'manifest.json',
      'source.patch',
    ]);
  });

for (const [summary, expected] of [
  ['a'.repeat(33 * 1024), 'omitted-oversized'],
  ['unsafe\u0000summary', 'omitted-unsafe'],
])
  test(`executor report ${expected} keeps true blocked status without unsafe text`, async (t) => {
    const f = await fixture(t, { step: 'execute', summary });
    const manifest = await exportFailedCode(f);
    const report = JSON.parse(
      await readFile(path.join(destination(f, manifest), manifest.modelReport.exportedPath)),
    );
    assert.equal(report.status, 'blocked');
    assert.equal(report.summaryDisposition, expected);
    assert.equal(report.summary, null);
    assert.equal(manifest.modelReport.status, 'blocked');
  });
test('native unsafe QA result remains unknown/running instead of authorizing terminal retention', async (t) => {
  const f = await fixture(t, { summary: 'sk-test-not-a-real-key', expectUnknown: true });
  await assert.rejects(exportFailedCode(f));
  assert.deepEqual(
    await exportKnownFailedOutputs({
      state: { batches: [f.batch] },
      workspace: f.workspace,
      outputRoot: f.outputRoot,
    }),
    [],
  );
});

test('final report symlink is refused before reading an external synthetic file', async (t) => {
  const f = await fixture(t, { step: 'execute', reportFailure: 'symlink-file' });
  assert.equal(f.batch.controllerProgress.status, 'failed');
  assert.equal(f.batch.controllerProgress.modelReportRetention?.execute, 'not-recorded');
  await assert.rejects(exportFailedCode(f));
});
