import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { sanitizeText } from '../core/sanitize.mjs';

// Models/tests never receive the controller's GitHub or deployment credentials.
export function childEnvironment(mode, env, runtimeRoot) {
  const binPaths = [env.CODEX_CLI_PATH, env.CLAUDE_CLI_PATH]
    .filter(Boolean)
    .map((f) => path.dirname(f));
  const base = {
    PATH: [...binPaths, env.PATH].filter(Boolean).join(path.delimiter),
    LANG: 'C.UTF-8',
    CI: 'true',
    DISABLE_AUTOUPDATER: '1',
  };
  if (mode === 'controller') {
    for (const key of [
      'HOME',
      'GH_TOKEN',
      'GITHUB_TOKEN',
      'HTTPS_PROXY',
      'HTTP_PROXY',
      'NO_PROXY',
      'SSL_CERT_FILE',
      'NODE_EXTRA_CA_CERTS',
    ])
      if (env[key]) base[key] = env[key];
    base.GIT_AUTHOR_NAME = base.GIT_COMMITTER_NAME = 'ClinicOS bug pipeline';
    base.GIT_AUTHOR_EMAIL = base.GIT_COMMITTER_EMAIL =
      'clinicos-bug-pipeline@users.noreply.github.com';
  } else {
    base.HOME = path.join(
      runtimeRoot,
      mode === 'model' || mode === 'review' ? 'model-home' : 'verification-home',
    );
    base.CODEX_HOME =
      mode === 'model' && !env.CODEX_API_KEY && env.CODEX_HOME
        ? env.CODEX_HOME
        : path.join(base.HOME, '.codex');
    base.CLAUDE_CONFIG_DIR = path.join(base.HOME, '.claude');
    if (mode === 'model' && env.CODEX_API_KEY) base.CODEX_API_KEY = env.CODEX_API_KEY;
    if (mode === 'review') {
      const oauth =
        env.CLAUDE_CODE_OAUTH_TOKEN ||
        (env.ANTHROPIC_API_KEY?.startsWith('sk-ant-oat01-') ? env.ANTHROPIC_API_KEY : undefined);
      if (oauth) base.CLAUDE_CODE_OAUTH_TOKEN = oauth;
      else if (env.CLAUDE_REVIEW_AUTH_MODE !== 'subscription' && env.ANTHROPIC_API_KEY)
        base.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    }
    base.NODE_ENV = 'test';
    base.AUTH_MODE = 'demo';
    base.VITE_API_URL = 'http://127.0.0.1:3001';
    base.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/clinicos_test?schema=public';
    base.AI_PROVIDER = 'mock';
    base.AI_RUNTIME_URL = 'http://127.0.0.1:8000';
    base.AI_RUNTIME_SERVICE_TOKEN = 'ci-mock-runtime-token';
  }
  return base;
}
export function createRunner({ env = process.env, runtimeRoot }) {
  return async ({
    command,
    args = [],
    cwd,
    input,
    timeoutMs = 30_000,
    maxOutputBytes = 2 * 1024 * 1024,
    envMode = 'controller',
  }) => {
    const childEnv = childEnvironment(envMode, env, runtimeRoot);
    if (
      envMode === 'review' &&
      env.CLAUDE_REVIEW_AUTH_MODE === 'subscription' &&
      !childEnv.CLAUDE_CODE_OAUTH_TOKEN
    ) {
      return {
        ok: false,
        code: null,
        error: 'subscription-oauth-required',
        stdout: '',
        stderr: '',
      };
    }
    if (envMode !== 'controller') {
      for (const directory of [childEnv.HOME, childEnv.CODEX_HOME, childEnv.CLAUDE_CONFIG_DIR]) {
        await mkdir(directory, { recursive: true, mode: 0o700 });
      }
    }
    const executable =
      command === 'codex'
        ? env.CODEX_CLI_PATH || command
        : command === 'claude'
          ? env.CLAUDE_CLI_PATH || command
          : command;
    return new Promise((resolve) => {
      let stdout = '',
        stderr = '',
        failure = null,
        bytes = 0,
        finished = false;
      const child = spawn(executable, args, {
        cwd,
        env: childEnv,
        shell: false,
        detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const kill = (signal) => {
        try {
          if (process.platform !== 'win32') process.kill(-child.pid, signal);
          else child.kill(signal);
        } catch {
          /* already exited */
        }
      };
      let hardKill;
      const fail = (reason) => {
        failure ??= reason;
        kill('SIGTERM');
        hardKill ??= setTimeout(() => kill('SIGKILL'), 1000);
      };
      const timer = setTimeout(() => fail('timeout'), timeoutMs);
      const data = (kind, chunk) => {
        bytes += chunk.length;
        if (bytes > maxOutputBytes) return fail('output-limit');
        if (kind === 'out') stdout += chunk;
        else stderr += chunk;
      };
      child.stdout.on('data', (c) => data('out', c));
      child.stderr.on('data', (c) => data('err', c));
      const finish = (code, error = null) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        clearTimeout(hardKill);
        kill('SIGKILL');
        resolve({
          ok: code === 0 && !failure && !error,
          code,
          error: failure ?? error,
          stdout: sanitizeText(stdout),
          stderr: sanitizeText(stderr),
        });
      };
      child.on('error', () => finish(null, 'spawn-failed'));
      child.on('close', (code) => finish(code));
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    });
  };
}
