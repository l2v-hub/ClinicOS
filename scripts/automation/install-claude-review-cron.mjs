#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(import.meta.url);
const REPO = 'l2v-hub/ClinicOS';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const cleanPath = (value) => {
  assert.equal(typeof value, 'string');
  assert.ok(
    path.isAbsolute(value) && !/[\r\n\0]/.test(value),
    'Absolute single-line path required',
  );
  return value;
};
export const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

export function replaceCronBlock(existing, id, command = null) {
  assert.match(id, /^[a-f0-9]{16}$/);
  assert.ok(!command || !/[\r\n\0]/.test(command));
  const begin = `# BEGIN ClinicOS Claude review ${id}`;
  const end = `# END ClinicOS Claude review ${id}`;
  const lines = existing.split('\n');
  const starts = lines.flatMap((line, index) => (line === begin ? [index] : []));
  const ends = lines.flatMap((line, index) => (line === end ? [index] : []));
  if (
    starts.length > 1 ||
    ends.length > 1 ||
    starts.length !== ends.length ||
    (starts.length && starts[0] >= ends[0])
  )
    throw new Error('Ambiguous managed crontab block; preserve and inspect it');
  const block = command ? [begin, command, end] : [];
  if (starts.length) {
    lines.splice(starts[0], ends[0] - starts[0] + 1, ...block);
    return lines.join('\n');
  }
  if (!command) return existing;
  return `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}${block.join('\n')}\n`;
}

export function renderLauncher({ root, stateDir, configDir, executables }) {
  for (const value of [root, stateDir, configDir, ...Object.values(executables)]) cleanPath(value);
  const search = [
    ...new Set(
      [executables.node, executables.gh, executables.git, executables.claude]
        .map((binary) => path.dirname(binary))
        .concat(['/usr/bin', '/bin', '/usr/sbin', '/sbin']),
    ),
  ].join(':');
  return `#!/bin/sh
set -eu
umask 077
PATH=${shellQuote(search)}
export PATH
CLINICOS_CLAUDE_CONFIG_DIR=${shellQuote(configDir)}
CLAUDE_CLI_PATH=${shellQuote(executables.claude)}
export CLINICOS_CLAUDE_CONFIG_DIR CLAUDE_CLI_PATH
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN CODEX_API_KEY OPENAI_API_KEY
lock=${shellQuote(path.join(stateDir, 'cron.lock'))}
if ! mkdir "$lock" 2>/dev/null; then exit 0; fi
trap 'rmdir "$lock"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cd ${shellQuote(root)}
${shellQuote(executables.node)} ${shellQuote(path.join(root, 'agent-team/src/bug-pipeline/claude-review-cron.mjs'))}
`;
}

export async function execute(command, args, { cwd, env = process.env, input } = {}) {
  return new Promise((resolve) => {
    let stdout = '',
      stderr = '',
      error = false,
      overflow = false;
    const child = spawn(command, args, { cwd, env, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGTERM'), 30000);
    for (const [stream, save] of [
      [
        child.stdout,
        (value) => {
          stdout += value;
        },
      ],
      [
        child.stderr,
        (value) => {
          stderr += value;
        },
      ],
    ])
      stream.on('data', (data) => {
        if (stdout.length + stderr.length + data.length > 1024 * 1024) {
          overflow = true;
          child.kill('SIGTERM');
        } else save(data.toString());
      });
    child.once('error', () => {
      error = true;
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: !error && !overflow && code === 0, code, stdout, stderr });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

async function findExecutable(name, search) {
  if (name.includes(path.sep)) {
    try {
      await access(name, constants.X_OK);
      return path.resolve(name);
    } catch {
      return null;
    }
  }
  for (const directory of search.split(path.delimiter).filter(Boolean)) {
    const candidate = path.resolve(directory, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* next PATH entry */
    }
  }
  return null;
}

export async function prerequisites({
  root,
  configDir,
  executables,
  run = execute,
  env = process.env,
}) {
  const checks = Object.fromEntries(
    Object.entries(executables).map(([name, binary]) => [name, Boolean(binary)]),
  );
  const localEnv = { CLAUDE_CONFIG_DIR: configDir, DISABLE_AUTOUPDATER: '1' };
  for (const key of [
    'PATH',
    'HOME',
    'LANG',
    'LC_ALL',
    'TERM',
    'TMPDIR',
    'SSL_CERT_FILE',
    'NODE_EXTRA_CA_CERTS',
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
  ])
    if (env[key]) localEnv[key] = env[key];
  if (executables.claude) {
    const auth = await run(executables.claude, ['auth', 'status'], { cwd: root, env: localEnv });
    try {
      const value = JSON.parse(auth.stdout);
      checks.claudeMaxLogin =
        auth.ok &&
        value.loggedIn === true &&
        value.authMethod === 'claude.ai' &&
        ['max', 'pro'].includes(String(value.subscriptionType).toLowerCase());
    } catch {
      checks.claudeMaxLogin = false;
    }
  } else checks.claudeMaxLogin = false;
  if (executables.git) {
    const git = await run(executables.git, ['rev-parse', '--show-toplevel'], { cwd: root, env });
    checks.checkout = git.ok && path.resolve(git.stdout.trim()) === root;
  } else checks.checkout = false;
  if (executables.gh) {
    const user = await run(executables.gh, ['api', 'user', '--jq', '.login'], { cwd: root, env });
    const actor = user.stdout.trim();
    if (user.ok && /^[A-Za-z0-9-]{1,39}$/.test(actor)) {
      const permission = await run(
        executables.gh,
        ['api', `repos/${REPO}/collaborators/${actor}/permission`, '--jq', '.permission'],
        { cwd: root, env },
      );
      checks.githubWrite =
        permission.ok && ['admin', 'maintain', 'write'].includes(permission.stdout.trim());
    } else checks.githubWrite = false;
  } else checks.githubWrite = false;
  return { ready: Object.values(checks).every(Boolean), checks };
}

async function readCrontab(binary, run) {
  const result = await run(binary, ['-l']);
  if (result.ok) return result.stdout;
  if (result.code === 1 && /no crontab for/i.test(result.stderr)) return '';
  throw new Error('Cannot read current crontab; nothing replaced');
}

async function launchPlan({ root, stateDir, configDir, executables }) {
  const body = renderLauncher({ root, stateDir, configDir, executables });
  const launcher = path.join(stateDir, `runner-${digest(body).slice(0, 16)}.sh`);
  const log = path.join(stateDir, 'cron.log');
  const template = await readFile(
    path.join(root, 'scripts/automation/claude-review.crontab'),
    'utf8',
  );
  const schedule = template.split('\n').filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(schedule, ['*/5 * * * * {{COMMAND}}']);
  // Cron treats '%' specially even inside shell quotes; escape at the crontab layer.
  const command = schedule[0]
    .replace('{{COMMAND}}', `/bin/sh ${shellQuote(launcher)} >> ${shellQuote(log)} 2>&1`)
    .replaceAll('%', '\\%');
  return { body, launcher, log, command };
}

async function verifyPrivate(target, type) {
  const info = await lstat(target);
  if (
    info.isSymbolicLink() ||
    !(type === 'directory' ? info.isDirectory() : info.isFile()) ||
    info.mode & 0o077 ||
    (typeof process.getuid === 'function' && info.uid !== process.getuid())
  )
    throw new Error('Cron state must be private, owned and free of symlinks');
}

async function verifyPlan(stateDir, plan) {
  await verifyPrivate(stateDir, 'directory');
  await verifyPrivate(plan.launcher, 'file');
  await verifyPrivate(plan.log, 'file');
  if ((await readFile(plan.launcher, 'utf8')) !== plan.body)
    throw new Error('Existing launcher differs; preserve and inspect it');
}

export async function installCron({
  root,
  stateDir,
  configDir,
  executables,
  run = execute,
  env = process.env,
  mode = 'install',
}) {
  assert.ok(['install', 'check', 'remove'].includes(mode));
  root = await realpath(cleanPath(root));
  cleanPath(stateDir);
  cleanPath(configDir);
  const id = digest(root).slice(0, 16);
  const report =
    mode === 'remove' ? null : await prerequisites({ root, configDir, executables, run, env });
  if (!executables.crontab)
    return {
      status: 'blocked-prerequisites',
      ...report,
      ready: false,
      installed: false,
      checks: { ...report?.checks, crontab: false },
    };
  const original = await readCrontab(executables.crontab, run);
  // Validate matching, unique delimiters even for read-only checks or blocked prerequisites.
  const removed = replaceCronBlock(original, id, null);
  const entryPresent = removed !== original;
  if (report && !report.ready)
    return { status: 'blocked-prerequisites', ...report, installed: false, entryPresent };
  const plan =
    mode === 'remove' ? null : await launchPlan({ root, stateDir, configDir, executables });
  if (mode === 'check') {
    if (entryPresent) {
      if (replaceCronBlock(original, id, plan.command) !== original)
        throw new Error('Managed cron command differs; preserve and inspect it');
      await verifyPlan(stateDir, plan);
    }
    return {
      status: entryPresent ? 'installed' : 'prerequisites-ready',
      ...report,
      installed: entryPresent,
      id,
      intervalMinutes: 5,
    };
  }
  if (mode === 'install') {
    await mkdir(stateDir, { recursive: true, mode: 0o700 });
    await verifyPrivate(stateDir, 'directory');
    try {
      await writeFile(plan.launcher, plan.body, { flag: 'wx', mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await verifyPrivate(plan.launcher, 'file');
      if ((await readFile(plan.launcher, 'utf8')) !== plan.body)
        throw new Error('Existing launcher differs; preserve and inspect it');
    }
    try {
      await writeFile(plan.log, '', { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    await verifyPlan(stateDir, plan);
  }
  const updated = replaceCronBlock(original, id, plan?.command ?? null);
  if (updated === original)
    return { status: mode === 'remove' ? 'already-removed' : 'already-installed', ready: true, id };
  if ((await readCrontab(executables.crontab, run)) !== original)
    throw new Error('Crontab changed concurrently; nothing replaced');
  const result = await run(executables.crontab, ['-'], { input: updated });
  if (!result.ok) throw new Error('Crontab installation failed');
  if ((await readCrontab(executables.crontab, run)) !== updated)
    throw new Error('Installed crontab could not be verified');
  return {
    status: mode === 'remove' ? 'removed' : 'installed',
    ready: true,
    id,
    intervalMinutes: 5,
    stateDir,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  try {
    assert.ok(
      process.platform === 'linux' || process.platform === 'darwin',
      'POSIX cron requires Linux or macOS',
    );
    const flags = process.argv.slice(2);
    assert.ok(
      flags.length <= 1 && flags.every((flag) => ['--check', '--remove'].includes(flag)),
      'Unknown installer option',
    );
    const root = await realpath(path.resolve(path.dirname(FILE), '../..'));
    const stateDir = path.join(
      os.homedir(),
      '.local/state/clinicos-claude-review',
      digest(root).slice(0, 16),
    );
    const executables = { node: process.execPath };
    for (const name of ['git', 'gh', 'claude', 'crontab'])
      executables[name] = await findExecutable(
        name === 'claude' ? process.env.CLAUDE_CLI_PATH || name : name,
        process.env.PATH || '',
      );
    const report = await installCron({
      root,
      stateDir,
      configDir: path.resolve(
        process.env.CLINICOS_CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
      ),
      executables,
      mode: flags.includes('--remove') ? 'remove' : flags.includes('--check') ? 'check' : 'install',
    });
    console.log(JSON.stringify(report));
    process.exitCode = report.ready ? 0 : 1;
  } catch {
    console.error(
      'Cron setup blocked. Check local Claude Max login, GitHub write access and the existing user crontab. No credentials are printed or copied.',
    );
    process.exitCode = 1;
  }
}
