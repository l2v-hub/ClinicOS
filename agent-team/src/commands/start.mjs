import { spawn } from 'node:child_process';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireLocalSupervisorLock, isSupervisorLive, writeHeartbeat } from '../core/locks.mjs';
import { killOwnedProcessTrees } from '../adapters/process-runner.mjs';
import { recoverActiveWork } from '../core/recovery.mjs';
import { createRuntime } from '../runtime.mjs';
import { run as runDoctor } from './doctor-entry.mjs';
import { run as runOnce } from './once.mjs';

export async function run({ config, repoRoot, mode, deps = {} }) {
  const isLive = deps.isLive ?? (() => isSupervisorLive(config.runtimeRoot, { heartbeatTimeoutMs: config.heartbeatTimeoutMs }));
  const sleep = deps.sleep ?? delay;

  if (mode === 'start') {
    if (await isLive()) return { ok: false, started: false, error: 'supervisor already running' };
    const health = await (deps.doctor ?? (() => runDoctor({ config, repoRoot })))();
    if (!health.developmentReady || !health.qaReady) return { ok: false, started: false, error: 'doctor prerequisites failed', doctor: health };
    const spawnDetached = deps.spawnDetached ?? (() => {
      const child = spawn(process.execPath, [path.join(repoRoot, 'agent-team', 'src', 'cli.mjs'), 'loop'], { cwd: repoRoot, detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return child;
    });
    const child = spawnDetached();
    // Acknowledge only once the detached loop owns the runtime (heartbeat live).
    const ackTimeoutMs = deps.ackTimeoutMs ?? config.heartbeatTimeoutMs * 2;
    let waited = 0;
    const pollMs = deps.pollMs ?? Math.min(250, config.pollIntervalMs);
    while (!(await isLive())) {
      if (waited >= ackTimeoutMs) return { ok: false, started: true, acknowledged: false, pid: child.pid, error: 'supervisor did not acknowledge within the timeout' };
      await sleep(pollMs);
      waited += pollMs;
    }
    return { ok: true, started: true, acknowledged: true, pid: child.pid };
  }

  // loop mode: exclusive lock, restart recovery from GitHub, then reconcile until stop.request.
  const lock = await acquireLocalSupervisorLock(config.runtimeRoot);
  const stopPath = path.join(config.runtimeRoot, 'stop.request');
  await rm(stopPath, { force: true });
  try {
    const runtime = await createRuntime({ config, repoRoot, allowCurrentSupervisor: true });
    const recovery = await recoverActiveWork({ github: runtime.github, config, schemas: runtime.schemas, workerId: runtime.workerId });
    await writeHeartbeat(config.runtimeRoot, { ok: true, recovered: recovery.recovered });
    while (true) {
      try { await access(stopPath); break; } catch { /* keep looping until a stop is requested */ }
      const result = await runOnce({ config, repoRoot, allowCurrentSupervisor: true });
      await writeHeartbeat(config.runtimeRoot, { ok: result.ok, result, recovered: recovery.recovered });
      await sleep(config.pollIntervalMs);
    }
    return { ok: true, stopped: true };
  } finally {
    // QA-263-015: supervisor shutdown must never leave an owned process tree alive; the
    // process runner's exit hook covers abnormal termination, this covers the graceful path.
    killOwnedProcessTrees();
    await lock.release();
    await rm(stopPath, { force: true });
  }
}
