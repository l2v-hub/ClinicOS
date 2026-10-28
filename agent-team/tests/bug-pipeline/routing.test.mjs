import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { selectExecutor } from '../../src/bug-pipeline/routing.mjs';
import { createModels } from '../../src/bug-pipeline/models.mjs';

const senior = 'gpt-6.1-sol',
  delegate = 'gpt-6-luna';
const assessed = (difficulty = 'low', mode = 'delegate') => ({
  execution: { difficulty, mode, reason: 'Assessment against task boundaries and risk.' },
});
const option = (args, name) => args[args.indexOf(name) + 1];
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'clinicos-routing-'));
  const runtimeRoot = path.join(root, 'runtime'),
    cwd = path.join(root, 'worktree');
  await Promise.all([mkdir(runtimeRoot), mkdir(cwd)]);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, runtimeRoot, cwd };
}
const success = async (call) => {
  await writeFile(
    option(call.args, '--output-last-message'),
    JSON.stringify({ status: 'implemented', summary: 'Scoped implementation.' }),
  );
  return { ok: true, stdout: '', stderr: '' };
};

test('auto routes difficulty/direct requests to senior and only bounded work to a delegate', () => {
  for (const execution of [null, false, 0, ''])
    assert.throws(
      () => selectExecutor({ plan: { execution }, plannerModel: senior }),
      /invalid execution assessment/,
    );
  for (const plan of [assessed('high'), assessed('medium', 'direct'), undefined]) {
    const chosen = selectExecutor({ plan, plannerModel: senior });
    assert.equal(chosen.model, senior);
    assert.equal(chosen.mode, 'direct');
  }
  assert.equal(selectExecutor({ plan: assessed(), plannerModel: senior }).model, delegate);
  assert.equal(selectExecutor({ plan: assessed(), plannerModel: senior, round: 2 }).model, senior);
  assert.equal(
    selectExecutor({ plan: assessed(), plannerModel: senior, delegateModel: senior }).model,
    senior,
  );
  assert.throws(
    () =>
      selectExecutor({
        plan: { execution: { difficulty: 'unknown', mode: 'delegate' } },
        plannerModel: senior,
      }),
    /invalid execution assessment/,
  );
});

test('fixed 6.1-Sol override runs implementation and simplification entirely with senior', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t),
    calls = [];
  const models = createModels({
    plannerModel: senior,
    executorModel: senior,
    runtimeRoot,
    run: async (call) => {
      calls.push(call);
      return success(call);
    },
  });
  const input = { cwd, packet: { id: 'batch' }, plan: assessed(), round: 1 };
  await models.execute(input);
  await models.simplify(input);
  assert.deepEqual(
    calls.map((c) => option(c.args, '--model')),
    [senior, senior],
  );
  assert.equal(models.executionFor(cwd).mode, 'direct');
  assert.equal(calls.length, 2);
});

test('actual overlapping sessions divert bounded work to senior without starting a second delegate', async (t) => {
  const { root, cwd, runtimeRoot } = await fixture(t),
    other = path.join(root, 'other');
  await mkdir(other);
  let started, release;
  const running = new Promise((resolve) => {
    started = resolve;
  });
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  const calls = [];
  const models = createModels({
    plannerModel: senior,
    runtimeRoot,
    run: async (call) => {
      calls.push(call);
      if (call.cwd === cwd) {
        started();
        await hold;
      }
      return success(call);
    },
  });
  const first = models.execute({ cwd, packet: {}, plan: assessed(), round: 1 });
  await running;
  try {
    await models.execute({ cwd: other, packet: {}, plan: assessed(), round: 1 });
    assert.deepEqual(
      calls.map((c) => option(c.args, '--model')),
      [delegate, senior],
    );
    assert.equal(models.executionFor(other).reason, 'delegate-locally-busy');
    await models.simplify({ cwd: other, packet: {}, plan: assessed() });
    assert.equal(option(calls.at(-1).args, '--model'), senior);
  } finally {
    release();
    await first;
  }
});

test('capacity errors consume their call and influence only a later requested attempt', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t),
    calls = [];
  let time = 1000,
    fail = true;
  const models = createModels({
    plannerModel: senior,
    runtimeRoot,
    now: () => time,
    run: async (call) => {
      calls.push(call);
      if (fail) {
        fail = false;
        return { ok: false, stdout: '', stderr: 'model_capacity_exceeded (503)' };
      }
      return success(call);
    },
  });
  const input = { cwd, packet: {}, plan: assessed(), round: 1 };
  await assert.rejects(() => models.execute(input), (error) => {
    assert.equal(error.code, 'model-execution-failed');
    assert.equal(error.modelCapacityFailure, true);
    return true;
  });
  assert.equal(calls.length, 1, 'no automatic retry outside the controller budget');
  await models.execute(input);
  assert.equal(option(calls[1].args, '--model'), senior);
  assert.equal(models.executionFor(cwd).reason, 'delegate-capacity-unavailable');
  time += 60_001;
  await models.execute(input);
  assert.equal(option(calls[2].args, '--model'), delegate);
});

test('automatic high-difficulty and legacy execution use the senior model in real CLI arguments', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t),
    calls = [];
  const models = createModels({
    plannerModel: senior,
    runtimeRoot,
    run: async (call) => {
      calls.push(call);
      return success(call);
    },
  });
  await models.execute({ cwd, packet: {}, plan: assessed('high'), round: 1 });
  await models.execute({ cwd, packet: {}, plan: {}, round: 1 });
  assert.deepEqual(
    calls.map((c) => option(c.args, '--model')),
    [senior, senior],
  );
});

test('incidental line numbers in diagnostics do not invent provider capacity pressure', async (t) => {
  const { cwd, runtimeRoot } = await fixture(t),
    calls = [];
  const models = createModels({
    plannerModel: senior,
    runtimeRoot,
    run: async (call) => {
      calls.push(call);
      return calls.length === 1
        ? { ok: false, stdout: '', stderr: 'validation failed at fixture line 503' }
        : success(call);
    },
  });
  const input = { cwd, packet: {}, plan: assessed(), round: 1 };
  await assert.rejects(() => models.execute(input), (error) => {
    assert.equal(error.code, 'model-execution-failed');
    assert.equal(error.modelCapacityFailure, false);
    return true;
  });
  await models.execute(input);
  assert.deepEqual(
    calls.map((c) => option(c.args, '--model')),
    [delegate, delegate],
  );
  assert.equal(models.executionFor(cwd).reason, 'bounded-delegation');
});
