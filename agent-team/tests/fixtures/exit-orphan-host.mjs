// QA-263-015 fixture: a supervisor-like host that launches an owned long-lived child through
// the process runner and then terminates (process.exit) while the child is still alive.
// The runner's exit hook must take the owned process tree down with the host.
import { existsSync, readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { runProcess } from '../../src/adapters/process-runner.mjs';

const pidFile = process.argv[2];
if (!pidFile) { console.error('usage: exit-orphan-host.mjs <pid-file>'); process.exit(2); }

// The grandchild records its own pid, then idles far longer than this host lives.
void runProcess({
  command: process.execPath,
  args: ['-e', "require('fs').writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000);", pidFile],
  cwd: process.cwd(),
  timeoutMs: 60000,
  maxOutputBytes: 1024
});

for (let waited = 0; waited < 15000; waited += 50) {
  if (existsSync(pidFile) && readFileSync(pidFile, 'utf8').trim().length > 0) break;
  await delay(50);
}

// Outer termination while the owned child is still running.
process.exit(0);
