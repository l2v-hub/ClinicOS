import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// QA-263-015 / AC4: outer termination of the supervisor left owned child processes alive.
// This real-process test proves the ownership contract end to end: when a host process that
// launched work through the process runner terminates, the owned process tree dies with it.

test('host termination takes down the owned process tree (QA-263-015)', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'agent-team-exit-ownership-'));
  const pidFile = path.join(dir, 'grandchild.pid');
  const fixture = path.resolve('agent-team/tests/fixtures/exit-orphan-host.mjs');

  const host = spawn(process.execPath, [fixture, pidFile], {
    cwd: path.resolve('.'),
    stdio: 'ignore',
    windowsHide: true,
  });
  const hostExit = new Promise((resolve) => host.on('close', resolve));

  let grandchildPid = null;
  try {
    for (let waited = 0; waited < 15000 && grandchildPid === null; waited += 100) {
      if (existsSync(pidFile)) {
        const raw = (await readFile(pidFile, 'utf8')).trim();
        if (raw) grandchildPid = Number(raw);
      }
      if (grandchildPid === null) await delay(100);
    }
    assert.ok(
      Number.isInteger(grandchildPid),
      'the owned grandchild must have started and reported its pid',
    );

    await hostExit;

    let alive = true;
    for (let waited = 0; waited < 8000 && alive; waited += 200) {
      try {
        process.kill(grandchildPid, 0);
        await delay(200);
      } catch {
        alive = false;
      }
    }
    assert.equal(
      alive,
      false,
      `host termination must kill the owned process tree; pid ${grandchildPid} survived`,
    );
  } finally {
    // Never leave a stray process behind, even when the assertion above fails (RED phase).
    if (Number.isInteger(grandchildPid)) {
      try {
        process.kill(grandchildPid);
      } catch {
        /* already dead */
      }
    }
    try {
      host.kill();
    } catch {
      /* already exited */
    }
  }
});
