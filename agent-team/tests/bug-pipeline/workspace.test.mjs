import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createRunner, childEnvironment } from '../../src/bug-pipeline/process.mjs';
import {
  runImplementationStages,
  validateEvidence,
  createWorkspace,
} from '../../src/bug-pipeline/workspace.mjs';
import { controllerFailureCode } from '../../src/bug-pipeline/github.mjs';
import { crc32 } from '../../src/bug-pipeline/evidence.mjs';

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../artifacts/task-validation/codex-triage-bug-github-e-piano-per-claude',
);
const safeGitRunner = createRunner({ env: { PATH: process.env.PATH }, runtimeRoot: os.tmpdir() });

test('executor and simplifier blocked stage results retain the implementation failure code', async () => {
  for (const blockedStep of ['execute', 'simplify']) {
    const batch = { id: `blocked-${blockedStep}`, plan: { steps: [] }, phase: 'implementing' };
    const called = [];
    const workspace = {
      execute: async () => {
        called.push('execute');
        return { status: blockedStep === 'execute' ? 'blocked' : 'implemented' };
      },
      verify: async () => called.push('verify'),
      simplify: async () => {
        called.push('simplify');
        return { status: 'blocked' };
      },
      qa: async () => ({ status: 'verified' }),
      checkpoint: async () => 'a'.repeat(40),
      publish: async () => {},
    };
    await assert.rejects(
      runImplementationStages({
        batch,
        workspace,
        context: { phase: 'implementation', round: 1 },
        save: async () => {},
      }),
      (error) => {
        assert.equal(controllerFailureCode(error), 'implementation-blocked');
        return true;
      },
    );
    assert.equal(called.includes(blockedStep), true);
  }
});

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
    'triage-index.md',
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

test('only verification receives the absolute trusted browser cache while HOME and credential boundaries remain isolated', () => {
  const env = {
    ...envWithSecrets(),
    PLAYWRIGHT_BROWSERS_PATH: '/trusted/clinicos-browser-cache',
    PLAYWRIGHT_UNRELATED_SETTING: 'must-not-forward',
    RAILWAY_DEMO_TOKEN: 'synthetic-private-demo-binding',
  };
  const child = childEnvironment('verification', env, '/tmp/browser-cache-proof');
  assert.equal(child.PLAYWRIGHT_BROWSERS_PATH, env.PLAYWRIGHT_BROWSERS_PATH);
  assert.equal(child.HOME, '/tmp/browser-cache-proof/verification-home');
  assert.equal(child.PLAYWRIGHT_UNRELATED_SETTING, undefined);
  assert.equal(child.RAILWAY_DEMO_TOKEN, undefined);
  for (const role of ['controller', 'model', 'review'])
    assert.equal(
      childEnvironment(role, env, '/tmp/browser-cache-proof').PLAYWRIGHT_BROWSERS_PATH,
      undefined,
    );
  for (const value of ['relative/cache', '0', '/cache\nother', '/cache\0other'])
    assert.throws(
      () =>
        childEnvironment(
          'verification',
          { ...env, PLAYWRIGHT_BROWSERS_PATH: value },
          '/tmp/browser-cache-proof',
        ),
      /absolute nonsecret path/,
    );
});

test('actual verification subprocess sees the trusted shared cache independently of isolated HOME', async (t) => {
  const root = await tempDir(t);
  const cache = path.join(root, 'trusted-browser-cache');
  const runner = createRunner({
    env: { ...envWithSecrets(), PLAYWRIGHT_BROWSERS_PATH: cache },
    runtimeRoot: path.join(root, 'runtime'),
  });
  const result = await runner({
    command: process.execPath,
    args: [
      '-e',
      'process.stdout.write(JSON.stringify({cache:process.env.PLAYWRIGHT_BROWSERS_PATH,home:process.env.HOME,gh:process.env.GH_TOKEN,api:process.env.CODEX_API_KEY}))',
    ],
    cwd: root,
    envMode: 'verification',
    timeoutMs: 3000,
  });
  assert.equal(result.ok, true, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    cache,
    home: path.join(root, 'runtime', 'verification-home'),
  });
});

test('trusted browser installation, controller and native sandbox service proof share the explicit cache before credentials', async () => {
  const workflow = await readFile(
    new URL('../../../.github/workflows/codex-bug-pipeline.yml', import.meta.url),
    'utf8',
  );
  const readiness = await readFile(
    new URL('../../../.github/workflows/bug-pipeline-tests.yml', import.meta.url),
    'utf8',
  );
  const native = await readFile(
    new URL('../../../scripts/quality-gate/verify-isolated-services.mjs', import.meta.url),
    'utf8',
  );
  const cache = 'PLAYWRIGHT_BROWSERS_PATH: ${{ runner.temp }}/clinicos-verification-browsers';
  for (const text of [workflow, readiness]) assert.equal(text.split(cache).length - 1, 2);
  assert.ok(
    workflow.indexOf('playwright/cli.js install --with-deps chromium') <
      workflow.indexOf('GH_TOKEN:'),
  );
  assert.ok(
    readiness.indexOf('playwright/cli.js install --with-deps chromium') <
      readiness.indexOf('run: node scripts/quality-gate/verify-isolated-services.mjs'),
  );
  assert.match(native, /chromium\.launch\(/);
  assert.match(native, /await page\.reload\(\)/);
  assert.match(native, /inputValue\(\)/);
  for (const name of [
    'connectDenied',
    'udpDenied',
    "proxyStatus('GET')",
    "proxyStatus('CONNECT')",
    'failure.code, 7',
  ])
    assert.ok(native.includes(name), `native proof must retain ${name}`);
  assert.doesNotMatch(
    native,
    /ignoreHTTPSErrors|ignore-certificate|disable-web-security|--no-sandbox/,
  );
});

test('post-Claude independent final QA leaves a real reviewed worktree clean for a correction', async (t) => {
  const { root } = await gitFixture(t);
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    plan: implementationPlan([17]),
    implementation: [],
    reviews: [],
    sha: null,
  };
  const workspace = createWorkspace({
    root,
    repo: 'l2v-hub/ClinicOS',
    run: safeGitRunner,
    models: {
      qa: async () => ({
        status: 'blocked',
        summary: 'A real independent finding requires correction.',
      }),
    },
  });
  await workspace.prepare(batch);
  const cwd = path.join(root, 'agent-team/.worktrees', batch.id);
  const packet = path.join('artifacts/task-validation', batch.id);
  await writeFile(
    path.join(cwd, packet, 'codex-independent-qa.md'),
    'Existing immutable reviewed evidence\n',
  );
  await git(cwd, 'add', packet);
  await git(cwd, 'commit', '-m', 'Freeze reviewed fixture and evidence');
  batch.sha = (await git(cwd, 'rev-parse', 'HEAD')).trim();
  const before = await readFile(path.join(cwd, packet, 'codex-independent-qa.md'), 'utf8');
  assert.equal((await workspace.finalQa(batch)).status, 'blocked');
  assert.equal(await readFile(path.join(cwd, packet, 'codex-independent-qa.md'), 'utf8'), before);
  assert.equal((await git(cwd, 'status', '--porcelain')).trim(), '');
  await workspace.prepare(batch);
  assert.equal((await git(cwd, 'rev-parse', 'HEAD')).trim(), batch.sha);
});

test('standalone final QA creates an exact detached source checkout without installing or executing PR code', async (t) => {
  const { root } = await gitFixture(t);
  const sha = (await git(root, 'rev-parse', 'HEAD')).trim();
  const subject = {
    id: 'standalone-pr-81',
    sha,
    baseSha: sha,
    packet: { path: 'artifacts/task-validation/review-81', files: {} },
    sourceManifest: [{ path: 'src/feature.ts' }],
    implementation: [{ round: 1, status: 'passed', subjectSha: sha }],
  };
  const calls = [];
  const workspace = createWorkspace({
    root,
    repo: 'l2v-hub/ClinicOS',
    run: async (options) => {
      calls.push(options);
      assert.equal(options.command, 'git');
      return safeGitRunner(options);
    },
    models: {
      qa: async (options) => {
        assert.equal((await git(options.cwd, 'rev-parse', 'HEAD')).trim(), sha);
        assert.equal(options.plan.mode, 'standalone-read-only');
        assert.equal(options.packet, subject.packet.path);
        assert.match(options.plan.constraints, /Never execute PR code/);
        return { status: 'verified', summary: 'Source and evidence only.' };
      },
    },
  });
  assert.equal((await workspace.finalQaStandalone(subject)).status, 'verified');
  const checkout = calls.find((c) => c.args.includes('add'));
  assert.ok(checkout.args.includes('--detach'));
  assert.ok(checkout.args.includes('core.hooksPath=/dev/null'));
  assert.equal(
    calls.some((c) => c.command === 'npm'),
    false,
  );
  const cwd = path.join(root, 'agent-team', '.worktrees', `${subject.id}-${sha}`);
  await writeFile(path.join(cwd, 'untracked-sentinel'), 'owned test fixture');
  await assert.rejects(workspace.finalQaStandalone(subject), /checkout changed/);
});

// A valid stored ZIP with recorded actions and a large resource, without fixture credentials.
function boundedTrace(size) {
  const action = Buffer.from('{"type":"before","apiName":"page.goto"}\n{"type":"after"}\n');
  const names = ['test.trace', 'resources/synthetic.bin'];
  const overhead =
    22 + names.reduce((n, name) => n + 30 + 46 + 2 * Buffer.byteLength(name), 0) + action.length;
  const payloads = [action, Buffer.alloc(size - overhead, 17)];
  let offset = 0;
  const locals = [],
    central = [];
  for (let i = 0; i < names.length; i++) {
    const name = Buffer.from(names[i]),
      payload = payloads[i],
      crc = crc32(payload);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(payload.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    const entry = Buffer.alloc(46 + name.length);
    entry.writeUInt32LE(0x02014b50);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(payload.length, 20);
    entry.writeUInt32LE(payload.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    name.copy(entry, 46);
    locals.push(local, payload);
    central.push(entry);
    offset += local.length + payload.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

test('evidence collector accepts valid trace at 32MiB and rejects a byte above it before ZIP parsing', async (t) => {
  const { MAX_EVIDENCE_BYTES } = await import('../../src/bug-pipeline/evidence-limits.mjs');
  const root = await tempDir(t),
    plan = evidencePlan(5);
  await makeEvidence(root, plan, { trace: false });
  const target = path.join(root, plan.evidence[0].trace);
  await mkdir(path.dirname(target), { recursive: true });
  const bytes = boundedTrace(MAX_EVIDENCE_BYTES);
  await writeFile(target, bytes);
  const collected = await validateEvidence(root, plan);
  assert.equal(collected[0].files.trace.bytes, MAX_EVIDENCE_BYTES);
  assert.match(collected[0].files.trace.sha256, /^[a-f0-9]{64}$/);
  await writeFile(target, Buffer.concat([bytes, Buffer.from([0])]));
  await assert.rejects(validateEvidence(root, plan), /exceeds GitHub size budget/);
});

test('Author7 F3 retained controller checkpoint accepts exact dirty output and rejects changed, unknown, frozen or lost output', async (t) => {
  const { root } = await gitFixture(t),
    plan = implementationPlan([17]);
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    plan,
    implementation: [],
    reviews: [],
    sha: null,
  };
  const workspace = createWorkspace({
    root,
    repo: 'l2v-hub/ClinicOS',
    run: safeGitRunner,
    models: {},
  });
  await workspace.prepare(batch);
  const cwd = path.join(root, 'agent-team/.worktrees', batch.id),
    file = path.join(cwd, plan.scope[0]);
  await writeFile(file, 'export const filter="controller output";\n');
  const checkpoint = await workspace.captureCheckpoint(batch);
  await workspace.resume(batch, checkpoint);
  await assert.rejects(
    workspace.prepare(batch),
    /clean expected batch/,
    'Ordinary prepare still rejects dirty output',
  );
  await writeFile(file, 'export const filter="foreign dirt";\n');
  await assert.rejects(workspace.resume(batch, checkpoint), /missing or changed/);
  await writeFile(file, 'export const filter="controller output";\n');
  const unknown = path.join(cwd, 'foreign.ts');
  await writeFile(unknown, 'foreign');
  await assert.rejects(workspace.resume(batch, checkpoint), /outside accepted/);
  await rm(unknown);
  const frozen = path.join(cwd, 'artifacts/task-validation', batch.id, 'implementation-plan.md');
  await writeFile(frozen, 'changed frozen plan');
  await assert.rejects(workspace.resume(batch, checkpoint), /frozen contract or plan/);
  await rm(cwd, { recursive: true, force: true });
  await assert.rejects(workspace.resume(batch, checkpoint));
});

async function author7RetainedWorktree(t, lost = false) {
  const { runPipeline } = await import('../../src/bug-pipeline/pipeline.mjs');
  const { authorizeObservationResume } =
    await import('../../src/bug-pipeline/operator-authorization.mjs');
  const { root } = await gitFixture(t),
    plan = implementationPlan([17]),
    repo = 'l2v-hub/ClinicOS';
  plan.verification.push({ command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] });
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    plan,
    phase: 'planned',
    implementation: [],
    reviews: [],
    sha: null,
    pr: null,
  };
  let remote = { schemaVersion: 1, repository: repo, batches: [batch] },
    execute = 0,
    simplify = 0,
    fail = true;
  const copy = (v) => structuredClone(v);
  const store = {
    load: async () => copy(remote),
    save: async (state) => {
      remote = copy(state);
    },
    observe: async () => {
      if (fail && remote.batches[0].phase === 'validating') {
        fail = false;
        throw Object.assign(new Error('sanitized observation timeout'), {
          code: 'github-read-transient',
          retryable: true,
          operation: 'read',
        });
      }
      return copy(remote);
    },
  };
  const workspace = createWorkspace({
    root,
    repo,
    run: async (call) => {
      if (call.command === 'codex') {
        await makeEvidence(call.cwd, plan);
        return { ok: true, code: 0, stdout: '# tests 1\n# pass 1\n', stderr: '' };
      }
      return safeGitRunner(call);
    },
    models: {
      execute: async ({ cwd }) => {
        execute++;
        await writeFile(path.join(cwd, plan.scope[0]), 'export const filter="fixed";\n');
        return { status: 'implemented' };
      },
      simplify: async () => {
        simplify++;
        return { status: 'implemented' };
      },
      qa: async () => ({ status: 'verified', summary: 'Exact synthetic evidence' }),
    },
  });
  workspace.review = async (b) => ({
    subject_sha: b.sha,
    verdict: 'approved',
    summary: 'Synthetic independent review',
    findings: [],
  });
  const gh = {
    intake: async () => {},
    discoverQueue: async () => [],
    setIssueStatus: async () => {},
    commentIssue: async () => {},
    commentPR: async () => {},
    viewIssue: async (n) => ({ number: n, state: 'open', labels: ['bug', 'codex-run'] }),
    createDraft: async () => ({ number: 81, url: `https://github.com/${repo}/pull/81` }),
    reviewFeedback: async () => {
      const b = remote.batches[0];
      return {
        state: 'OPEN',
        head: b.sha,
        headRef: b.branch,
        headRepo: repo,
        headIsFork: false,
        baseRef: 'main',
        comments: [],
        unresolved: false,
        changesRequested: false,
      };
    },
    requiredChecks: async () => ({ ok: true }),
  };
  await runPipeline({ repo, event: {}, gh, workspace, models: {}, store, triageWindowMs: 0 });
  let current = remote.batches[0];
  assert.equal(execute, 1);
  assert.equal(simplify, 0);
  assert.equal(current.implementation.length, 1);
  assert.equal(current.implementation[0].status, 'running');
  assert.equal(current.controllerProgress.next, 1);
  assert.equal(current.phase, 'blocked');
  assert.equal(current.controllerProgress.status, 'interrupted');
  const frozen = copy(remote);
  await assert.rejects(
    authorizeObservationResume({
      state: remote,
      subject: current,
      actor: 'maintainer',
      reference: 'test:resume',
      reason: 'Retained exact output',
    }),
    /verifier unavailable/,
  );
  assert.deepEqual(remote, frozen);
  await authorizeObservationResume({
    state: remote,
    subject: current,
    actor: 'maintainer',
    reference: 'test:resume',
    reason: 'Retained exact output',
    verifier: async ({ binding }) => ({
      provenance: 'user-session',
      grantId: 'test:grant',
      sourceRef: 'test:session',
      consumptionNonce: 'test:consume-resume',
      binding,
    }),
  });
  await assert.rejects(
    authorizeObservationResume({
      state: remote,
      subject: current,
      actor: 'maintainer',
      reference: 'test:resume',
      reason: 'No replay',
    }),
    /already authorized/,
  );
  if (lost)
    await rm(path.join(root, 'agent-team/.worktrees', batch.id), { recursive: true, force: true });
  await runPipeline({ repo, event: {}, gh, workspace, models: {}, store, triageWindowMs: 0 });
  current = remote.batches[0];
  if (lost) {
    assert.equal(execute, 1);
    assert.equal(simplify, 0);
    assert.equal(current.implementation.length, 1);
    assert.equal(current.phase, 'blocked');
    assert.notEqual(current.controllerProgress.status, 'completed');
    return;
  }
  assert.equal(execute, 1, 'Completed execute is not repeated');
  assert.equal(simplify, 1);
  assert.equal(current.implementation.length, 1);
  assert.equal(current.implementation[0].status, 'passed');
  assert.equal(current.phase, 'ready');
  assert.equal(current.controllerProgress.status, 'completed');
}

test(
  'Author7 F3 real retained worktree resumes the same attempt after execute without replaying its paid model',
  { timeout: 10000 },
  (t) => author7RetainedWorktree(t),
);
test(
  'Author7 F3 lost Actions worktree fails closed after authorized recovery without replaying a completed model',
  { timeout: 10000 },
  (t) => author7RetainedWorktree(t, true),
);

for (const failure of ['execute', 'simplify', 'qa', 'verify-before', 'verify-after'])
  test(`Author9 F2 definite ${failure} failure records the failed step and preserves its journal`, async () => {
    const batch = {
      id: 'journal',
      plan: {},
      sha: 'a'.repeat(40),
      implementation: [{ round: 1, status: 'running' }],
    };
    let verified = 0;
    const workspace = {
      execute: async () => ({ status: failure === 'execute' ? 'blocked' : 'implemented' }),
      simplify: async () => ({ status: failure === 'simplify' ? 'blocked' : 'implemented' }),
      qa: async () => ({ status: failure === 'qa' ? 'blocked' : 'verified' }),
      verify: async () => {
        if (++verified === (failure === 'verify-after' ? 2 : 1) && failure.startsWith('verify'))
          throw new Error('required verification failed or executed no tests');
      },
      checkpoint: async () => 'b'.repeat(40),
      publish: async () => {},
    };
    const call = () =>
      runImplementationStages({
        batch,
        workspace,
        save: async () => {},
        context: { phase: 'pr-feedback', round: 1, implementationRound: 1 },
      });
    await assert.rejects(call());
    assert.equal(batch.controllerProgress.status, 'failed');
    assert.equal(batch.controllerProgress.failedStep, failure);
    const original = structuredClone(batch.controllerProgress);
    batch.implementation[0].status = 'failed';
    batch.implementation.push({ round: 2, status: 'running' });
    workspace.execute = workspace.simplify = async () => ({ status: 'implemented' });
    workspace.qa = async () => ({ status: 'verified' });
    workspace.verify = async () => {};
    await runImplementationStages({
      batch,
      workspace,
      save: async () => {},
      context: { phase: 'pr-feedback', round: 2, implementationRound: 2 },
    });
    assert.deepEqual(batch.controllerProgressHistory, [original]);
    assert.equal(batch.controllerProgress.status, 'completed');
  });

for (const failure of [
  'model-execution',
  'model-result',
  'arbitrary-execute',
  'blocked-code-throw',
  'malformed-result',
  'before-stage',
  'pending-save',
  'post-stage-save',
  'initial-capture',
  'post-capture',
  'checkpoint',
  'publish',
  'ownership-invalid',
])
  test(`Author9 F2 ${failure} retains a running unknown outcome and cannot invoke a second worker`, async () => {
    const batch = { id: 'unknown', plan: {}, implementation: [{ round: 1, status: 'running' }] };
    let execute = 0,
      saves = 0,
      captures = 0;
    const fail = (code) => {
      throw Object.assign(new Error('Unknown synthetic outcome'), code ? { code } : {});
    };
    const workspace = {
      execute: async () => {
        execute++;
        if (failure === 'model-execution') fail('model-execution-failed');
        if (failure === 'model-result') fail('model-result-invalid');
        if (failure === 'arbitrary-execute') fail();
        if (failure === 'blocked-code-throw') fail('implementation-blocked');
        if (failure === 'ownership-invalid') fail('ownership-observation-invalid');
        return failure === 'malformed-result' ? {} : { status: 'implemented' };
      },
      simplify: async () => ({ status: 'implemented' }),
      verify: async () => {},
      qa: async () => ({ status: 'verified' }),
      checkpoint: async () => {
        if (failure === 'checkpoint') fail();
        return 'a'.repeat(40);
      },
      publish: async () => {
        if (failure === 'publish') fail();
      },
      captureCheckpoint: async () => {
        captures++;
        if (
          (failure === 'initial-capture' && captures === 1) ||
          (failure === 'post-capture' && captures === 2)
        )
          fail();
        return { exact: true };
      },
    };
    const call = () =>
      runImplementationStages({
        batch,
        workspace,
        save: async () => {
          saves++;
          if (
            (failure === 'pending-save' && saves === 1) ||
            (failure === 'post-stage-save' && saves === 2)
          )
            fail('state-write-uncertain');
        },
        beforeStage: async () => {
          if (failure === 'before-stage') fail();
        },
        context: { phase: 'external-review-correction', round: 1, implementationRound: 1 },
      });
    await assert.rejects(call());
    assert.equal(batch.controllerProgress.status, 'running');
    assert.equal(batch.controllerProgress.failedStep, undefined);
    const calls = execute;
    await assert.rejects(call(), /Unknown implementation outcome/);
    assert.equal(execute, calls);
  });

for (const outcome of [
  'exact',
  'changed',
  'missing',
  'foreign',
  'frozen',
  'capture-failure',
  'unknown',
  'scope-invalid',
])
  test(`Author9 F2 real failed correction worktree ${outcome} requires exact retained output before another paid call`, async (t) => {
    const { reserveImplementation, historyDigest } =
      await import('../../src/bug-pipeline/attempt-budget.mjs');
    const { createCommentReviewHandoff } =
      await import('../../src/bug-pipeline/comment-review-handoff.mjs');
    const { root } = await gitFixture(t),
      repo = 'l2v-hub/ClinicOS';
    const plan = implementationPlan([17]);
    plan.fileMap = [{ issue: 17, files: [...plan.scope] }];
    plan.separationReason = '';
    plan.verification.push({ command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] });
    let batch = {
      id: 'bug-batch-17',
      branch: 'codex/bug-batch-17',
      issues: [17],
      plan,
      phase: 'waiting-review',
      implementation: [1, 2, 3].map((round) => ({ round, status: 'passed' })),
      reviews: [],
      pr: { number: 81, url: `https://github.com/${repo}/pull/81` },
    };
    let fixed = false,
      paid = 0;
    const cwd = path.join(root, 'agent-team/.worktrees', batch.id),
      file = path.join(cwd, plan.scope[0]);
    const workspace = createWorkspace({
      root,
      repo,
      run: async (call) => {
        if (call.command === 'codex') {
          if (!fixed) return { ok: false, code: 1, stdout: '# tests 1\n# fail 1\n', stderr: '' };
          await makeEvidence(cwd, plan);
          return { ok: true, code: 0, stdout: '# tests 1\n# pass 1\n', stderr: '' };
        }
        return safeGitRunner(call);
      },
      models: {
        execute: async () => {
          paid++;
          await writeFile(file, `export const filter = "owned correction ${paid}";\n`);
          if (outcome === 'scope-invalid' && paid === 1)
            await writeFile(path.join(cwd, 'foreign.ts'), 'outside accepted scope');
          if (outcome === 'unknown')
            throw Object.assign(new Error('Unconfirmed model outcome'), {
              code: 'model-execution-failed',
            });
          return { status: 'implemented', summary: 'Synthetic implementation' };
        },
        simplify: async () => ({ status: 'implemented', summary: 'Synthetic simplification' }),
        qa: async () => ({ status: 'verified', summary: 'Synthetic independent QA' }),
      },
    });
    await workspace.prepare(batch);
    batch.sha = batch.baseSha;
    if (outcome === 'scope-invalid') batch.sha = await workspace.checkpoint(batch);
    const capture = workspace.captureCheckpoint;
    let captures = 0;
    workspace.captureCheckpoint = async (b) => {
      if (++captures === 3 && outcome === 'capture-failure')
        throw new Error('Failed exact output capture');
      return capture(b);
    };
    const first = reserveImplementation(batch);
    await assert.rejects(
      runImplementationStages({
        batch,
        workspace,
        save: async () => {},
        context: {
          phase: 'pr-feedback',
          round: first.round,
          implementationRound: first.round,
          feedback: { finding: 'Retain this exact finding' },
        },
      }),
    );
    batch.phase = 'blocked';
    if (batch.controllerProgress.status !== 'failed') {
      assert.ok(['capture-failure', 'unknown'].includes(outcome));
      assert.equal(first.status, 'running');
      assert.equal(batch.controllerProgress.status, 'running');
      await assert.rejects(workspace.prepare(batch), /clean expected batch/);
      await assert.rejects(
        runImplementationStages({
          batch,
          workspace,
          save: async () => {},
          context: { phase: 'pr-feedback', round: first.round },
        }),
        /Unknown implementation outcome/,
      );
      assert.equal(paid, 1);
      return;
    }
    assert.ok(!['capture-failure', 'unknown'].includes(outcome));
    first.status = 'failed';
    batch.failureCode = batch.controllerProgress.failureCode;
    const retained = structuredClone(batch.controllerProgress);
    if (outcome === 'scope-invalid') {
      assert.equal(retained.checkpoint, undefined);
      assert.equal(retained.failedStep, 'verify-before');
      assert.equal(retained.failureCode, 'workspace-scope-invalid');
    } else {
      assert.equal(retained.checkpoint.head, batch.sha);
      assert.equal(retained.checkpoint.output[plan.scope[0]].sha256.length, 64);
    }
    let canonical = { schemaVersion: 1, repository: repo, batches: [structuredClone(batch)] };
    const store = {
      load: async () => structuredClone(canonical),
      save: async (state, options) => {
        await options?.guard?.();
        canonical = structuredClone(state);
      },
    };
    const github = {
      createStateStore: () => store,
      authorized: async () => true,
      authorizedMaintainer: async () => true,
      reviewFeedback: async () => ({
        state: 'OPEN',
        isDraft: false,
        head: batch.sha,
        headRef: batch.branch,
        headRepo: repo,
        headIsFork: false,
        baseRef: 'main',
      }),
      viewIssue: async () => ({ state: 'open' }),
    };
    const handoff = createCommentReviewHandoff({
      github,
      cwd: root,
      run: async () => ({ ok: true, stdout: JSON.stringify({ login: 'maintainer' }) }),
      authorizationVerifier: async ({ binding }) => ({
        provenance: 'user-session',
        grantId: 'test:worktree',
        sourceRef: 'test:session',
        consumptionNonce: 'test:worktree-grant',
        binding,
      }),
    });
    const resume = () =>
      handoff.recover(81, {
        action: 'resume',
        expectedSha: batch.sha,
        token: historyDigest({ phase: 'blocked', failureCode: batch.failureCode }),
        reason: 'Audited exact retained correction',
      });
    await assert.rejects(resume(), /allowances/);
    await handoff.extendBudget(81, {
      kind: 'implementation',
      limit: 5,
      authorizationRef: 'test:worktree',
      reason: 'One new correction with exact retained output',
    });
    batch = await resume();
    if (outcome === 'changed')
      await writeFile(file, 'export const filter = "foreign modification";\n');
    if (outcome === 'missing') await rm(cwd, { recursive: true, force: true });
    if (outcome === 'foreign') await writeFile(path.join(cwd, 'foreign.ts'), 'foreign');
    if (outcome === 'frozen')
      await writeFile(
        path.join(cwd, 'artifacts/task-validation', batch.id, 'implementation-plan.md'),
        'changed frozen plan',
      );
    if (outcome === 'scope-invalid') {
      await assert.rejects(workspace.prepare(batch), /outside accepted/);
      assert.equal(paid, 1, 'An allowance never makes invalid output reusable');
      await rm(path.join(cwd, 'foreign.ts'));
      await git(cwd, 'restore', '--', plan.scope[0]);
      await rm(path.join(cwd, 'artifacts/task-validation', batch.id, 'review-feedback.json'));
    }
    if (!['exact', 'scope-invalid'].includes(outcome)) {
      await assert.rejects(workspace.prepare(batch));
      assert.equal(paid, 1);
      assert.equal(batch.implementation.length, 4);
      return;
    }
    await workspace.prepare(batch);
    assert.equal(paid, 1);
    fixed = true;
    const next = reserveImplementation(batch);
    await runImplementationStages({
      batch,
      workspace,
      save: async () => {},
      context: {
        phase: 'pr-feedback',
        round: next.round,
        implementationRound: next.round,
        feedback: retained.feedback,
      },
    });
    next.status = 'passed';
    assert.equal(paid, 2);
    assert.equal(next.round, 5);
    assert.deepEqual(batch.controllerProgressHistory, [retained]);
    assert.equal(batch.controllerProgress.status, 'completed');
    assert.equal(batch.implementation[3].status, 'failed');
    assert.notEqual(batch.sha, retained.sourceSha);
  });

for (const invalid of ['outside-scope', 'symlink', 'frozen-contract']) {
  test(`Claude504 real ${invalid} failure consumes initial attempts inside the native retry budget`, async (t) => {
    const { runPipeline } = await import('../../src/bug-pipeline/pipeline.mjs');
    const { root } = await gitFixture(t),
      plan = implementationPlan([17]);
    const repo = 'l2v-hub/ClinicOS';
    plan.verification.push({ command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] });
    let remote = {
      schemaVersion: 1,
      repository: repo,
      batches: [
        {
          id: 'bug-batch-17',
          branch: 'codex/bug-batch-17',
          issues: [17],
          plan,
          phase: 'planned',
          implementation: [],
          reviews: [],
          sha: null,
          pr: null,
        },
      ],
    };
    let paid = 0,
      frozen;
    const snapshots = [];
    const workspace = createWorkspace({
      root,
      repo,
      run: async (call) => {
        if (call.command !== 'codex') return safeGitRunner(call);
        await makeEvidence(call.cwd, plan);
        return { ok: true, code: 0, stdout: '# tests 1\n# pass 1\n', stderr: '' };
      },
      models: {
        execute: async ({ cwd }) => {
          paid++;
          const file = path.join(cwd, plan.scope[0]);
          const contract = path.join(
            cwd,
            'artifacts/task-validation/bug-batch-17/task-contract.md',
          );
          if (paid === 1) {
            if (invalid === 'outside-scope')
              await writeFile(path.join(cwd, 'foreign.ts'), 'foreign');
            if (invalid === 'symlink') {
              await rm(file);
              await symlink(path.join(root, 'README.md'), file);
            }
            if (invalid === 'frozen-contract') {
              frozen = await readFile(contract);
              await writeFile(contract, 'changed frozen contract');
            }
          } else {
            if (invalid === 'outside-scope') await rm(path.join(cwd, 'foreign.ts'));
            if (invalid === 'symlink') await rm(file);
            if (invalid === 'frozen-contract') await writeFile(contract, frozen);
            await writeFile(file, 'export const filter = "fixed";\n');
          }
          return { status: 'implemented' };
        },
        simplify: async () => ({ status: 'implemented' }),
        qa: async () => ({ status: 'verified', summary: 'Synthetic QA' }),
      },
    });
    const gh = {
      intake: async () => {},
      discoverQueue: async () => [],
      setIssueStatus: async () => {},
      commentIssue: async () => {},
      commentPR: async () => {},
      viewIssue: async (number) => ({ number, state: 'open', labels: ['bug', 'codex-run'] }),
      createDraft: async () => ({ number: 81, url: `https://github.com/${repo}/pull/81` }),
      requiredChecks: async () => ({ ok: true }),
      reviewFeedback: async () => ({
        state: 'OPEN',
        head: remote.batches[0].sha,
        headRef: remote.batches[0].branch,
        headRepo: repo,
        headIsFork: false,
        baseRef: 'main',
        comments: [],
        unresolved: false,
        changesRequested: false,
      }),
    };
    const store = {
      load: async () => structuredClone(remote),
      save: async (state) => {
        remote = structuredClone(state);
        snapshots.push(structuredClone(state.batches[0]));
      },
    };
    workspace.review = async (batch) => ({
      subject_sha: batch.sha,
      verdict: 'approved',
      summary: 'Synthetic independent review',
      findings: [],
    });
    await runPipeline({ repo, event: {}, gh, workspace, models: {}, store });
    const batch = remote.batches[0];
    assert.equal(paid, 2);
    assert.deepEqual(
      batch.implementation.map((entry) => entry.status),
      ['failed', 'passed'],
    );
    const failure = batch.controllerProgressHistory[0];
    assert.equal(failure.status, 'failed');
    assert.equal(failure.failedStep, 'verify-before');
    assert.equal(failure.failureCode, 'workspace-scope-invalid');
    assert.equal(
      failure.checkpoint,
      undefined,
      'Invalid output never becomes a resumable checkpoint',
    );
    assert.ok(
      snapshots.some(
        (item) =>
          item.controllerProgress?.status === 'failed' &&
          item.implementation[0].status === 'failed',
      ),
      'Failure is durably saved before retry',
    );
    assert.equal(batch.controllerProgress.status, 'completed');
    assert.equal(batch.phase, 'ready');
  });
}

for (const invalid of ['empty', 'oversize', 'noncontained', 'video', 'symlink-directory']) {
  test(`Claude504 real ${invalid} evidence is a typed definite validation failure`, async (t) => {
    const { root } = await gitFixture(t),
      plan = implementationPlan([17]);
    const { MAX_EVIDENCE_BYTES } = await import('../../src/bug-pipeline/evidence-limits.mjs');
    const { open } = await import('node:fs/promises');
    const batch = {
      id: 'bug-batch-17',
      branch: 'codex/bug-batch-17',
      issues: [17],
      plan,
      implementation: [{ round: 1, status: 'running' }],
      reviews: [],
    };
    const cwd = path.join(root, 'agent-team/.worktrees', batch.id);
    const workspace = createWorkspace({
      root,
      repo: 'l2v-hub/ClinicOS',
      models: {
        execute: async () => {
          if (invalid === 'symlink-directory') {
            const outside = await tempDir(t);
            await symlink(
              outside,
              path.join(cwd, 'artifacts/task-validation', batch.id, 'evidence'),
            );
          }
          return { status: 'implemented' };
        },
      },
      run: async (call) => {
        if (call.command !== 'codex') return safeGitRunner(call);
        await makeEvidence(cwd, plan);
        const screenshot = path.join(cwd, plan.evidence[0].screenshot);
        if (invalid === 'empty') await writeFile(screenshot, '');
        if (invalid === 'oversize') {
          const handle = await open(screenshot, 'w');
          await handle.truncate(MAX_EVIDENCE_BYTES + 1);
          await handle.close();
        }
        if (invalid === 'noncontained') {
          const outside = await tempDir(t);
          await makeEvidence(outside, plan);
          await rm(screenshot);
          await symlink(path.join(outside, plan.evidence[0].screenshot), screenshot);
        }
        if (invalid === 'video') {
          plan.evidence[0].video = plan.evidence[0].screenshot.replace('.png', '.webm');
          await writeFile(path.join(cwd, plan.evidence[0].video), Buffer.alloc(32));
        }
        return { ok: true, code: 0, stdout: '# tests 1\n# pass 1\n', stderr: '' };
      },
    });
    if (invalid === 'video')
      plan.evidence[0].video = plan.evidence[0].screenshot.replace('.png', '.webm');
    await workspace.prepare(batch);
    await assert.rejects(
      runImplementationStages({
        batch,
        workspace,
        save: async () => {},
        context: { phase: 'implementation', round: 1, implementationRound: 1 },
      }),
      (error) => error.code === 'workspace-evidence-invalid',
    );
    assert.equal(batch.controllerProgress.status, 'failed');
    assert.equal(batch.controllerProgress.failedStep, 'verify-before');
    assert.equal(batch.controllerProgress.failureCode, 'workspace-evidence-invalid');
    assert.equal(batch.implementation[0].status, 'failed');
    assert.equal(batch.controllerProgress.checkpoint, undefined);
  });
}
