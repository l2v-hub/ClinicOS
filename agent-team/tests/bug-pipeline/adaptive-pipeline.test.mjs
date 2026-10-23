import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkspace, runImplementationStages } from '../../src/bug-pipeline/workspace.mjs';
import { createWorkItemsEnvelope } from '../../src/bug-pipeline/work-items.mjs';
import { reserveImplementation } from '../../src/bug-pipeline/attempt-budget.mjs';

const exec = promisify(execFile);
const context = { phase: 'implementation', round: 1, implementationRound: 1 };
const profile = {
  id: 'fixture-senior',
  provider: 'codex',
  model: 'synthetic-editor',
  tier: 'senior',
  ready: true,
  limit: 2,
  availability: 'cli-preflight-not-inference-verified',
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

// Only the provider and sandbox process boundaries are synthetic. The caller,
// stage journal, scope checks, child worktrees, commits and local push are real.
async function fixture(t, { adaptive = true, ids = ['a', 'b', 'c'] } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'clinicos-adaptive-caller-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'repo'),
    remote = path.join(directory, 'origin.git');
  await mkdir(root);
  const env = {
    PATH: process.env.PATH,
    HOME: directory,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Synthetic controller',
    GIT_COMMITTER_NAME: 'Synthetic controller',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  };
  const commands = [],
    events = [],
    durableFile = path.join(directory, 'durable.json');
  const processRun = async (command, args, cwd) => {
    try {
      const r = await exec(command, args, { cwd, env });
      return { ok: true, stdout: r.stdout, stderr: r.stderr };
    } catch (error) {
      return {
        ok: false,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
        code: error.code,
      };
    }
  };
  const git = async (args, cwd = root) => {
    const result = await processRun(
      'git',
      ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args],
      cwd,
    );
    assert(result.ok, `fixture Git failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  await git(['init', '-b', 'main']);
  await git(['init', '--bare', remote]);
  await writeFile(path.join(root, '.gitignore'), 'node_modules/\nagent-team/.worktrees/\n');
  for (const id of ids) await writeFile(path.join(root, `${id}.txt`), `baseline-${id}\n`);
  await writeFile(
    path.join(root, 'fixture.test.mjs'),
    `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\ntest('integrated accepted files', async () => {\n  for (const id of ${JSON.stringify(ids)}) assert.equal(await readFile(id + '.txt', 'utf8'), 'fixed-' + id + '\\n');\n});\n`,
  );
  await git(['add', '.']);
  await git(['commit', '-m', 'synthetic baseline']);
  await git(['remote', 'add', 'origin', remote]);
  await git(['push', 'origin', 'main']);
  const baseSha = await git(['rev-parse', 'HEAD']);
  const plan = {
    title: 'Synthetic integration',
    feature: 'Caller fixture',
    rationale: 'Independent files with an explicit predecessor',
    analysis: 'Synthetic accepted ticket',
    issues: [17],
    scope: ids.map((id) => `${id}.txt`),
    tasks: ids.map((id) => ({
      title: `Change ${id}`,
      files: [`${id}.txt`],
      steps: ['Apply criterion'],
    })),
    acceptance: [{ issue: 17, criteria: ids.map((id) => `Change ${id}`) }],
    verification: [{ command: 'node', args: ['--test', 'fixture.test.mjs'] }],
    evidence: [],
  };
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    issues: [17],
    baseSha,
    plan,
    implementation: [{ round: 1, status: 'running' }],
    reviews: [],
  };
  if (adaptive)
    batch.workItems = createWorkItemsEnvelope(
      {
        issues: [17],
        nodes: ids.map((id, index) => ({
          id,
          title: `Change ${id}`,
          issues: [17],
          taskIndexes: [index],
          criteriaRefs: [{ issue: 17, index }],
          dependsOn: id === 'c' ? ['a'] : [],
          scope: [`${id}.txt`],
          readFiles: [],
          difficulty: 'low',
          risk: { level: 'low', reason: 'Synthetic bounded edit' },
          coupling: { level: 'ordered', reason: 'Explicit file dependency' },
          conflictKeys: [],
          routePreference: 'auto',
          verificationIndexes: [0],
          summary: `Change ${id}`,
        })),
      },
      {
        plan,
        issues: [{ number: 17, title: 'Synthetic issue', body: 'Precise task', comments: [] }],
      },
    );
  const cwd = path.join(root, 'agent-team', '.worktrees', batch.id),
    packet = `artifacts/task-validation/${batch.id}`;
  await mkdir(path.dirname(cwd), { recursive: true });
  await git(['worktree', 'add', '-b', batch.branch, cwd, baseSha]);
  // prepare() must reuse this fixture installation and never invoke npm.
  await mkdir(path.join(cwd, 'node_modules'));
  let injectConflict = false,
    failSave,
    poisoned,
    tail = Promise.resolve();
  const save = async () => {
    if (poisoned) throw poisoned;
    if (failSave?.(batch)) throw (poisoned = new Error('synthetic uncertain durable save'));
    await writeFile(durableFile, JSON.stringify(batch));
  };
  const effects = {
    getBatch: () => batch,
    assertOwnership: async () => {},
    mutate(fn) {
      const next = tail.then(async () => {
        if (poisoned) throw poisoned;
        await fn(batch);
        await save();
      });
      tail = next.catch((error) => {
        poisoned ??= error;
      });
      return next;
    },
  };
  const run = async (options) => {
    const { command, args, cwd: worktree } = options;
    commands.push(options);
    if (command === 'codex') {
      assert.equal(options.envMode, 'verification');
      assert.equal(args[0], 'sandbox');
      assert(args.includes('clinicos-verification'));
      events.push('verify');
      // Execute the exact accepted fixture test, without a paid CLI/database.
      assert.deepEqual(batch.plan.verification[0], {
        command: 'node',
        args: ['--test', 'fixture.test.mjs'],
      });
      return processRun(process.execPath, ['--test', 'fixture.test.mjs'], worktree);
    }
    assert.equal(command, 'git', 'fixture must never install or launch providers');
    if (args.includes('cherry-pick')) events.push('integrate');
    if (args.includes('push')) events.push('publish');
    return processRun(command, args, worktree);
  };
  const models = {
    executionPool: async () => [profile],
    executeWorkItem: async ({ item, cwd: child }) => {
      events.push(`child:${item.id}`);
      if (injectConflict) {
        injectConflict = false;
        // A concurrent parent edit precedes the integration reservation, so its
        // expected beforeSha remains exact throughout the retained conflict.
        await writeFile(path.join(cwd, 'a.txt'), 'synthetic competing parent edit\n');
        await git(['add', '--', 'a.txt'], cwd);
        await git(['commit', '-m', 'synthetic competing edit'], cwd);
      }
      await writeFile(path.join(child, `${item.id}.txt`), `fixed-${item.id}\n`);
      return { status: 'implemented', summary: `Changed ${item.id}` };
    },
    execute: async (options) => {
      events.push('direct');
      assert.equal(options.cwd, cwd);
      for (const id of ids) await writeFile(path.join(cwd, `${id}.txt`), `fixed-${id}\n`);
      return { status: 'implemented', summary: 'Direct fixture edit' };
    },
    simplify: async (options) => {
      events.push('simplify');
      assert.equal(options.cwd, cwd);
      assert.equal(options.forceSenior, adaptive ? true : undefined);
      return { status: 'implemented', summary: 'Group simplification inspected' };
    },
    qa: async (options) => {
      events.push('qa');
      assert.equal(options.cwd, cwd);
      return { status: 'verified', summary: 'Fresh independent synthetic inspection' };
    },
  };
  const workspace = createWorkspace({ root, repo: 'synthetic/fixture', run, models });
  await workspace.prepare(batch);
  await save();
  const invoke = (stageContext = context) =>
    runImplementationStages({ batch, workspace, save, effects, context: stageContext });
  return {
    batch,
    cwd,
    packet,
    remote,
    models,
    workspace,
    effects,
    invoke,
    save,
    git,
    commands,
    events,
    durable: async () => JSON.parse(await readFile(durableFile, 'utf8')),
    conflict: () => {
      injectConflict = true;
    },
    failWhen: (fn) => {
      failSave = fn;
    },
  };
}

test(
  'production stage caller integrates A and B with A->C frontier, then verifies, simplifies, verifies and runs fresh QA',
  { timeout: 30000 },
  async (t) => {
    const f = await fixture(t),
      bStarted = deferred(),
      releaseB = deferred();
    let active = 0,
      peak = 0;
    f.models.executeWorkItem = async ({ item, cwd, reservation }) => {
      f.events.push(`start:${item.id}`);
      peak = Math.max(peak, ++active);
      assert.equal(
        (await f.durable()).workItems.runs[0].nodes.find((n) => n.id === item.id).status,
        'running',
      );
      assert.equal(await f.git(['rev-parse', 'HEAD'], cwd), reservation.sourceIntegrationSha);
      if (item.id === 'a') await bStarted.promise;
      if (item.id === 'b') {
        bStarted.resolve();
        await releaseB.promise;
      }
      if (item.id === 'c') {
        assert.equal(await readFile(path.join(cwd, 'a.txt'), 'utf8'), 'fixed-a\n');
        assert.equal(
          (await f.durable()).workItems.runs[0].nodes.find((n) => n.id === 'a').integration.status,
          'integrated',
        );
        releaseB.resolve();
      }
      await writeFile(path.join(cwd, `${item.id}.txt`), `fixed-${item.id}\n`);
      f.events.push(`end:${item.id}`);
      active--;
      return { status: 'implemented', summary: `Changed ${item.id}` };
    };
    await f.invoke();
    assert.equal(peak, 2);
    assert(f.events.indexOf('start:c') < f.events.indexOf('end:b'));
    assert.deepEqual(
      f.events.filter((e) => ['verify', 'simplify', 'qa', 'publish'].includes(e)),
      ['verify', 'simplify', 'verify', 'qa', 'publish'],
    );
    assert(!f.events.includes('direct'));
    const durable = await f.durable();
    assert.equal(durable.controllerProgress.status, 'completed');
    assert.deepEqual(
      durable.controllerProgress.completed.map((s) => s.step),
      ['execute', 'verify-before', 'simplify', 'verify-after', 'qa', 'checkpoint', 'publish'],
    );
    assert.equal(durable.implementation.length, 1);
    assert.equal(durable.workItems.runs[0].status, 'completed');
    assert(durable.workItems.runs[0].nodes.every((n) => n.integration.status === 'integrated'));
    assert.equal(await f.git(['rev-parse', `refs/heads/${f.batch.branch}`], f.remote), durable.sha);
    const verification = JSON.parse(
      await readFile(
        path.join(f.cwd, f.packet, 'test-results/controller-verification.json'),
        'utf8',
      ),
    );
    assert.equal(verification[0].ok, true);
    assert.match(verification[0].output, /# pass 1/);
    assert.equal(
      JSON.parse(await readFile(path.join(f.cwd, f.packet, 'work-items-history.json'), 'utf8'))[0]
        .status,
      'completed',
    );
    assert.equal(await f.git(['status', '--porcelain'], f.cwd), '');
  },
);

test(
  'legacy caller keeps direct group implementation and identical later stage order',
  { timeout: 30000 },
  async (t) => {
    const f = await fixture(t, { adaptive: false });
    f.models.executionPool = () => assert.fail('legacy caller requested adaptive pool');
    f.models.executeWorkItem = () => assert.fail('legacy caller launched a child');
    await f.invoke();
    assert.deepEqual(f.events, ['direct', 'verify', 'simplify', 'verify', 'qa', 'publish']);
    assert.equal((await f.durable()).workItems, undefined);
    assert.equal((await f.durable()).controllerProgress.status, 'completed');
    assert(!f.commands.some((entry) => entry.args.includes('cherry-pick')));
  },
);

test(
  'a definite blocked packet preserves its attempt and next parent reservation uses the direct group caller',
  { timeout: 30000 },
  async (t) => {
    const f = await fixture(t, { ids: ['a'] });
    let childCalls = 0;
    f.models.executeWorkItem = async () => {
      childCalls++;
      return { status: 'blocked', summary: 'Synthetic missing packet prerequisite' };
    };
    await assert.rejects(f.invoke, (error) => error.code === 'implementation-blocked');
    assert.equal(f.batch.controllerProgress.status, 'failed');
    assert.equal(f.batch.workItems.runs[0].status, 'failed');
    f.batch.implementation[0].status = 'failed';
    const prior = structuredClone(f.batch.implementation[0]);
    const next = reserveImplementation(f.batch, () => new Date('2026-10-23T00:00:00Z'));
    await f.save();
    await f.invoke({ ...context, round: next.round, implementationRound: next.round });
    assert.equal(next.round, 2);
    assert.equal(childCalls, 1);
    assert.deepEqual(f.batch.implementation[0], prior);
    assert.equal(f.batch.workItems.runs.length, 1);
    assert.equal(f.batch.workItems.runs[0].status, 'failed');
    assert.deepEqual(f.events, ['direct', 'verify', 'simplify', 'verify', 'qa', 'publish']);
    assert.equal((await f.durable()).controllerProgress.status, 'completed');
    assert.equal(
      (await f.durable()).controllerProgressHistory[0].failureCode,
      'implementation-blocked',
    );
  },
);

test(
  'real retained cherry-pick conflict leaves execute unresolved and prevents a senior correction',
  { timeout: 30000 },
  async (t) => {
    const f = await fixture(t, { ids: ['a'] });
    f.conflict();
    await assert.rejects(f.invoke, (error) => error.code === 'work-item-integration-conflict');
    await f.save();
    const durable = await f.durable(),
      node = durable.workItems.runs[0].nodes[0];
    assert.equal(node.integration.status, 'conflict');
    assert.equal(durable.controllerProgress.status, 'running');
    assert.equal(durable.controllerProgress.pending, 'execute');
    assert.equal(await f.git(['rev-parse', '--verify', 'CHERRY_PICK_HEAD'], f.cwd), node.childSha);
    assert.equal(await f.git(['diff', '--name-only', '--diff-filter=U'], f.cwd), 'a.txt');
    await assert.rejects(
      () => f.invoke({ ...context, round: 2, implementationRound: 2 }),
      /Unknown implementation outcome/,
    );
    assert.deepEqual(f.events, ['child:a', 'integrate']);
    assert(
      !f.commands.some((entry) =>
        entry.args.some((arg) => ['reset', '--abort', 'remove', 'push'].includes(arg)),
      ),
    );
  },
);

test(
  'unknown provider output and uncertain save remain durable caller tombstones without replay',
  { timeout: 30000 },
  async (t) => {
    for (const mode of ['unknown', 'save']) {
      const f = await fixture(t, { ids: ['a'] });
      let calls = 0;
      f.models.executeWorkItem = async () => {
        calls++;
        throw new Error('synthetic provider timeout');
      };
      if (mode === 'save')
        f.failWhen((batch) => batch.workItems.runs[0]?.nodes[0]?.status === 'running');
      await assert.rejects(
        f.invoke,
        mode === 'save' ? /uncertain durable save/ : /provider timeout/,
      );
      const durable = await f.durable();
      assert.equal(calls, mode === 'save' ? 0 : 1);
      assert.equal(durable.controllerProgress.status, 'running');
      assert.equal(
        durable.workItems.runs[0].nodes[0].status,
        mode === 'save' ? 'reserved' : 'unknown',
      );
      const count = calls;
      await assert.rejects(f.invoke, /Unknown implementation outcome/);
      // Even a direct workspace reentry inspects and rejects retained uncertainty.
      await assert.rejects(
        () => f.workspace.execute(f.batch, { ...context, effects: f.effects }),
        /no model replay/,
      );
      assert.equal(calls, count);
      assert(
        !f.events.some((e) =>
          ['integrate', 'direct', 'verify', 'simplify', 'qa', 'publish'].includes(e),
        ),
      );
    }
  },
);
