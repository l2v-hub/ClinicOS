import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isSupervisorLive } from '../core/locks.mjs';

// Graceful stop: request shutdown, then wait until the supervisor's heartbeat goes stale
// (lease-safe: the loop finishes its current reconciliation before honoring the request).
export async function run({ config, deps = {} }) {
  const isLive =
    deps.isLive ??
    (() => isSupervisorLive(config.runtimeRoot, { heartbeatTimeoutMs: config.heartbeatTimeoutMs }));
  const sleep = deps.sleep ?? delay;
  const pollMs = deps.pollMs ?? Math.min(500, config.heartbeatTimeoutMs);
  const timeoutMs = deps.timeoutMs ?? config.heartbeatTimeoutMs * 4;

  await mkdir(config.runtimeRoot, { recursive: true });
  await writeFile(path.join(config.runtimeRoot, 'stop.request'), new Date().toISOString());

  let waited = 0;
  while (await isLive()) {
    if (waited >= timeoutMs)
      return {
        ok: false,
        stop_requested: true,
        stopped: false,
        waited_ms: waited,
        timed_out: true,
      };
    await sleep(pollMs);
    waited += pollMs;
  }
  return { ok: true, stop_requested: true, stopped: true, waited_ms: waited, timed_out: false };
}
