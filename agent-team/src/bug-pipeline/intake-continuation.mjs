import assert from 'node:assert/strict';
import { validateState } from './contracts.mjs';
import { automationPaused } from './operator-ownership.mjs';

export const INTAKE_QUIET_MS = 120_000;
export const INTAKE_MAX_MS = 600_000;
const TICK_MS = 30_000;

function dueAt(state, quietMs) {
  const queue = state.triageQueue;
  if (!queue || state.pendingTriage || automationPaused(state)) return null;
  return Math.min(queue.changedAt + quietMs, queue.openedAt + INTAKE_MAX_MS);
}

// The already serialized controller keeps the durable collection window alive.
// Waiting never invokes a model or dispatches a second controller. The actual pass
// reloads authorization/ownership and reserves work through the normal pipeline.
export async function runWithIntakeContinuation({
  repo,
  runOnce,
  observe,
  now = Date.now,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  quietMs = INTAKE_QUIET_MS,
  onWait = () => {},
}) {
  assert.equal(typeof runOnce, 'function');
  assert.equal(typeof observe, 'function');
  assert(Number.isSafeInteger(quietMs) && quietMs >= 0 && quietMs <= INTAKE_MAX_MS);
  let state = validateState(await runOnce(), repo);
  let previousTime = now();
  assert(Number.isSafeInteger(previousTime) && previousTime >= 0);
  const stopAt = previousTime + INTAKE_MAX_MS;
  for (let passes = 0; passes < 16; ) {
    const due = dueAt(state, quietMs);
    if (due === null) return state;
    const time = now();
    assert(Number.isSafeInteger(time) && time >= previousTime, 'Collection clock regressed');
    previousTime = time;
    if (time > stopAt) return state;
    if (time < due) {
      const delay = Math.min(due - time, TICK_MS, stopAt - time);
      if (delay <= 0) return state;
      onWait({ status: 'collecting', waitMs: delay, dueAt: due });
      await wait(delay);
      continue;
    }
    // A takeover or another writer's collection update during the wait wins.
    state = validateState(await observe(), repo);
    const freshDue = dueAt(state, quietMs);
    if (freshDue === null) return state;
    if (freshDue > now()) continue;
    const collection = JSON.stringify(state.triageQueue);
    state = validateState(await runOnce(), repo);
    passes++;
    // No progress at an elapsed deadline is not permission to spin or repeat an
    // uncertain operation. A later authenticated event can reconcile it normally.
    if (JSON.stringify(state.triageQueue) === collection) return state;
  }
  return state;
}
