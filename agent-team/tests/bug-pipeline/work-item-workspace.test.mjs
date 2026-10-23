import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, link } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkItemWorkspace } from '../../src/bug-pipeline/work-item-workspace.mjs';
import { createWorkItemsEnvelope, runWorkItems } from '../../src/bug-pipeline/work-items.mjs';
import { sha256 } from '../../src/bug-pipeline/contracts.mjs';

const exec = promisify(execFile);
const gitEnv = {
  PATH: process.env.PATH,
  HOME: os.tmpdir(),
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Synthetic controller',
  GIT_COMMITTER_NAME: 'Synthetic controller',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
};
const profile = {
  id: 'senior',
  provider: 'codex',
  model: 'fake-file-editor',
  tier: 'senior',
  ready: true,
  limit: 2,
  availability: 'cli-preflight-not-inference-verified',
};
const context = { phase: 'implementation', round: 1, implementationRound: 1 };
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
async function fixture(t, deps = { a: [], b: [], c: ['a'], d: ['b', 'c'] }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'clinicos-work-items-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const commands = [];
  const run = async ({ command, args, cwd }) => {
    assert.equal(command, 'git');
    commands.push({ args, cwd });
    try {
      const r = await exec(command, args, { cwd, env: gitEnv });
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
    const r = await run({
      command: 'git',
      args: ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args],
      cwd,
    });
    assert(r.ok, `fixture Git failed: ${r.stderr}`);
    return r.stdout.trim();
  };
  await git(['init', '-b', 'main']);
  const ids = Object.keys(deps);
  for (const id of ids) await writeFile(path.join(root, `${id}.txt`), `baseline-${id}\n`);
  await writeFile(path.join(root, '.gitignore'), '*.secret\n');
  await git(['add', '--', ...ids.map((id) => `${id}.txt`), '.gitignore']);
  await git(['commit', '-m', 'synthetic baseline']);
  const baseSha = await git(['rev-parse', 'HEAD']);
  const cwd = path.join(root, 'agent-team', '.worktrees', 'bug-batch-17');
  await mkdir(path.dirname(cwd), { recursive: true });
  await git(['worktree', 'add', '-b', 'codex/bug-batch-17', cwd, baseSha]);
  const packet = 'artifacts/task-validation/bug-batch-17';
  await mkdir(path.join(cwd, packet), { recursive: true });
  const packetHashes = {};
  for (const file of ['task-contract.md', 'analysis.md', 'implementation-plan.md']) {
    const content = `Frozen ${file}\n`;
    await writeFile(path.join(cwd, packet, file), content);
    packetHashes[file] = sha256(content);
  }
  const plan = {
    issues: [17],
    scope: ids.map((id) => `${id}.txt`),
    tasks: ids.map((id) => ({ files: [`${id}.txt`] })),
    acceptance: [{ issue: 17, criteria: ids.map((id) => `Change ${id}`) }],
    verification: [{ command: 'node', args: ['--test', 'synthetic.mjs'] }],
  };
  const graph = {
    issues: [17],
    nodes: ids.map((id, i) => ({
      id,
      title: `Change ${id}`,
      issues: [17],
      taskIndexes: [i],
      criteriaRefs: [{ issue: 17, index: i }],
      dependsOn: deps[id],
      scope: [`${id}.txt`],
      readFiles: [],
      difficulty: 'low',
      risk: { level: 'low', reason: 'Synthetic file edit' },
      coupling: { level: 'ordered', reason: 'Explicit dependencies only' },
      conflictKeys: [],
      routePreference: 'auto',
      verificationIndexes: [0],
      summary: `Change ${id}`,
    })),
  };
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    baseSha,
    plan,
    packetHashes,
    implementation: [{ round: 1, status: 'running' }],
  };
  batch.workItems = createWorkItemsEnvelope(graph, {
    plan,
    issues: [{ number: 17, title: 'Synthetic fixture' }],
  });
  let owns = true,
    saves = 0,
    failSave = 0,
    durable = structuredClone(batch),
    poisoned,
    tail = Promise.resolve();
  const effects = {
    getBatch: () => batch,
    assertOwnership: async () => {
      if (!owns) throw new Error('operator owns fixture');
    },
    mutate(fn) {
      const next = tail.then(async () => {
        if (poisoned) throw poisoned;
        await effects.assertOwnership();
        await fn(batch);
        if (++saves === failSave) throw new Error('fixture uncertain save');
        durable = structuredClone(batch);
      });
      tail = next.catch((error) => {
        poisoned ??= error;
      });
      return next;
    },
  };
  let scopeChecks = 0;
  const workspace = createWorkItemWorkspace({
    root,
    run,
    parentWorkspace: {
      coordinates: () => ({ cwd, packet }),
      assertScope: async () => {
        scopeChecks++;
        const changed = (await git(['diff', '--name-only', baseSha], cwd))
          .split('\n')
          .filter(Boolean);
        assert(changed.every((file) => plan.scope.includes(file)));
        for (const [file, expected] of Object.entries(packetHashes))
          assert.equal(sha256(await readFile(path.join(cwd, packet, file))), expected);
      },
    },
  });
  return {
    root,
    cwd,
    packet,
    batch,
    graph,
    workspace,
    effects,
    commands,
    git,
    scopeChecks: () => scopeChecks,
    durable: () => durable,
    takeover: () => {
      owns = false;
    },
    failAt: (n) => {
      failSave = n;
    },
  };
}

test('real Git DAG integrates bounded child commits with A->C frontier while B is running', async (t) => {
  const f = await fixture(t);
  const bStarted = deferred(),
    bRelease = deferred();
  const events = [];
  const result = await runWorkItems({
    batch: f.batch,
    workspace: f.workspace,
    effects: f.effects,
    context,
    pool: [profile],
    models: {
      executeWorkItem: async ({ item, cwd, reservation }) => {
        events.push(`start:${item.id}`);
        assert.equal(
          f.durable().workItems.runs[0].nodes.find((n) => n.id === item.id).status,
          'running',
        );
        assert.equal(
          sha256(await readFile(path.join(cwd, f.packet, 'task-contract.md'))),
          f.batch.packetHashes['task-contract.md'],
        );
        if (item.id === 'a') await bStarted.promise;
        if (item.id === 'b') {
          bStarted.resolve();
          await bRelease.promise;
        }
        if (item.id === 'c') {
          assert.equal(await readFile(path.join(cwd, 'a.txt'), 'utf8'), 'fixed-a\n');
          bRelease.resolve();
        }
        if (item.id === 'd') {
          assert.equal(await readFile(path.join(cwd, 'b.txt'), 'utf8'), 'fixed-b\n');
          assert.equal(await readFile(path.join(cwd, 'c.txt'), 'utf8'), 'fixed-c\n');
        }
        assert.equal(await f.git(['rev-parse', 'HEAD'], cwd), reservation.sourceIntegrationSha);
        await writeFile(path.join(cwd, `${item.id}.txt`), `fixed-${item.id}\n`);
        events.push(`end:${item.id}`);
        return { status: 'implemented', summary: `Applied ${item.id}` };
      },
    },
  });
  assert.equal(result.status, 'implemented');
  assert(events.indexOf('start:c') < events.indexOf('end:b'));
  for (const id of ['a', 'b', 'c', 'd'])
    assert.equal(await readFile(path.join(f.cwd, `${id}.txt`), 'utf8'), `fixed-${id}\n`);
  assert.equal(f.scopeChecks(), 8);
  assert.equal(f.batch.workItems.runs[0].status, 'completed');
  const commits = (await f.git(['log', '--format=%s', `${f.batch.baseSha}..HEAD`], f.cwd)).split(
    '\n',
  );
  assert.equal(commits.length, 4);
  assert(
    (await f.git(['ls-files', f.packet], f.cwd)) === '',
    'parent contract scaffold stays outside child implementation commits',
  );
  for (const r of f.batch.workItems.runs[0].nodes) {
    assert.equal(r.integration.status, 'integrated');
    await f.workspace.inspectIntegration({
      batch: f.batch,
      item: f.graph.nodes.find((n) => n.id === r.id),
      reservation: r,
    });
  }
  assert(
    f.commands
      .filter((c) => c.args.includes('cherry-pick'))
      .every(
        (c) =>
          c.args.includes('core.hooksPath=/dev/null') && c.args.includes('commit.gpgsign=false'),
      ),
  );
  const replay = await runWorkItems({
    batch: f.batch,
    workspace: f.workspace,
    effects: f.effects,
    context,
    pool: [profile],
    models: { executeWorkItem: () => assert.fail('completed graph replay') },
  });
  assert.equal(replay.status, 'implemented');
  assert(!f.commands.some((c) => c.args.includes('push') || c.args.includes('reset')));
});

test('node scope, ignored untracked files, symlinks and immutable packet edits cannot integrate', async (t) => {
  for (const kind of ['scope', 'ignored', 'symlink', 'hardlink', 'packet']) {
    const f = await fixture(t, { a: [] });
    const result = await runWorkItems({
      batch: f.batch,
      workspace: f.workspace,
      effects: f.effects,
      context,
      pool: [profile],
      models: {
        executeWorkItem: async ({ cwd }) => {
          if (kind === 'scope') await writeFile(path.join(cwd, 'outside.txt'), 'out of scope');
          if (kind === 'ignored')
            await writeFile(path.join(cwd, 'hidden.secret'), 'ignored out of scope');
          if (kind === 'symlink') {
            await rm(path.join(cwd, 'a.txt'));
            await symlink(path.join(f.root, 'a.txt'), path.join(cwd, 'a.txt'));
          }
          if (kind === 'hardlink') {
            await rm(path.join(cwd, 'a.txt'));
            await link(path.join(f.root, 'a.txt'), path.join(cwd, 'a.txt'));
          }
          if (kind === 'packet')
            await writeFile(path.join(cwd, f.packet, 'analysis.md'), 'changed frozen contract');
          return { status: 'implemented', summary: 'Claimed implementation' };
        },
      },
    });
    assert.equal(result.status, 'blocked', kind);
    assert.equal(await f.git(['rev-parse', 'HEAD'], f.cwd), f.batch.baseSha);
    assert(!f.commands.some((c) => c.args.includes('cherry-pick')));
  }
});

test('foreign occupied child path is preserved and missing retained child blocks inspection', async (t) => {
  const f = await fixture(t, { a: [] });
  const item = f.graph.nodes[0];
  const r = {
    id: item.id,
    nonce: 'occupied-node-123',
    sourceIntegrationSha: f.batch.baseSha,
    provider: 'codex',
    model: profile.model,
    status: 'reserved',
  };
  Object.assign(r, f.workspace.coordinates(f.batch, item, r));
  await mkdir(r.cwd, { recursive: true });
  await writeFile(path.join(r.cwd, 'foreign'), 'preserve');
  await assert.rejects(
    () =>
      f.workspace.prepareChild({
        batch: f.batch,
        item,
        reservation: r,
        assertOwnership: f.effects.assertOwnership,
      }),
    /occupied child path/,
  );
  assert.equal(await readFile(path.join(r.cwd, 'foreign'), 'utf8'), 'preserve');
  assert(!f.commands.some((c) => c.args.includes('reset')));
});

test('ownership loss after file edits leaves exact running reservation without controller commit', async (t) => {
  const f = await fixture(t, { a: [] });
  await assert.rejects(
    () =>
      runWorkItems({
        batch: f.batch,
        workspace: f.workspace,
        effects: f.effects,
        context,
        pool: [profile],
        models: {
          executeWorkItem: async ({ cwd }) => {
            await writeFile(path.join(cwd, 'a.txt'), 'retained unknown output\n');
            f.takeover();
            return { status: 'implemented', summary: 'Edited fixture' };
          },
        },
      }),
    /operator owns/,
  );
  assert.equal(f.durable().workItems.runs[0].nodes[0].status, 'running');
  assert.equal(await f.git(['rev-parse', 'HEAD'], f.cwd), f.batch.baseSha);
  assert.equal(
    f.commands.filter((c) => c.args.includes('commit')).length,
    1,
    'only fixture baseline commit',
  );
});

test('uncertain save before inference poisons further work and a second pass cannot replay', async (t) => {
  const f = await fixture(t, { a: [] });
  f.failAt(3);
  let calls = 0;
  const invoke = () =>
    runWorkItems({
      batch: f.batch,
      workspace: f.workspace,
      effects: f.effects,
      context,
      pool: [profile],
      models: {
        executeWorkItem: () => {
          calls++;
          return { status: 'implemented', summary: 'Must not run' };
        },
      },
    });
  await assert.rejects(invoke, /uncertain save/);
  assert.equal(calls, 0);
  await assert.rejects(invoke, /no model replay/);
  assert.equal(calls, 0);
  assert.equal(f.durable().workItems.runs[0].nodes[0].status, 'reserved');
});

test('real cherry-pick conflict retains exact owned state without reset, cleanup or inferred retry', async (t) => {
  const f = await fixture(t, { a: [] });
  const item = f.graph.nodes[0];
  const reservation = {
    id: item.id,
    nonce: 'conflict-node-123',
    sourceIntegrationSha: f.batch.baseSha,
    status: 'reserved',
    provider: 'codex',
    model: profile.model,
  };
  Object.assign(reservation, f.workspace.coordinates(f.batch, item, reservation));
  const prepared = await f.workspace.prepareChild({
    batch: f.batch,
    item,
    reservation,
    assertOwnership: f.effects.assertOwnership,
  });
  reservation.checkpoint = prepared.checkpoint;
  reservation.status = 'running';
  await writeFile(path.join(reservation.cwd, 'a.txt'), 'child exact line\n');
  reservation.outputCheckpoint = await f.workspace.captureChildCheckpoint({
    batch: f.batch,
    item,
    reservation,
    assertOwnership: f.effects.assertOwnership,
  });
  reservation.result = { status: 'implemented', summary: 'Synthetic child edit' };
  reservation.commit = {
    nonce: 'commit-conflict-123',
    status: 'running',
    beforeSha: f.batch.baseSha,
  };
  const checked = await f.workspace.checkpointChild({
    batch: f.batch,
    item,
    reservation,
    assertOwnership: f.effects.assertOwnership,
  });
  Object.assign(reservation, {
    status: 'implemented',
    childSha: checked.sha,
    outputManifest: checked.manifest,
  });
  await writeFile(path.join(f.cwd, 'a.txt'), 'different integration line\n');
  await f.git(['add', '--', 'a.txt'], f.cwd);
  await f.git(['commit', '-m', 'synthetic concurrent integration edit'], f.cwd);
  const beforeSha = await f.workspace.integrationHead(f.batch);
  reservation.integration = {
    nonce: 'integration-conflict-123',
    status: 'running',
    beforeSha,
    childSha: checked.sha,
  };
  await assert.rejects(
    () =>
      f.workspace.integrateChild({
        batch: f.batch,
        item,
        reservation,
        childSha: checked.sha,
        beforeSha,
        assertOwnership: f.effects.assertOwnership,
      }),
    (error) => error.workItemDefinite === 'integration-conflict',
  );
  assert.equal(await f.git(['rev-parse', 'HEAD'], f.cwd), beforeSha);
  assert.equal(await f.git(['rev-parse', '--verify', 'CHERRY_PICK_HEAD'], f.cwd), checked.sha);
  assert.equal(await f.git(['diff', '--name-only', '--diff-filter=U'], f.cwd), 'a.txt');
  assert(
    !f.commands.some(
      (c) => c.args.includes('reset') || c.args.includes('--abort') || c.args.includes('remove'),
    ),
  );
});
