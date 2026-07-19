import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { sanitizeText } from '../core/sanitize.mjs';

// Timeout kill must take down the whole owned process tree (QA-263-011): on Windows,
// child.kill() terminates only the direct child and would orphan its descendants.
function defaultKillTree(child) {
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  }
  child.kill();
}

// QA-263-015: every spawned child is an owned process. The registry lets supervisor
// termination take down every live owned process tree, and the process exit hook makes that
// guarantee unconditional even when no code path calls killOwnedProcessTrees explicitly.
const ownedChildren = new Set();
let exitHookInstalled = false;

function killTreeSync(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return false;
  if (process.platform === 'win32') {
    // Bounded synchronous tree kill (must work inside a process 'exit' handler), then the
    // direct kill as fallback so a blocked/missing taskkill still terminates the child.
    try {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 5000,
      });
    } catch {
      /* fall through to child.kill() */
    }
  }
  try {
    child.kill('SIGKILL');
  } catch {
    /* already gone */
  }
  return true;
}

function installExitHook() {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.on('exit', () => {
    killOwnedProcessTrees();
  });
}

export function killOwnedProcessTrees() {
  let killed = 0;
  for (const child of [...ownedChildren]) {
    if (killTreeSync(child)) killed += 1;
    ownedChildren.delete(child);
  }
  return killed;
}

export function runProcess({
  command,
  args = [],
  cwd,
  input,
  timeoutMs = 120000,
  maxOutputBytes = 1048576,
  sanitize = true,
  killTree = defaultKillTree,
  signal,
}) {
  const startedAt = new Date().toISOString();
  const abortReason = () =>
    sanitizeText(
      `aborted: ${signal?.reason instanceof Error ? signal.reason.message : String(signal?.reason ?? 'unknown reason')}`,
    );
  // QA-263-015: a lease already lost before launch must never start a process at all.
  if (signal?.aborted) {
    return Promise.resolve({
      ok: false,
      code: null,
      error: abortReason(),
      command,
      args,
      pid: null,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: '',
      stderr: '',
    });
  }
  // QA-263-013: node's spawn reports a missing cwd as `spawn <command> ENOENT`, which is
  // indistinguishable from a missing executable. Refuse invalid coordinates explicitly.
  if (cwd !== undefined && !existsSync(cwd)) {
    return Promise.resolve({
      ok: false,
      code: null,
      error: sanitizeText(`working directory does not exist: ${cwd}`),
      command,
      args,
      pid: null,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: '',
      stderr: '',
    });
  }
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    ownedChildren.add(child);
    installExitHook();
    // sanitize:false is reserved for content-addressed reads (digest verification needs exact bytes).
    const clean = (value) =>
      sanitize ? sanitizeText(value.slice(0, maxOutputBytes)) : value.slice(0, maxOutputBytes);
    const onAbort = () => {
      killTree(child);
      finish({ ok: false, code: null, error: abortReason() });
    };
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve({
        ...payload,
        command,
        args,
        pid: child.pid ?? null,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: clean(stdout),
        stderr: clean(stderr),
      });
    };
    const timer = setTimeout(() => {
      killTree(child);
      finish({ ok: false, code: null, error: `process timeout after ${timeoutMs}ms` });
    }, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      ownedChildren.delete(child);
      finish({ ok: false, code: null, error: sanitizeText(error.message) });
    });
    child.on('close', (code) => {
      ownedChildren.delete(child);
      finish({ ok: code === 0, code, error: null });
    });
    try {
      if (input !== undefined) child.stdin.end(input);
      else child.stdin.end();
    } catch {
      /* stdin may already be destroyed when spawn fails */
    }
  });
}
