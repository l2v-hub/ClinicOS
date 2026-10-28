import test from 'node:test';
import assert from 'node:assert/strict';
import { runWithIntakeContinuation } from '../../src/bug-pipeline/intake-continuation.mjs';

const repo = 'l2v-hub/ClinicOS';
const initial = () => ({
  schemaVersion: 1,
  repository: repo,
  batches: [],
  triageQueue: { issues: [17], openedAt: 0, changedAt: 0 },
});
const finished = (state) => {
  const next = structuredClone(state);
  delete next.triageQueue;
  return next;
};

test('one event continues its durable quiet window without a second external dispatch', async () => {
  let clock = 0,
    passes = 0,
    observations = 0,
    modelStarts = 0;
  const waits = [],
    state = initial();
  const result = await runWithIntakeContinuation({
    repo,
    now: () => clock,
    wait: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    observe: async () => {
      observations++;
      return structuredClone(state);
    },
    runOnce: async () => {
      passes++;
      if (passes === 1) return structuredClone(state);
      assert.equal(clock, 120000);
      modelStarts++;
      return finished(state);
    },
  });
  assert.equal(result.triageQueue, undefined);
  assert.equal(passes, 2);
  assert.equal(observations, 1);
  assert.equal(modelStarts, 1);
  assert.deepEqual(waits, [30000, 30000, 30000, 30000]);
});

test('a durable membership change during the wait gets its own quiet window', async () => {
  let clock = 0,
    passes = 0,
    observations = 0;
  const state = initial();
  await runWithIntakeContinuation({
    repo,
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    observe: async () => {
      observations++;
      if (observations === 1) {
        state.triageQueue.issues.push(18);
        state.triageQueue.changedAt = clock;
      }
      return structuredClone(state);
    },
    runOnce: async () => {
      passes++;
      if (passes === 1) return initial();
      assert.equal(clock, 240000);
      assert.deepEqual(state.triageQueue.issues, [17, 18]);
      return finished(state);
    },
  });
  assert.equal(passes, 2);
  assert.equal(observations, 2);
});

test('repeated collection updates remain bounded by the original ten-minute limit', async () => {
  let clock = 0,
    passes = 0;
  const state = initial();
  await runWithIntakeContinuation({
    repo,
    now: () => clock,
    wait: async (ms) => {
      assert(ms <= 30000);
      clock += ms;
    },
    observe: async () => {
      state.triageQueue.changedAt = clock;
      return structuredClone(state);
    },
    runOnce: async () => {
      passes++;
      if (passes === 1) return initial();
      assert.equal(clock, 600000);
      return finished(state);
    },
  });
  assert.equal(passes, 2);
  assert.equal(clock, 600000);
});

test('a fresh operator takeover stops continuation before any new model stage', async () => {
  let clock = 0,
    passes = 0;
  const state = initial();
  state.operatorTakeover = {
    active: true,
    owner: 'operator',
    nonce: 'new-takeover',
  };
  const result = await runWithIntakeContinuation({
    repo,
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    observe: async () => structuredClone(state),
    runOnce: async () => {
      passes++;
      return initial();
    },
  });
  assert.equal(passes, 1);
  assert.equal(result.operatorTakeover.owner, 'operator');
});

test('unknown outcomes propagate once and are never automatically retried', async () => {
  let clock = 0,
    passes = 0;
  const state = initial();
  await assert.rejects(
    runWithIntakeContinuation({
      repo,
      now: () => clock,
      wait: async (ms) => {
        clock += ms;
      },
      observe: async () => structuredClone(state),
      runOnce: async () => {
        passes++;
        if (passes === 1) return state;
        throw new Error('unknown paid outcome');
      },
    }),
    /unknown paid outcome/,
  );
  assert.equal(passes, 2);
});

test('an existing running triage reservation is not replayed', async () => {
  let calls = 0;
  const state = initial();
  state.pendingTriage = { issues: [17], status: 'running' };
  await runWithIntakeContinuation({
    repo,
    runOnce: async () => {
      calls++;
      return state;
    },
    observe: async () => {
      throw new Error('must not observe');
    },
    wait: async () => {
      throw new Error('must not wait');
    },
  });
  assert.equal(calls, 1);
});

test('no progress after a due pass returns without spinning or spending another session', async () => {
  let clock = 0,
    calls = 0;
  const state = initial();
  await runWithIntakeContinuation({
    repo,
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    observe: async () => structuredClone(state),
    runOnce: async () => {
      calls++;
      return structuredClone(state);
    },
  });
  assert.equal(calls, 2);
});

test('a regressed clock and an invalid observation fail closed without another pass', async () => {
  let calls = 0,
    clock = 1000;
  await assert.rejects(
    runWithIntakeContinuation({
      repo,
      now: () => clock,
      wait: async () => {
        clock = 0;
      },
      observe: async () => initial(),
      runOnce: async () => {
        calls++;
        return initial();
      },
    }),
    /clock regressed/,
  );
  assert.equal(calls, 1);
  clock = 0;
  calls = 0;
  await assert.rejects(
    runWithIntakeContinuation({
      repo,
      now: () => clock,
      wait: async (ms) => {
        clock += ms;
      },
      observe: async () => ({ ...initial(), repository: 'foreign/repository' }),
      runOnce: async () => {
        calls++;
        return initial();
      },
    }),
  );
  assert.equal(calls, 1);
});
