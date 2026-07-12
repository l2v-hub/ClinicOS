import { spawn } from 'node:child_process';
import { sanitizeText } from '../core/sanitize.mjs';

export function runProcess({ command, args = [], cwd, input, timeoutMs = 120000, maxOutputBytes = 1048576 }) {
  const startedAt = new Date().toISOString();
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...payload, command, args, startedAt, finishedAt: new Date().toISOString(), stdout: sanitizeText(stdout.slice(0, maxOutputBytes)), stderr: sanitizeText(stderr.slice(0, maxOutputBytes)) });
    };
    const timer = setTimeout(() => { child.kill(); finish({ ok: false, code: null, error: `process timeout after ${timeoutMs}ms` }); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finish({ ok: false, code: null, error: sanitizeText(error.message) }));
    child.on('close', (code) => finish({ ok: code === 0, code, error: null }));
    try {
      if (input !== undefined) child.stdin.end(input); else child.stdin.end();
    } catch { /* stdin may already be destroyed when spawn fails */ }
  });
}
