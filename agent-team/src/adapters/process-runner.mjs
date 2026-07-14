import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { sanitizeText } from '../core/sanitize.mjs';

// Timeout kill must take down the whole owned process tree (QA-263-011): on Windows,
// child.kill() terminates only the direct child and would orphan its descendants.
function defaultKillTree(child) {
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
  child.kill();
}

export function runProcess({ command, args = [], cwd, input, timeoutMs = 120000, maxOutputBytes = 1048576, sanitize = true, killTree = defaultKillTree }) {
  const startedAt = new Date().toISOString();
  // QA-263-013: node's spawn reports a missing cwd as `spawn <command> ENOENT`, which is
  // indistinguishable from a missing executable. Refuse invalid coordinates explicitly.
  if (cwd !== undefined && !existsSync(cwd)) {
    return Promise.resolve({ ok: false, code: null, error: sanitizeText(`working directory does not exist: ${cwd}`), command, args, pid: null, startedAt, finishedAt: new Date().toISOString(), stdout: '', stderr: '' });
  }
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    // sanitize:false is reserved for content-addressed reads (digest verification needs exact bytes).
    const clean = (value) => sanitize ? sanitizeText(value.slice(0, maxOutputBytes)) : value.slice(0, maxOutputBytes);
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...payload, command, args, pid: child.pid ?? null, startedAt, finishedAt: new Date().toISOString(), stdout: clean(stdout), stderr: clean(stderr) });
    };
    const timer = setTimeout(() => { killTree(child); finish({ ok: false, code: null, error: `process timeout after ${timeoutMs}ms` }); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish({ ok: false, code: null, error: sanitizeText(error.message) }));
    child.on('close', (code) => finish({ ok: code === 0, code, error: null }));
    try {
      if (input !== undefined) child.stdin.end(input); else child.stdin.end();
    } catch { /* stdin may already be destroyed when spawn fails */ }
  });
}
