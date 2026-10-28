import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFile as callback } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const execFile = promisify(callback);
const source = '/tmp/clinicos-failed-output-retention-source1/agent-team/src/bug-pipeline';
const { exportKnownFailedOutputs, writeBlockedControllerDiagnostic } = await import(`${source}/cli.mjs`);
const { exportFailedCode } = await import(`${source}/failed-output-export.mjs`);
const { sha256 } = await import(`${source}/contracts.mjs`);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'qa3-retention-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = path.join(root, 'owned');
  const outputRoot = path.join(root, 'retained');
  await mkdir(path.join(cwd, 'src'), { recursive: true });
  const git = (...args) => execFile('git', args, { cwd, env: {
    PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'qa', GIT_AUTHOR_EMAIL: 'qa@example.test',
    GIT_COMMITTER_NAME: 'qa', GIT_COMMITTER_EMAIL: 'qa@example.test',
  } });
  await git('init', '-q');
  const file = path.join(cwd, 'src/change.ts');
  await writeFile(file, 'export const answer = 1;\n');
  await git('add', 'src/change.ts');
  await git('commit', '-qm', 'baseline');
  const baseSha = (await git('rev-parse', 'HEAD')).stdout.trim();
  const body = 'export const answer = 2;\n';
  await writeFile(file, body);
  const plan = { scope: ['src/change.ts'], verification: [{ command: 'node', args: ['--test'] }] };
  const feedback = null;
  const checkpoint = { schemaVersion: 1, cwd, branch: 'qa-branch', head: baseSha,
    baseSha, planSha256: sha256(JSON.stringify(plan)), packetHashes: {},
    output: { 'src/change.ts': { sha256: sha256(body), bytes: Buffer.byteLength(body), executable: false } } };
  const batch = { id: 'bug-batch-91', sha: null, pr: null, baseSha, branch: 'qa-branch',
    phase: 'blocked', plan, implementation: [{ round: 1, status: 'failed' }], reviews: [],
    controllerProgress: { schemaVersion: 1, flow: 'implementation', status: 'failed',
      round: 1, implementationRound: 1, sourceSha: null,
      planSha256: sha256(JSON.stringify(plan)), feedbackSha256: sha256(JSON.stringify(feedback)),
      feedback, next: 1, completed: [], pending: 'verify-before',
      failedStep: 'verify-before', failureCode: 'workspace-verification-failed', checkpoint } };
  const workspace = { captureCheckpoint: async () => structuredClone(checkpoint) };
  return { root, cwd, file, outputRoot, batch, checkpoint, workspace, body };
}

test('native null initial journal creates exact partial export; duplicate is distinct', async (t) => {
  const f = await fixture(t);
  assert.equal(f.batch.sha, null);
  assert.equal(f.batch.pr, null);
  assert.equal(f.batch.controllerProgress.sourceSha, null);
  const state = { batches: [f.batch] };
  const first = await exportKnownFailedOutputs({ state, workspace: f.workspace, outputRoot: f.outputRoot });
  assert.equal(first[0].status, 'local-export-created');
  const destination = path.join(f.outputRoot, f.batch.id,
    `round-1-verify-before-${first[0].checkpointSha256}`);
  const manifest = JSON.parse(await readFile(path.join(destination, 'manifest.json'), 'utf8'));
  assert.equal(manifest.kind, 'partial-failed-code-retention');
  assert.equal(manifest.sourceSha, f.batch.baseSha);
  assert.equal(manifest.files.length, 1);
  assert.equal(await readFile(path.join(destination, 'files/src/change.ts'), 'utf8'), f.body);
  assert.match(await readFile(path.join(destination, 'source.patch'), 'utf8'), /-export const answer = 1;\n\+export const answer = 2;/);
  assert.equal((await exportKnownFailedOutputs({ state, workspace: f.workspace, outputRoot: f.outputRoot }))[0].status,
    'local-export-already-exists');
  assert.deepEqual(await readdir(path.join(f.outputRoot, f.batch.id)), [path.basename(destination)]);
});

test('native initial export refuses stale, active, mismatched plan, feedback, source, head and PR', async (t) => {
  const mutations = {
    running: f => { f.batch.controllerProgress.status = 'running'; },
    latestAttempt: f => { f.batch.implementation.push({ round: 2, status: 'failed' }); },
    activeAttempt: f => { f.batch.implementation.push({ round: 2, status: 'running' }); },
    planDigest: f => { f.batch.controllerProgress.planSha256 = 'a'.repeat(64); },
    feedbackDigest: f => { f.batch.controllerProgress.feedbackSha256 = 'a'.repeat(64); },
    sourceSha: f => { f.batch.controllerProgress.sourceSha = f.batch.baseSha; },
    checkpointHead: f => { f.checkpoint.head = 'a'.repeat(40); },
    checkpointBase: f => { f.checkpoint.baseSha = 'a'.repeat(40); },
    pr: f => { f.batch.pr = { number: 91 }; },
    noFailedAttempt: f => { f.batch.implementation[0].status = 'succeeded'; },
    runningReview: f => { f.batch.reviews.push({ status: 'running' }); },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    await t.test(name, async (sub) => {
      const f = await fixture(sub);
      mutate(f);
      await assert.rejects(exportFailedCode(f));
      assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
    });
  }
});

test('collector distinguishes ineligible verification flow from guard refusal', async (t) => {
  const f = await fixture(t);
  f.batch.controllerProgress.flow = 'unsupported';
  const result = await exportKnownFailedOutputs({ state: { batches: [f.batch] },
    workspace: f.workspace, outputRoot: f.outputRoot });
  assert.equal(result[0].status, 'flow-not-eligible');
  assert.deepEqual(await readdir(f.outputRoot).catch(() => []), []);
  f.batch.controllerProgress.flow = 'implementation';
  f.checkpoint.output['src/change.ts'].sha256 = '0'.repeat(64);
  const refused = await exportKnownFailedOutputs({ state: { batches: [f.batch] },
    workspace: f.workspace, outputRoot: f.outputRoot });
  assert.equal(refused[0].status, 'guard-refused-or-output-unavailable');
});

test('actual blocked diagnostic reads persisted failed state, exports code and preserves throw identity', async (t) => {
  const f = await fixture(t);
  const diagnosticRoot = path.join(f.root, 'diagnostic');
  await mkdir(diagnosticRoot);
  const original = new Error('synthetic pipeline failure');
  let persisted, observed = 0;
  const runPipeline = async () => { persisted = { batches: [f.batch] }; throw original; };
  try { await runPipeline(); assert.fail('expected pipeline throw'); }
  catch (error) {
    assert.equal(error, original);
    await writeBlockedControllerDiagnostic({ diagnosticRoot, error,
      observe: async () => { observed++; return persisted; },
      exportFailures: state => exportKnownFailedOutputs({ state, workspace: f.workspace, outputRoot: f.outputRoot }),
    });
    assert.equal(error, original);
  }
  const diagnostic = JSON.parse(await readFile(path.join(diagnosticRoot, 'diagnostic.json'), 'utf8'));
  assert.equal(observed, 1);
  assert.equal(diagnostic.status, 'blocked-controller');
  assert.equal(diagnostic.failedOutputExports[0].status, 'local-export-created');
  const destination = path.join(f.outputRoot, f.batch.id,
    `round-1-verify-before-${diagnostic.failedOutputExports[0].checkpointSha256}`);
  assert.equal(await readFile(path.join(destination, 'files/src/change.ts'), 'utf8'), f.body);
});

test('missing and throwing observe write explicit sanitized retention marker', async (t) => {
  const f = await fixture(t);
  for (const [name, observe] of [['missing', undefined],
    ['throwing', async () => { throw new Error('private-observer-token-example'); }]]) {
    const diagnosticRoot = path.join(f.root, name);
    await mkdir(diagnosticRoot);
    let exportCalls = 0;
    await writeBlockedControllerDiagnostic({ diagnosticRoot,
      error: new Error('synthetic controller failure'), observe,
      exportFailures: async () => { exportCalls++; return []; } });
    const raw = await readFile(path.join(diagnosticRoot, 'diagnostic.json'), 'utf8');
    const diagnostic = JSON.parse(raw);
    assert.equal(diagnostic.failedOutputExports[0].status, 'retention-failed');
    assert.equal(typeof diagnostic.failedOutputExports[0].failureCode, 'string');
    assert.equal(raw.includes('private-observer-token-example'), false);
    assert.equal(exportCalls, 0);
  }
});
