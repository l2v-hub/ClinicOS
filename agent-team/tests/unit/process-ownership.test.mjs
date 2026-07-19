import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import * as runner from '../../src/adapters/process-runner.mjs';

// QA-263-015 / AC4: attempt 8's outer termination left owned child processes alive. The
// process runner must support external cancellation (a lost lease aborts through the
// heartbeat signal) and must keep a registry of owned children so supervisor termination
// can take down every owned process tree.

async function assertDead(pid) {
  let alive = true;
  for (let attempt = 0; attempt < 50 && alive; attempt += 1) {
    try {
      process.kill(pid, 0);
      await delay(100);
    } catch {
      alive = false;
    }
  }
  assert.equal(alive, false, `owned process ${pid} must be dead`);
}

test('runProcess abort signal kills the owned process tree with an explicit abort diagnostic (QA-263-015)', async () => {
  const controller = new AbortController();
  const promise = runner.runProcess({
    command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 3000)'],
    cwd: process.cwd(),
    timeoutMs: 30000,
    maxOutputBytes: 1024,
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(new Error('lease lost: claim comment superseded')), 150);
  const result = await promise;
  assert.equal(result.ok, false, 'an aborted run must never report success');
  assert.match(result.error ?? '', /abort/i, 'the result must name the abort');
  assert.match(result.error ?? '', /lease lost/, 'the result must carry the abort reason');
  assert.equal(Number.isInteger(result.pid), true);
  await assertDead(result.pid);
});

test('an already-aborted signal refuses to spawn at all (QA-263-015)', async () => {
  const controller = new AbortController();
  controller.abort(new Error('lease lost before launch'));
  const result = await runner.runProcess({
    command: process.execPath,
    args: ['-e', 'process.exit(0)'],
    cwd: process.cwd(),
    timeoutMs: 5000,
    maxOutputBytes: 1024,
    signal: controller.signal,
  });
  assert.equal(result.ok, false);
  assert.equal(result.pid, null, 'no process may start under a lost lease');
  assert.match(result.error ?? '', /abort/i);
});

test('killOwnedProcessTrees terminates every live owned child so supervisor termination leaves no orphan (QA-263-015)', async () => {
  assert.equal(
    typeof runner.killOwnedProcessTrees,
    'function',
    'the runner must expose killOwnedProcessTrees for supervisor shutdown',
  );
  const promise = runner.runProcess({
    command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 8000)'],
    cwd: process.cwd(),
    timeoutMs: 30000,
    maxOutputBytes: 1024,
  });
  await delay(400); // let the child spawn
  const killed = runner.killOwnedProcessTrees();
  assert.ok(killed >= 1, `at least the live owned child must be killed, got ${killed}`);
  const result = await promise;
  assert.equal(result.ok, false, 'a child killed at shutdown must not report success');
  await assertDead(result.pid);
});

test('finished children leave the owned registry (QA-263-015)', async () => {
  const result = await runner.runProcess({
    command: process.execPath,
    args: ['-e', 'process.exit(0)'],
    cwd: process.cwd(),
    timeoutMs: 5000,
    maxOutputBytes: 1024,
  });
  assert.equal(result.ok, true);
  assert.equal(
    runner.killOwnedProcessTrees(),
    0,
    'a completed child must not linger in the owned-process registry',
  );
});
