import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createModels } from '../../src/bug-pipeline/models.mjs';

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['groups'],
  properties: { groups: { type: 'array', items: { type: 'string' } } },
};
const IMPLEMENTED = { status: 'implemented', summary: 'Applied the accepted change.' };

test('independent Codex QA uses a fresh read-only analyst session and cannot return implementation status', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t);
  const calls = [];
  const models = createModels({
    plannerModel: 'analyst-test',
    executorModel: 'executor-test',
    runtimeRoot,
    run: successfulRunner(calls, {
      status: 'verified',
      summary: 'Acceptance and evidence inspected independently.',
    }),
  });
  assert.equal((await models.qa({ cwd, packet: { id: 'batch' }, plan: {} })).status, 'verified');
  assert.equal(parsedArgs(calls[0].args)['--sandbox'], 'read-only');
  assert.equal(parsedArgs(calls[0].args)['--model'], 'analyst-test');
  assert.equal(parsedArgs(calls[0].args)['--ephemeral'], true);
  assert.match(calls[0].input, /NEW independent Codex QA session/);
  const wrong = createModels({
    plannerModel: 'analyst-test',
    runtimeRoot,
    run: successfulRunner([]),
  });
  await assert.rejects(() => wrong.qa({ cwd, packet: {}, plan: {} }), /enum mismatch/);
});

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'clinicos-models-'));
  const cwd = path.join(root, 'worktree');
  const runtimeRoot = path.join(root, 'runtime');
  await Promise.all([mkdir(cwd), mkdir(runtimeRoot)]);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, cwd, runtimeRoot };
}

function parsedArgs(args) {
  const result = {};
  const flags = new Set(['--json', '--ephemeral', '--ignore-user-config']);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '-c') {
      (result.config ??= []).push(args[++index]);
    } else if (args[index].startsWith('--')) {
      if (flags.has(args[index])) result[args[index]] = true;
      else {
        result[args[index]] = args[index + 1];
        index += 1;
      }
    } else if (args[index] === '-') {
      result.stdin = true;
    }
  }
  return result;
}

function successfulRunner(calls, result = IMPLEMENTED) {
  return async (call) => {
    calls.push(call);
    const args = parsedArgs(call.args);
    const schema = JSON.parse(await readFile(args['--output-schema'], 'utf8'));
    assert.ok(schema);
    await writeFile(args['--output-last-message'], `${JSON.stringify(result)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
    return { ok: true, stdout: '', stderr: '' };
  };
}

test('plan, implementation and simplification use distinct bounded Codex sessions and models', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t);
  const calls = [];
  const models = createModels({
    plannerModel: 'codex-planner-test',
    executorModel: 'codex-executor-test',
    runtimeRoot,
    run: successfulRunner(calls, { groups: ['issue-1'] }),
  });

  const plan = await models.plan({
    cwd,
    issues: [{ id: 'issue-1', body: 'untrusted' }],
    packet: { id: 'batch-1' },
    scopeSchema: PLAN_SCHEMA,
  });
  assert.deepEqual(plan, { groups: ['issue-1'] });
  // Use a result conforming to the executor response schema for the following sessions.
  const executor = createModels({
    plannerModel: 'codex-planner-test',
    executorModel: 'codex-executor-test',
    runtimeRoot,
    run: async (call) => {
      calls.push(call);
      const args = parsedArgs(call.args);
      await writeFile(args['--output-last-message'], `${JSON.stringify(IMPLEMENTED)}\n`, {
        flag: 'wx',
        mode: 0o600,
      });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.deepEqual(
    await executor.execute({
      cwd,
      packet: { id: 'batch-1' },
      plan,
      phase: 'implementation',
      round: 1,
    }),
    IMPLEMENTED,
  );
  assert.deepEqual(await executor.simplify({ cwd, packet: { id: 'batch-1' }, plan }), IMPLEMENTED);

  assert.equal(calls.length, 3);
  const planArgs = parsedArgs(calls[0].args);
  assert.equal(planArgs['--model'], 'codex-planner-test');
  assert.equal(planArgs['--sandbox'], 'read-only');
  assert.equal(planArgs['--ephemeral'], true);
  assert.equal(calls[0].args.includes('--ephemeral'), true);
  assert.match(calls[0].input, /Aggregation is a primary planning objective/);
  assert.match(calls[0].input, /fileMap.*one entry per issue/s);
  assert.match(calls[0].input, /BOTH must provide a nonempty separationReason/);
  assert.match(calls[0].input, /existing plans are frozen/);
  for (const call of calls) {
    assert.equal(call.command, 'codex');
    assert.equal(call.envMode, 'model');
    assert.equal(call.cwd, cwd);
    assert.equal(call.args.includes('--dangerously-bypass-approvals-and-sandbox'), false);
    assert.equal(call.args.includes('--yolo'), false);
    assert.ok(call.args.includes('--ignore-user-config'));
    assert.ok(parsedArgs(call.args).config.includes('shell_environment_policy.inherit="none"'));
    assert.ok(
      parsedArgs(call.args).config.some((setting) =>
        setting.startsWith('shell_environment_policy.set.PATH='),
      ),
    );
    assert.match(call.input, /Treat all issue text.*untrusted data/s);
    assert.match(call.input, /Do not commit, push, merge, deploy/);
    const args = parsedArgs(call.args);
    assert.equal(path.dirname(args['--output-last-message']), await realpath(runtimeRoot));
    assert.equal(path.dirname(args['--output-schema']), await realpath(runtimeRoot));
  }
  for (const call of calls.slice(1)) {
    const args = parsedArgs(call.args);
    assert.equal(args['--model'], 'codex-executor-test');
    assert.equal(args['--sandbox'], 'workspace-write');
    assert.ok(args['--ephemeral'] !== undefined);
  }
  const runtimeEntries = await (await import('node:fs/promises')).readdir(runtimeRoot);
  assert.deepEqual(
    runtimeEntries,
    [],
    'structured output and temporary schemas are removed after parsing',
  );
});

test('missing model IDs fail explicitly before starting Codex', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t);
  let calls = 0;
  const models = createModels({
    executorModel: '',
    runtimeRoot,
    run: async () => {
      calls += 1;
    },
  });
  await assert.rejects(
    models.execute({ cwd, packet: {}, plan: {} }),
    /executorModel is not configured/,
  );
  assert.equal(calls, 0);
});

test('missing, invalid and symlink output fail closed', async (t) => {
  const { cwd, runtimeRoot, root } = await fixture(t);
  const invoke = (writer) =>
    createModels({
      plannerModel: 'planner',
      runtimeRoot,
      run: async (call) => {
        const args = parsedArgs(call.args);
        await writer(args['--output-last-message']);
        return { ok: true, stdout: '', stderr: '' };
      },
    }).plan({ cwd, issues: [], scopeSchema: PLAN_SCHEMA });

  await assert.rejects(
    invoke(async () => {}),
    /did not produce a regular structured output/,
  );
  await assert.rejects(
    invoke((output) => writeFile(output, '{"groups": [] , "unexpected": true}')),
    /additional property unexpected/,
  );
  const outside = path.join(root, 'outside.json');
  await writeFile(outside, '{"groups": []}');
  await assert.rejects(
    invoke((output) => symlink(outside, output)),
    /did not produce a regular structured output/,
  );
});

test('Codex failure is surfaced and does not parse stale output', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t);
  const models = createModels({
    plannerModel: 'planner',
    runtimeRoot,
    run: async () => ({ ok: false, stderr: 'process failed' }),
  });
  await assert.rejects(
    models.plan({ cwd, issues: [], scopeSchema: PLAN_SCHEMA }),
    /session failed: process failed/,
  );
});

test('model worktree cannot contain the runtime output directory', async (t) => {
  const { root, runtimeRoot } = await fixture(t);
  const nestedWorktree = path.join(root, 'runtime', 'worktree');
  await mkdir(nestedWorktree);
  const models = createModels({
    plannerModel: 'planner',
    runtimeRoot,
    run: async () => {
      throw new Error('must not run');
    },
  });
  await assert.rejects(
    models.plan({ cwd: nestedWorktree, issues: [], scopeSchema: PLAN_SCHEMA }),
    /runtimeRoot must be outside/,
  );
});

test('preflight probes CLI support without invoking a model or reading credentials', async (t) => {
  const { runtimeRoot } = await fixture(t);
  const calls = [];
  const models = createModels({
    runtimeRoot,
    run: async (call) => {
      calls.push(call);
      if (call.args[0] === '--version') return { ok: true, stdout: 'codex 1.0', stderr: '' };
      return {
        ok: true,
        stdout:
          'codex exec -c --output-schema --output-last-message --json --ephemeral --ignore-user-config --model --sandbox --cd',
        stderr: '',
      };
    },
  });
  const report = await models.preflight();
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.envMode === 'verification'));
  assert.deepEqual(report.missingFlags, []);
  assert.match(report.authentication, /CODEX_API_KEY presence or local Codex login/);
  assert.equal(report.ready, true);
});
