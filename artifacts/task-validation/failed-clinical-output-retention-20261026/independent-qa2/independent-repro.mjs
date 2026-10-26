import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createWorkspace, safeVerificationText } from '/tmp/clinicos-failed-output-qa2/agent-team/src/bug-pipeline/workspace.mjs';
import { exportFailedCode } from '/tmp/clinicos-failed-output-qa2/agent-team/src/bug-pipeline/failed-output-export.mjs';
import { archiveUnavailableFailedOutput } from '/tmp/clinicos-failed-output-qa2/agent-team/src/bug-pipeline/operator-authorization.mjs';
import { historyDigest } from '/tmp/clinicos-failed-output-qa2/agent-team/src/bug-pipeline/attempt-budget.mjs';
import { sha256, validateState } from '/tmp/clinicos-failed-output-qa2/agent-team/src/bug-pipeline/contracts.mjs';

const token = 'fixtureCredential123456';
const keys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN',
  'CODEX_ACCESS_TOKEN', 'DATABASE_URL', 'GITHUB_TOKEN', 'GH_TOKEN'];
for (const key of keys) {
  for (const line of [`Error: ${key} = ${token}`, `Error: '${key.toLowerCase()}' : '${token}'`]) {
    assert.ok(!safeVerificationText(line).includes(token), `verification leaked ${key}`);
  }
}
console.log(JSON.stringify({ case: 'known-credential-verification-lines', keys: keys.length, forms: 2, result: 'REDACTED' }));

const root = await mkdtemp(path.join(os.tmpdir(), 'failed-output-qa2-'));
try {
  const cwd = path.join(root, 'owned');
  await mkdir(path.join(cwd, 'src'), { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8',
    env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test',
      GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test' } }).trim();
  git('init', '-q');
  await writeFile(path.join(cwd, 'src/config.ts'), 'export const value = 1;\n');
  git('add', 'src/config.ts');
  git('commit', '-qm', 'base');
  const baseSha = git('rev-parse', 'HEAD');
  const sha = 'a'.repeat(40);
  const plan = { scope: ['src/config.ts'], verification: [{ command: 'node', args: ['--test'] }] };
  const feedback = { reason: 'correction' };
  const source = path.join(cwd, 'src/config.ts');
  const checkpoint = { schemaVersion: 1, cwd, branch: 'bug-fix', head: sha,
    baseSha, planSha256: sha256(JSON.stringify(plan)), packetHashes: {}, output: {} };
  const batch = { id: 'bug-batch-81', issues: [81], sha, baseSha,
    branch: 'codex/bug-batch-81', phase: 'blocked', failureCode: 'workspace-verification-failed',
    plan, packetHashes: {}, implementation: [{ round: 1, status: 'failed' }], reviews: [],
    pr: { number: 81 }, controllerProgress: { schemaVersion: 1, status: 'failed',
      flow: 'pr-feedback', round: 1, implementationRound: 1, sourceSha: sha,
      planSha256: sha256(JSON.stringify(plan)), feedbackSha256: sha256(JSON.stringify(feedback)),
      feedback, next: 1, completed: [{ step: 'execute' }], pending: 'verify-before',
      failedStep: 'verify-before', failureCode: 'workspace-verification-failed', checkpoint } };
  const controllerRoot = path.join(root, 'controller');
  await mkdir(path.join(controllerRoot, 'agent-team', '.worktrees', batch.id), { recursive: true });
  const workspace = createWorkspace({ root: controllerRoot, repo: 'l2v-hub/ClinicOS', models: {},
    run: async ({ command }) => command === 'git'
      ? { ok: true, code: 0, stdout: '', stderr: '' }
      : { ok: false, code: 7, stdout: `Error: GH_TOKEN = ${token}\n`, stderr: '' } });
  await assert.rejects(workspace.verify(batch), /required verification failed/);
  const [diagnostic] = workspace.verificationDiagnostics();
  assert.ok(!diagnostic.stdoutSanitizedExcerpt.includes(token));
  assert.match(diagnostic.stdoutSanitizedExcerpt, /REDACTED_SENSITIVE_LINE/);
  assert.equal(diagnostic.exitCode, 7);
  console.log(JSON.stringify({ case: 'actual-verification-diagnostic', result: 'REDACTED', exitCode: diagnostic.exitCode }));

  const outputRoot = path.join(root, 'retained');
  let refused = 0;
  for (const key of keys) {
    for (const content of [`export const ${key} = "${token}";\n`,
      `export const obj = { '${key.toLowerCase()}': '${token}' };\n`]) {
      const bytes = Buffer.from(content);
      await writeFile(source, bytes);
      checkpoint.output['src/config.ts'] = { sha256: sha256(bytes), bytes: bytes.length, executable: false };
      await assert.rejects(exportFailedCode({ batch,
        workspace: { captureCheckpoint: async () => structuredClone(checkpoint) }, outputRoot }),
      /credential material|redacted material/);
      assert.deepEqual(await readdir(root).then((names) => names.includes('retained')), false);
      refused++;
    }
  }
  console.log(JSON.stringify({ case: 'known-credential-source-export', attempts: refused, result: 'REFUSED_BEFORE_STAGE' }));

  const allowed = Buffer.from('export const value = 2;\n');
  await writeFile(source, allowed);
  checkpoint.output['src/config.ts'] = { sha256: sha256(allowed), bytes: allowed.length, executable: false };
  const manifest = await exportFailedCode({ batch,
    workspace: { captureCheckpoint: async () => structuredClone(checkpoint) }, outputRoot });
  const exported = path.join(outputRoot, batch.id,
    `round-1-verify-before-${manifest.checkpointSha256}`, 'files/src/config.ts');
  assert.equal(await readFile(exported, 'utf8'), allowed.toString());
  assert.equal(manifest.files.length, 1);
  console.log(JSON.stringify({ case: 'exact-allowed-source-export', result: 'RETAINED', files: manifest.files.length }));

  const state = { schemaVersion: 1, repository: 'l2v-hub/ClinicOS', batches: [batch] };
  assert.equal(validateState(state, 'l2v-hub/ClinicOS'), state);
  const evidence = { origin: 'github-actions', runId: 40307355899, conclusion: 'success',
    artifactName: 'clinical-recovery-native-diagnostic-40307355899',
    outputStatus: 'unavailable', observedAt: '2026-10-26T11:00:00Z' };
  let observers = 0, verifiers = 0;
  for (const malformed of [null, { 'src/config.ts': { sha256: 'bad', bytes: 4, executable: false } }]) {
    checkpoint.output = malformed;
    await assert.rejects(archiveUnavailableFailedOutput({ state, subject: batch,
      actor: 'maintainer', reference: 'session:fixture',
      verifier: async () => { verifiers++; throw new Error('unexpected verifier'); },
      verifyUnavailability: async () => { observers++; throw new Error('unexpected observer'); },
      evidence, progressSha256: historyDigest(batch.controllerProgress),
      checkpointSha256: historyDigest(checkpoint), reason: 'Synthetic missing old output' }),
    { code: 'ERR_ASSERTION' });
    assert.equal(batch.controllerProgress.checkpoint, checkpoint);
    assert.equal(batch.recoveryHistory, undefined);
  }
  assert.equal(observers, 0);
  assert.equal(verifiers, 0);
  console.log(JSON.stringify({ case: 'malformed-checkpoint-inventory', result: 'REFUSED_BEFORE_AUTHORITY', observers, verifiers }));
} finally {
  await rm(root, { recursive: true, force: true });
}
