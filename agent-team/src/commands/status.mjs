import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function run({ config }) {
  try {
    const heartbeat = JSON.parse(await readFile(path.join(config.runtimeRoot, 'heartbeat.json'), 'utf8'));
    return { ok: true, running: Date.now() - Date.parse(heartbeat.at) < config.heartbeatTimeoutMs, ...heartbeat };
  } catch {
    return { ok: true, running: false, workers: [], issues: [], pull_requests: [], attempts: [], leases: [], subject_shas: [], last_error: null };
  }
}
