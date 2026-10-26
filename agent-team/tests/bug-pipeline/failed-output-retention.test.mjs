import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { createWorkspace, knownFailedCorrection, safeVerificationText } from '../../src/bug-pipeline/workspace.mjs';
import { createRunner } from '../../src/bug-pipeline/process.mjs';
import { exportFailedCode } from '../../src/bug-pipeline/failed-output-export.mjs';
import { archiveUnavailableFailedOutput } from '../../src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '../../src/bug-pipeline/attempt-budget.mjs';
import { sha256 } from '../../src/bug-pipeline/contracts.mjs';
const execFile = promisify(execFileCallback);

test('partial exit zero still schedules diagnostic and failed code artifact upload', async () => {
  const workflow = await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    '../../../.github/workflows/codex-bug-pipeline.yml'), 'utf8');
  assert.match(workflow, /- name: Upload bounded pipeline diagnostic and retained failed code\n\s+if: always\(\)/);
  assert.match(workflow, /agent-team\/\.runtime\/bug-pipeline\/diagnostic\.json/);
  assert.match(workflow, /agent-team\/\.runtime\/bug-pipeline\/failed-code\//);
  assert.match(workflow, /agent-team\/\.runtime\/bug-pipeline\/verification\//);
  const cli = await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    '../../src/bug-pipeline/cli.mjs'), 'utf8');
  assert.match(cli, /catch \(error\) \{[\s\S]*?exportKnownFailures\(await store\.observe\(\)\)/);
  assert.match(cli, /finally \{[\s\S]*?writeVerificationDiagnostic\(\)/);
});

function failedBatch() {
  const sha = 'a'.repeat(40);
  const plan = { scope: ['src/feature.ts'], verification: [{ command: 'node', args: ['--test', 'src/feature.test.mjs'] }] };
  const feedback = { reason: 'correction' };
  const checkpoint = { schemaVersion: 1, cwd: '', branch: 'bug-fix', head: sha,
    baseSha: '', planSha256: sha256(JSON.stringify(plan)), packetHashes: {}, output: {} };
  const batch = { id: 'bug-batch-81', sha, baseSha: '', branch: 'bug-fix', phase: 'blocked',
    failureCode: 'workspace-verification-failed', plan, implementation: [{ round: 1, status: 'failed' }],
    reviews: [], pr: { number: 81 }, controllerProgress: {
      schemaVersion: 1, status: 'failed', flow: 'pr-feedback', round: 1, implementationRound: 1,
      sourceSha: sha, planSha256: sha256(JSON.stringify(plan)),
      feedbackSha256: sha256(JSON.stringify(feedback)), feedback,
      next: 1, completed: [{ step: 'execute' }], pending: 'verify-before',
      failedStep: 'verify-before', failureCode: 'workspace-verification-failed', checkpoint,
    } };
  return { batch, checkpoint };
}

test('actual verification failure records command and sanitized captured stream identities without changing failure', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verification-observe-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { batch } = failedBatch();
  batch.packetHashes = {};
  const cwd = path.join(root, 'agent-team/.worktrees', batch.id);
  await mkdir(cwd, { recursive: true });
  const run = async ({ command }) => command === 'git'
    ? { ok: true, code: 0, stdout: '', stderr: '' }
    : { ok: false, code: 2, error: null,
      stdout: 'Error: verification failed\n', stderr: 'AssertionError: expected 1\n' };
  const workspace = createWorkspace({ root, repo: 'l2v-hub/ClinicOS', run, models: {} });
  await assert.rejects(workspace.verify(batch), /required verification failed/);
  const [entry] = workspace.verificationDiagnostics();
  assert.equal(entry.index, 0);
  assert.equal(entry.command, 'node');
  assert.equal(entry.exitCode, 2);
  assert.equal(entry.runnerError, null);
  assert.equal(entry.stdoutSanitizedCapturedBytes, Buffer.byteLength('Error: verification failed\n'));
  assert.equal(entry.stderrSanitizedSha256, sha256('AssertionError: expected 1\n'));
  assert.match(entry.stdoutSanitizedExcerpt, /Error: verification failed/);
  const packet = JSON.parse(await readFile(path.join(cwd, `artifacts/task-validation/${batch.id}/test-results/controller-verification.json`)));
  assert.equal(packet[0].code, 2);
  assert.equal(packet[0].ok, false);
});

test('actual verification excerpt redacts spaced known credential assignments', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verification-credential-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { batch } = failedBatch();
  batch.packetHashes = {};
  const cwd = path.join(root, 'agent-team/.worktrees', batch.id);
  await mkdir(cwd, { recursive: true });
  const run = async ({ command }) => command === 'git'
    ? { ok: true, code: 0, stdout: '', stderr: '' }
    : { ok: false, code: 2, error: null,
      stdout: 'Error: GH_TOKEN = fixtureCredential123456\n', stderr: '' };
  const workspace = createWorkspace({ root, repo: 'l2v-hub/ClinicOS', run, models: {} });
  await assert.rejects(workspace.verify(batch), /required verification failed/);
  const [entry] = workspace.verificationDiagnostics();
  assert.equal(entry.stdoutSanitizedExcerpt, '[REDACTED_SENSITIVE_LINE]');
  assert.ok(!JSON.stringify(entry).includes('fixtureCredential123456'));
});

test('verification sanitization covers every core known credential key with spacing, quotes and case', () => {
  const keys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN',
    'CODEX_ACCESS_TOKEN', 'DATABASE_URL', 'GITHUB_TOKEN', 'GH_TOKEN'];
  const input = keys.map((key) => `Error: ${key.toLowerCase()} = "fixture-${key}"`).join('\n');
  const output = safeVerificationText(input);
  assert.deepEqual(output.split('\n'), keys.map(() => '[REDACTED_SENSITIVE_LINE]'));
  assert.ok(!output.includes('fixture-'));
});

test('verification boundary observes real stripped-environment child exit and redacted capture', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verification-child-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { batch } = failedBatch();
  batch.packetHashes = {};
  await mkdir(path.join(root, 'agent-team/.worktrees', batch.id), { recursive: true });
  const fixture = path.join(root, 'fixture-codex.mjs');
  await writeFile(fixture, `process.stdout.write('HAS_CONTROLLER_TOKEN=' + Boolean(process.env.GH_TOKEN) + '\\n');\nprocess.stderr.write('Authorization: Bearer fixture-credential\\n');\nprocess.exitCode = 7;\n`);
  const child = createRunner({ env: { PATH: process.env.PATH, GH_TOKEN: 'hidden-token',
    CODEX_CLI_PATH: fixture }, runtimeRoot: path.join(root, 'runtime') });
  const run = (options) => options.command === 'git'
    ? Promise.resolve({ ok: true, code: 0, stdout: '', stderr: '' }) : child(options);
  const workspace = createWorkspace({ root, repo: 'l2v-hub/ClinicOS', run, models: {} });
  await assert.rejects(workspace.verify(batch), /required verification failed/);
  const [entry] = workspace.verificationDiagnostics();
  assert.equal(entry.exitCode, 7);
  assert.equal(entry.stdoutSanitizedSha256, sha256('HAS_CONTROLLER_TOKEN=false\n'));
  assert.equal(entry.stderrSanitizedSha256, sha256('[REDACTED_SENSITIVE_LINE]\n'));
  assert.equal(entry.stderrSanitizedExcerpt, '[REDACTED_SENSITIVE_LINE]');
  assert.ok(!JSON.stringify(entry).includes('fixture-credential'));
});

async function exportFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'failed-source-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputRoot = path.join(root, 'export');
  const cwd = path.join(root, 'owned');
  await mkdir(path.join(cwd, 'src'), { recursive: true });
  const runGit = (...args) => execFile('git', args, { cwd, env: { PATH: process.env.PATH,
    GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test',
    GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test' } });
  await runGit('init', '-q');
  await writeFile(path.join(cwd, 'src/feature.ts'), 'export const answer = 1;\n');
  await runGit('add', 'src/feature.ts');
  await runGit('commit', '-qm', 'baseline');
  const { stdout } = await runGit('rev-parse', 'HEAD');
  const { batch, checkpoint } = failedBatch();
  batch.baseSha = checkpoint.baseSha = stdout.trim();
  checkpoint.cwd = cwd;
  const file = path.join(cwd, 'src/feature.ts');
  await writeFile(file, 'export const answer = 2;\n');
  const contents = await readFile(file);
  checkpoint.output['src/feature.ts'] = { sha256: sha256(contents), bytes: contents.length, executable: false };
  const workspace = { captureCheckpoint: async () => structuredClone(checkpoint) };
  return { root, cwd, outputRoot, batch, checkpoint, workspace, file };
}

test('guarded failed code export retains only exact allowed source, bounded patch and metadata', async (t) => {
  const f = await exportFixture(t);
  const manifest = await exportFailedCode(f);
  const retained = path.join(f.outputRoot, f.batch.id,
    `round-1-verify-before-${manifest.checkpointSha256}`);
  assert.equal(manifest.kind, 'partial-failed-code-retention');
  assert.equal(manifest.files[0].sha256, f.checkpoint.output['src/feature.ts'].sha256);
  assert.equal(await readFile(path.join(retained, 'files/src/feature.ts'), 'utf8'),
    'export const answer = 2;\n');
  assert.match(await readFile(path.join(retained, 'source.patch'), 'utf8'),
    /-export const answer = 1;\n\+export const answer = 2;/);
  assert.equal(await readFile(f.file, 'utf8'), 'export const answer = 2;\n');
  await assert.rejects(exportFailedCode(f), /already exists/);
  assert.deepEqual(await readdir(path.join(f.outputRoot, f.batch.id)),
    [`round-1-verify-before-${manifest.checkpointSha256}`]);
  f.batch.implementation.push({ round: 2, status: 'failed' });
  f.batch.controllerProgress.round = f.batch.controllerProgress.implementationRound = 2;
  const next = await exportFailedCode(f);
  assert.equal(next.round, 2);
  assert.deepEqual((await readdir(path.join(f.outputRoot, f.batch.id))).sort(),
    [`round-1-verify-before-${manifest.checkpointSha256}`,
      `round-2-verify-before-${manifest.checkpointSha256}`]);
});

test('export refuses changed checkpoint, hash, size, symlink, secret, traversal and outside-plan files', async (t) => {
  for (const fault of ['changed', 'hash', 'size', 'symlink', 'secret', 'traversal', 'outside']) {
    const f = await exportFixture(t);
    if (fault === 'changed') f.workspace.captureCheckpoint = async () => ({ ...f.checkpoint, head: 'b'.repeat(40) });
    if (fault === 'hash') await writeFile(f.file, 'export const answer = 3;\n');
    if (fault === 'size') {
      await writeFile(f.file, 'x'.repeat(256 * 1024) + '\n');
      const bytes = await readFile(f.file);
      f.checkpoint.output['src/feature.ts'] = { sha256: sha256(bytes), bytes: bytes.length, executable: false };
    }
    if (fault === 'symlink') { await unlink(f.file); await symlink('/etc/hosts', f.file); }
    if (fault === 'secret') {
      await writeFile(f.file, 'const api_key = "sk-test-secret-value";\n');
      const bytes = await readFile(f.file);
      f.checkpoint.output['src/feature.ts'] = { sha256: sha256(bytes), bytes: bytes.length, executable: false };
    }
    if (fault === 'outside') {
      f.checkpoint.output['src/other.ts'] = { sha256: sha256('x'), bytes: 1, executable: false };
    }
    if (fault === 'traversal') f.checkpoint.output['../outside.ts'] = null;
    await assert.rejects(exportFailedCode(f));
    assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
  }
});

test('export rejects spaced GH_TOKEN source before creating patch or copied source', async (t) => {
  for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN',
    'CODEX_ACCESS_TOKEN', 'DATABASE_URL', 'GITHUB_TOKEN', 'GH_TOKEN']) {
    const f = await exportFixture(t);
    await writeFile(f.file, `export const ${key} = "x";\n`);
    const bytes = await readFile(f.file);
    f.checkpoint.output['src/feature.ts'] = { sha256: sha256(bytes), bytes: bytes.length, executable: false };
    await assert.rejects(exportFailedCode(f), /credential material/);
    assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
  }
  for (const declaration of [
    'const config = { GH_TOKEN: "fixtureCredential123456" };\n',
    'const config = { "GH_TOKEN": "fixtureCredential123456" };\n',
  ]) {
    const f = await exportFixture(t);
    await writeFile(f.file, declaration);
    const bytes = await readFile(f.file);
    f.checkpoint.output['src/feature.ts'] = { sha256: sha256(bytes), bytes: bytes.length, executable: false };
    await assert.rejects(exportFailedCode(f), /credential material/);
    assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
  }
});

test('native archive consumes exact external observation and authorization while preserving FAILED history and counts', async () => {
  const { batch } = failedBatch();
  batch.baseSha = batch.controllerProgress.checkpoint.baseSha = 'b'.repeat(40);
  batch.controllerProgress.checkpoint.cwd = '/definitely-missing-old-clinicos-worktree';
  batch.implementation = [1, 2, 3, 4].map((round) => ({ round, status: 'failed' }));
  batch.controllerProgress.round = batch.controllerProgress.implementationRound = 4;
  const state = { repository: 'l2v-hub/ClinicOS', batches: [batch] };
  const progressSha256 = historyDigest(batch.controllerProgress);
  const checkpointSha256 = historyDigest(batch.controllerProgress.checkpoint);
  const before = structuredClone(batch);
  const evidence = { origin: 'github-actions', runId: 40307355899, conclusion: 'success',
    artifactName: 'clinical-recovery-native-diagnostic-40307355899', outputStatus: 'unavailable',
    observedAt: '2026-10-26T11:00:00Z' };
  const verifyUnavailability = async (request) => ({ ...request, terminal: true, onlyDiagnosticArtifact: true });
  const verifier = async ({ binding, consume }) => {
    assert.equal(consume, true);
    return { provenance: 'user-session', grantId: 'session-1', consumptionNonce: 'unique-archive-1',
      sourceRef: 'session:archive', binding };
  };
  await archiveUnavailableFailedOutput({ state, subject: batch, actor: 'maintainer',
    reference: 'session:archive', verifier, verifyUnavailability,
    evidence, progressSha256, checkpointSha256, reason: 'Old runner output unavailable' });
  assert.equal(batch.controllerProgress.checkpoint, undefined);
  assert.equal(knownFailedCorrection(batch), true);
  assert.equal(batch.controllerProgress.status, 'failed');
  assert.equal(batch.controllerProgress.failedStep, 'verify-before');
  assert.equal(batch.failureCode, before.failureCode);
  assert.deepEqual(batch.implementation, before.implementation);
  assert.equal(batch.implementation.length, 4);
  assert.deepEqual(batch.reviews, before.reviews);
  assert.deepEqual(batch.recoveryHistory[0].previous, before.controllerProgress);
  assert.equal(batch.recoveryHistory[0].authorization.consumptionNonce, 'unique-archive-1');
  batch.controllerProgress.checkpoint = structuredClone(before.controllerProgress.checkpoint);
  await assert.rejects(archiveUnavailableFailedOutput({ state, subject: batch, actor: 'maintainer',
    reference: 'session:archive', verifier, verifyUnavailability,
    evidence, progressSha256, checkpointSha256, reason: 'Replay' }), /replay/);
  delete batch.controllerProgress.checkpoint;
});

test('native archive rejects unknown/running/stale and malformed checkpoint proof before consuming authorization', async () => {
  for (const fault of ['running', 'unknown', 'stale', 'badCheckpoint', 'unverified', 'nullOutput', 'arrayOutput', 'badMetadata']) {
    const { batch } = failedBatch();
    batch.baseSha = batch.controllerProgress.checkpoint.baseSha = 'b'.repeat(40);
    if (fault === 'running') batch.controllerProgress.status = 'running';
    if (fault === 'unknown') batch.controllerProgress.failureCode = 'other';
    if (fault === 'nullOutput') batch.controllerProgress.checkpoint.output = null;
    if (fault === 'arrayOutput') batch.controllerProgress.checkpoint.output = [];
    if (fault === 'badMetadata') batch.controllerProgress.checkpoint.output = { 'src/feature.ts': { sha256: 'bad', bytes: -1, executable: 'no' } };
    const state = { repository: 'l2v-hub/ClinicOS', batches: [batch] };
    const evidence = { origin: 'github-actions', runId: 1, conclusion: 'success',
      artifactName: 'codex-bug-pipeline-diagnostic-1', outputStatus: 'unavailable',
      observedAt: '2026-10-26T11:00:00Z' };
    let calls = 0;
    const progressSha256 = fault === 'stale' ? '0'.repeat(64) : historyDigest(batch.controllerProgress);
    const checkpointSha256 = fault === 'badCheckpoint'
      ? 'f'.repeat(64) : historyDigest(batch.controllerProgress.checkpoint);
    await assert.rejects(archiveUnavailableFailedOutput({ state, subject: batch, actor: 'maintainer',
      reference: 'session:archive', verifier: async () => { calls++; return null; },
      verifyUnavailability: async (request) => ({ ...request, terminal: fault !== 'unverified', onlyDiagnosticArtifact: true }),
      evidence, progressSha256, checkpointSha256, reason: 'Unavailable' }));
    assert.equal(calls, 0);
    assert.equal(batch.recoveryHistory, undefined);
  }
});
