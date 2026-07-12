import { spawn } from 'node:child_process';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireLocalSupervisorLock, isSupervisorLive, writeHeartbeat } from '../core/locks.mjs';
import { run as runDoctor } from './doctor-entry.mjs';
import { run as runOnce } from './once.mjs';

export async function run({ config, repoRoot, mode }) {
  if (mode === 'start') {
    if (await isSupervisorLive(config.runtimeRoot)) return { ok: false, started: false, error: 'supervisor already running' };
    const health = await runDoctor({ config, repoRoot });
    if (!health.developmentReady || !health.qaReady) return { ok: false, started: false, error: 'doctor prerequisites failed', doctor: health };
    const child = spawn(process.execPath, [path.join(repoRoot, 'agent-team', 'src', 'cli.mjs'), 'loop'], { cwd: repoRoot, detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    return { ok: true, started: true, pid: child.pid };
  }
  const lock = await acquireLocalSupervisorLock(config.runtimeRoot);
  const stopPath = path.join(config.runtimeRoot, 'stop.request');
  await rm(stopPath, { force: true });
  try {
    while (true) {
      try { await access(stopPath); break; } catch { /* keep looping until a stop is requested */ }
      const result = await runOnce({ config, repoRoot, allowCurrentSupervisor: true });
      await writeHeartbeat(config.runtimeRoot, { ok: result.ok, result });
      await delay(config.pollIntervalMs);
    }
    return { ok: true, stopped: true };
  } finally { await lock.release(); await rm(stopPath, { force: true }); }
}
