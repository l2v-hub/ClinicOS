import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createRunner, childEnvironment } from '../../src/bug-pipeline/process.mjs';
import { validateEvidence } from '../../src/bug-pipeline/workspace.mjs';
import { createWorkspace } from '../../src/bug-pipeline/workspace.mjs';
import { crc32 } from '../../src/bug-pipeline/evidence.mjs';

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../artifacts/task-validation/codex-triage-bug-github-e-piano-per-claude',
);
const safeGitRunner = createRunner({ env: { PATH: process.env.PATH }, runtimeRoot: os.tmpdir() });

async function tempDir(t, prefix = 'clinicos-bug-pipeline-') {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

const envWithSecrets = () => ({
  PATH: process.env.PATH,
  HOME: '/private/home',
  GH_TOKEN: 'gh-secret-test-value',
  GITHUB_TOKEN: 'github-secret-test-value',
  CODEX_API_KEY: 'codex-secret-test-value',
  ANTHROPIC_API_KEY: 'anthropic-secret-test-value',
  DATABASE_URL: 'postgresql://production:secret@db.example.com:5432/production',
  CODEX_HOME: '/private/codex-home',
  CODEX_CLI_PATH: '/tools/codex/bin/codex',
  CLAUDE_CLI_PATH: '/tools/claude/bin/claude',
});

test('child environment isolates verification, executor, reviewer, and controller credentials', () => {
  const env = envWithSecrets();
  const runtimeRoot = '/tmp/clinicos-isolated-runtime';
  const verification = childEnvironment('verification', env, runtimeRoot);
  const model = childEnvironment('model', env, runtimeRoot);
  const review = childEnvironment('review', env, runtimeRoot);
  const controller = childEnvironment('controller', env, runtimeRoot);

  for (const child of [verification, model, review]) {
    assert.equal(child.GH_TOKEN, undefined);
    assert.equal(child.GITHUB_TOKEN, undefined);
    assert.equal(
      child.DATABASE_URL,
      'postgresql://postgres:postgres@127.0.0.1:5432/clinicos_test?schema=public',
    );
    assert.equal(new URL(child.AI_RUNTIME_URL).hostname, '127.0.0.1');
    assert.equal(child.AUTH_MODE, 'demo');
  }
  assert.equal(verification.CODEX_API_KEY, undefined);
  assert.equal(verification.ANTHROPIC_API_KEY, undefined);
  assert.equal(model.CODEX_API_KEY, env.CODEX_API_KEY);
  assert.equal(model.ANTHROPIC_API_KEY, undefined);
  assert.equal(review.ANTHROPIC_API_KEY, env.ANTHROPIC_API_KEY);
  assert.equal(review.CODEX_API_KEY, undefined);
  assert.equal(controller.GH_TOKEN, env.GH_TOKEN);
  assert.equal(controller.CODEX_API_KEY, undefined);
  assert.equal(controller.ANTHROPIC_API_KEY, undefined);
  assert.equal(controller.DATABASE_URL, undefined);
  assert.ok(!Object.values(verification).includes(env.DATABASE_URL));
});

test('local Codex login directory is available only to Codex model authentication', () => {
  const env = envWithSecrets();
  delete env.CODEX_API_KEY;
  for (const mode of ['verification', 'review']) {
    const child = childEnvironment(mode, env, '/tmp/isolated-login-probe');
    assert.notEqual(child.CODEX_HOME, env.CODEX_HOME);
    assert.ok(child.CODEX_HOME.startsWith('/tmp/isolated-login-probe/'));
  }
  assert.equal(
    childEnvironment('model', env, '/tmp/isolated-login-probe').CODEX_HOME,
    env.CODEX_HOME,
  );
});

test('createRunner subprocess receives only the role credential and a demo localhost database', async (t) => {
  const root = await tempDir(t);
  const runner = createRunner({ env: envWithSecrets(), runtimeRoot: path.join(root, 'runtime') });
  const script =
    'process.stdout.write(JSON.stringify({gh:process.env.GH_TOKEN,github:process.env.GITHUB_TOKEN,codex:process.env.CODEX_API_KEY,anthropic:process.env.ANTHROPIC_API_KEY,database:process.env.DATABASE_URL,home:process.env.HOME}))';
  const call = (envMode) =>
    runner({
      command: process.execPath,
      args: ['-e', script],
      cwd: root,
      envMode,
      timeoutMs: 3000,
    });
  const verification = JSON.parse((await call('verification')).stdout);
  const model = JSON.parse((await call('model')).stdout);
  const review = JSON.parse((await call('review')).stdout);
  assert.equal(verification.gh, undefined);
  assert.equal(verification.github, undefined);
  assert.equal(verification.codex, undefined);
  assert.equal(verification.anthropic, undefined);
  assert.equal(
    verification.database,
    'postgresql://postgres:postgres@127.0.0.1:5432/clinicos_test?schema=public',
  );
  assert.equal(verification.home, path.join(root, 'runtime', 'verification-home'));
  assert.equal(model.gh, undefined);
  assert.equal(model.github, undefined);
  assert.equal(model.codex, 'codex-secret-test-value');
  assert.equal(model.anthropic, undefined);
  assert.equal(review.gh, undefined);
  assert.equal(review.github, undefined);
  assert.equal(review.codex, undefined);
  assert.equal(review.anthropic, 'anthropic-secret-test-value');
  for (const value of [verification.database, model.database, review.database]) {
    assert.match(value, /127\.0\.0\.1/);
    assert.doesNotMatch(value, /production|db\.example\.com/);
  }
});

test('fresh CLI configuration directories are private and survive repeated isolated launches', async (t) => {
  const root = await tempDir(t);
  const runner = createRunner({
    env: { PATH: process.env.PATH },
    runtimeRoot: path.join(root, 'runtime'),
  });
  const script = `
    const fs = require('node:fs');
    const path = require('node:path');
    for (const key of ['HOME', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR']) {
      const directory = process.env[key];
      const stat = fs.statSync(directory);
      if (!stat.isDirectory() || (stat.mode & 0o777) !== 0o700) process.exit(2);
    }
    const file = path.join(process.env.CODEX_HOME, 'retained-fixture');
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    fs.writeFileSync(file, previous + 'x');
    process.stdout.write(previous);
  `;
  for (const envMode of ['verification', 'model', 'review']) {
    const call = () =>
      runner({ command: process.execPath, args: ['-e', script], cwd: root, envMode });
    const first = await call();
    assert.equal(first.ok, true, first.stderr);
    // The model and review modes intentionally share their model HOME.
    assert.equal(first.stdout, envMode === 'review' ? 'xx' : '');
    const second = await call();
    assert.equal(second.ok, true, second.stderr);
    assert.equal(second.stdout, envMode === 'review' ? 'xxx' : 'x');
  }
});

test('createRunner reports child exit failure and output overflow as failures', async (t) => {
  const root = await tempDir(t);
  const runner = createRunner({
    env: { PATH: process.env.PATH },
    runtimeRoot: path.join(root, 'runtime'),
  });
  const failed = await runner({
    command: process.execPath,
    args: ['-e', 'process.stderr.write("expected failure"); process.exit(7)'],
    cwd: root,
    envMode: 'verification',
    timeoutMs: 3000,
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.code, 7);
  assert.match(failed.stderr, /expected failure/);

  const overflow = await runner({
    command: process.execPath,
    args: ['-e', 'process.stdout.write("x".repeat(10000))'],
    cwd: root,
    envMode: 'verification',
    timeoutMs: 3000,
    maxOutputBytes: 100,
  });
  assert.equal(overflow.ok, false);
  assert.equal(overflow.error, 'output-limit');
});

test(
  'createRunner timeout terminates the subprocess group, including a child process',
  { skip: process.platform !== 'linux' },
  async (t) => {
    const root = await tempDir(t);
    const runner = createRunner({
      env: { PATH: process.env.PATH },
      runtimeRoot: path.join(root, 'runtime'),
    });
    const childProgram = "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)";
    const parentProgram = `const {spawn}=require('node:child_process'); process.on('SIGTERM',()=>{}); const child=spawn(process.execPath,['-e',${JSON.stringify(childProgram)}],{stdio:'ignore'}); process.stdout.write('child:'+child.pid+'\\n'); setInterval(()=>{},1000)`;
    const result = await runner({
      command: process.execPath,
      args: ['-e', parentProgram],
      cwd: root,
      envMode: 'verification',
      timeoutMs: 500,
      maxOutputBytes: 4096,
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'timeout');
    const pid = Number(result.stdout.match(/child:(\d+)/)?.[1]);
    assert.ok(
      Number.isSafeInteger(pid) && pid > 0,
      `must observe descendant PID in output: ${result.stdout}`,
    );
    let alive = true;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const stat = await readFile(`/proc/${pid}/stat`, 'utf8');
        const state = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
        alive = state !== 'Z';
      } catch (error) {
        if (error.code === 'ENOENT') alive = false;
        else throw error;
      }
      if (!alive) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(
      alive,
      false,
      'descendant should be gone or a non-running zombie after process-group kill',
    );
  },
);

function evidencePlan(batch = 17) {
  return {
    evidence: [
      {
        issue: batch,
        screenshot: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${batch}.png`,
        trace: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${batch}-trace.zip`,
        video: '',
      },
    ],
  };
}

function implementationPlan(issues = [17]) {
  const batch = Math.min(...issues);
  return {
    title: 'Stabilize the patient list filter',
    feature: 'Patient list',
    rationale: 'Related reports share filter behavior.',
    execution: {
      difficulty: 'low',
      mode: 'delegate',
      reason: 'Bounded, independently testable change.',
    },
    analysis: 'The issue is caused by stale filter state.',
    issues,
    scope: ['frontend/src/features/patients/filter.ts'],
    acceptance: issues.map((issue) => ({ issue, criteria: [`Issue #${issue} is fixed`] })),
    tasks: [
      {
        title: 'Fix the state update',
        files: ['frontend/src/features/patients/filter.ts'],
        steps: ['Update state handling'],
      },
    ],
    verification: [
      { command: 'node', args: ['--test', 'frontend/src/features/patients/filter.test.mjs'] },
    ],
    evidence: evidencePlan(batch).evidence,
  };
}

function pngChunk(type, data) {
  const tag = Buffer.from(type);
  const crcInput = Buffer.concat([tag, data]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  tag.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(crcInput), 8 + data.length);
  return chunk;
}

function syntheticPng(seed = 1) {
  const width = 16;
  const height = 16;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc((1 + width * 3) * height);
  for (let row = 0; row < height; row += 1) {
    pixels[row * (1 + width * 3)] = 0;
    pixels.fill(seed % 255, row * (1 + width * 3) + 1, (row + 1) * (1 + width * 3));
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function makeEvidence(root, plan, { png = true, trace = true, seed = 1 } = {}) {
  for (const entry of plan.evidence) {
    if (png) {
      const file = path.join(root, entry.screenshot);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, syntheticPng(seed));
    }
    if (trace) {
      const file = path.join(root, entry.trace);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, await readFile(path.join(FIXTURE_DIR, 'trace.zip')));
    }
  }
}

test('validateEvidence accepts a valid synthetic PNG and a recorded Playwright trace and records content digests', async (t) => {
  const root = await tempDir(t);
  const plan = evidencePlan();
  await makeEvidence(root, plan);
  const evidence = await validateEvidence(root, plan);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].issue, 17);
  assert.match(evidence[0].files.screenshot.sha256, /^[a-f0-9]{64}$/);
  assert.match(evidence[0].files.trace.sha256, /^[a-f0-9]{64}$/);
  assert.ok(evidence[0].files.screenshot.bytes >= 16);
  assert.ok(evidence[0].files.trace.bytes >= 16);
});

test('validateEvidence rejects missing files, wrong headers, path traversal, and symlinks outside the packet', async (t) => {
  const root = await tempDir(t);
  const plan = evidencePlan();
  await makeEvidence(root, plan);
  const screenshot = path.join(root, plan.evidence[0].screenshot);
  await writeFile(screenshot, Buffer.concat([Buffer.from('not png'), Buffer.alloc(20)]));
  await assert.rejects(validateEvidence(root, plan), /invalid PNG evidence/);
  await writeFile(screenshot, syntheticPng(3));

  const trace = path.join(root, plan.evidence[0].trace);
  await writeFile(trace, Buffer.concat([Buffer.from('not zip'), Buffer.alloc(20)]));
  await assert.rejects(validateEvidence(root, plan), /invalid ZIP trace/);
  await rm(trace);
  await assert.rejects(validateEvidence(root, plan), /ENOENT/);
  await makeEvidence(root, plan, { trace: true });

  const outside = path.join(root, 'outside.png');
  await writeFile(
    outside,
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(20)]),
  );
  await rm(screenshot);
  await symlink(outside, screenshot);
  await assert.rejects(validateEvidence(root, plan), /contained regular file/);

  const traversal = evidencePlan();
  traversal.evidence[0].screenshot = '../outside.png';
  await assert.rejects(validateEvidence(root, traversal), /invalid relative path/);
});

test('validateEvidence rejects PNG signature filler and PNG/trace checksum corruption', async (t) => {
  const root = await tempDir(t);
  const plan = evidencePlan();
  await makeEvidence(root, plan);
  const screenshot = path.join(root, plan.evidence[0].screenshot);
  const trace = path.join(root, plan.evidence[0].trace);

  await writeFile(
    screenshot,
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16)]),
  );
  await assert.rejects(validateEvidence(root, plan), /PNG|checksum/);

  await writeFile(screenshot, syntheticPng(7));
  const png = await readFile(screenshot);
  // Flip the IHDR checksum while preserving the valid PNG chunk data.
  png[8 + 8 + 13] ^= 0x01;
  await writeFile(screenshot, png);
  await assert.rejects(validateEvidence(root, plan), /PNG checksum mismatch/);

  await writeFile(screenshot, syntheticPng(9));
  const zip = await readFile(trace);
  let eocd = -1;
  for (let index = zip.length - 22; index >= Math.max(0, zip.length - 65_557); index -= 1) {
    if (
      zip.readUInt32LE(index) === 0x06054b50 &&
      index + 22 + zip.readUInt16LE(index + 20) === zip.length
    ) {
      eocd = index;
      break;
    }
  }
  assert.ok(eocd >= 0, 'test fixture includes a ZIP central directory');
  let cursor = zip.readUInt32LE(eocd + 16);
  const count = zip.readUInt16LE(eocd + 10);
  let traceCrcOffset = -1;
  for (let entry = 0; entry < count; entry += 1) {
    assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString();
    if (name.endsWith('.trace')) {
      traceCrcOffset = cursor + 16;
      break;
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  assert.ok(traceCrcOffset >= 0, 'Playwright trace archive contains trace records');
  zip[traceCrcOffset] ^= 0x01;
  await writeFile(trace, zip);
  await assert.rejects(validateEvidence(root, plan), /trace checksum mismatch/);
});

async function git(cwd, ...args) {
  const result = await safeGitRunner({
    command: 'git',
    args,
    cwd,
    envMode: 'controller',
    timeoutMs: 10000,
    maxOutputBytes: 128 * 1024,
  });
  assert.equal(result.ok, true, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function gitFixture(t) {
  const root = await tempDir(t, 'clinicos-workspace-git-');
  const bare = path.join(root, 'remote.git');
  await git(root, 'init', '--bare', '--initial-branch=main', bare);
  const cwd = path.join(root, 'checkout');
  await mkdir(cwd);
  await git(cwd, 'init', '--initial-branch=main');
  await git(cwd, 'config', 'user.name', 'Pipeline test');
  await git(cwd, 'config', 'user.email', 'pipeline-test@example.invalid');
  await mkdir(path.join(cwd, 'frontend/src/features/patients'), { recursive: true });
  await writeFile(
    path.join(cwd, 'frontend/src/features/patients/filter.ts'),
    'export const filter = "before";\n',
  );
  await mkdir(path.join(cwd, 'node_modules'));
  await writeFile(path.join(cwd, 'node_modules/.present'), 'fixture\n');
  await writeFile(path.join(cwd, 'README.md'), 'baseline\n');
  await git(cwd, 'add', '.');
  await git(cwd, 'commit', '-m', 'fixture baseline');
  await git(cwd, 'remote', 'add', 'origin', bare);
  await git(cwd, 'push', '-u', 'origin', 'main');
  return { root: cwd };
}

test('real Git workspace prepares the exact batch branch, freezes its task packet, and regenerates evidence after clearing stale files', async (t) => {
  const { root } = await gitFixture(t);
  const batchId = 'bug-batch-17';
  const cwd = path.join(root, 'agent-team/.worktrees', batchId);
  const packet = path.join(cwd, 'artifacts/task-validation', batchId);
  const plan = implementationPlan([17]);
  let runNumber = 0;
  let staleSeen = null;
  const run = async (call) => {
    if (call.command === 'codex') {
      assert.equal(call.envMode, 'verification');
      const evidenceDir = path.join(cwd, 'artifacts/task-validation', batchId, 'evidence');
      staleSeen = await readFile(path.join(evidenceDir, 'old.png')).then(
        () => true,
        (error) => (error.code === 'ENOENT' ? false : Promise.reject(error)),
      );
      await makeEvidence(cwd, plan, { seed: ++runNumber });
      return { ok: true, code: 0, stdout: '# tests 1\n# pass 1\n', stderr: '' };
    }
    return safeGitRunner(call);
  };
  const workspace = createWorkspace({ root, repo: 'l2v-hub/ClinicOS', run, models: {} });
  const batch = {
    id: batchId,
    branch: 'codex/bug-batch-17',
    issues: [17],
    plan,
    implementation: [],
    reviews: [],
    sha: null,
  };
  await workspace.prepare(batch);
  assert.equal(await git(cwd, 'branch', '--show-current'), batch.branch);
  assert.match(batch.baseSha, /^[a-f0-9]{40}$/);
  assert.deepEqual(Object.keys(batch.packetHashes).sort(), [
    'analysis.md',
    'implementation-plan.md',
    'task-contract.md',
  ]);
  const initialContract = await readFile(path.join(packet, 'task-contract.md'), 'utf8');
  assert.match(initialContract, /READY FOR IMPLEMENTATION/);

  const evidenceDir = path.join(packet, 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, 'old.png'), 'stale evidence that must be removed');
  await workspace.verify(batch);
  assert.equal(staleSeen, false, 'stale screenshot is removed before verification runs');
  assert.equal(
    await readFile(path.join(evidenceDir, 'old.png')).then(
      () => true,
      () => false,
    ),
    false,
  );
  const firstDigest = batch.evidence[0].files.screenshot.sha256;
  assert.match(firstDigest, /^[a-f0-9]{64}$/);
  assert.ok(await readFile(path.join(packet, 'test-results/controller-verification.json'), 'utf8'));
  assert.ok(await readFile(path.join(packet, 'evidence-manifest.json'), 'utf8'));

  await workspace.verify(batch);
  assert.notEqual(
    batch.evidence[0].files.screenshot.sha256,
    firstDigest,
    'the second validation binds newly generated evidence',
  );

  await writeFile(
    path.join(packet, 'task-contract.md'),
    `${initialContract}\nmodified by executor\n`,
  );
  await assert.rejects(workspace.verify(batch), /changed the frozen contract or plan/);
});

test('real Git workspace rejects changes outside the accepted source-file scope', async (t) => {
  const { root } = await gitFixture(t);
  const batchId = 'bug-batch-17';
  const cwd = path.join(root, 'agent-team/.worktrees', batchId);
  const workspace = createWorkspace({
    root,
    repo: 'l2v-hub/ClinicOS',
    models: {},
    run: (call) => safeGitRunner(call),
  });
  const batch = {
    id: batchId,
    branch: 'codex/bug-batch-17',
    issues: [17],
    plan: implementationPlan([17]),
    sha: null,
  };
  await workspace.prepare(batch);
  await writeFile(path.join(cwd, 'README.md'), 'unauthorized modification\n');
  await assert.rejects(workspace.verify(batch), /executor edited outside accepted file scope/);
});
