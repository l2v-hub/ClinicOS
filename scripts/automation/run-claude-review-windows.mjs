#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lstat, readFile, realpath, open, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

export async function runWindowsReview(configFile, { env = process.env } = {}) {
  assert.ok(path.isAbsolute(configFile));
  const configInfo = await lstat(configFile);
  assert.ok(configInfo.isFile() && !configInfo.isSymbolicLink() && configInfo.nlink === 1);
  const directory = path.dirname(configFile);
  assert.equal(await realpath(directory), directory, 'Redirected scheduler directory');
  assert.ok((await lstat(directory)).isDirectory());
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  assert.deepEqual(Object.keys(config).sort(), ['claude', 'configDir', 'gh', 'git', 'root']);
  for (const value of Object.values(config))
    assert.ok(typeof value === 'string' && path.isAbsolute(value) && !/[\r\n\0]/.test(value));
  assert.equal(await realpath(config.root), config.root);
  const worker = path.join(config.root, 'agent-team/src/bug-pipeline/claude-review-cron.mjs');
  const lock = await open(path.join(directory, 'review.lock'), 'wx').catch((error) => {
    if (error.code === 'EEXIST') return null;
    throw error;
  });
  if (!lock) return { status: 'already-running', code: 0 };
  let log;
  try {
    await lock.writeFile(String(process.pid));
    const logFile = path.join(directory, 'review.log');
    let previous;
    try {
      previous = await lstat(logFile);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (previous)
      assert.ok(
        previous.isFile() && !previous.isSymbolicLink() && previous.nlink === 1,
        'Redirected scheduler log',
      );
    log = await open(logFile, previous ? 'a' : 'wx');
    const opened = await log.stat();
    assert.ok(opened.isFile() && opened.nlink === 1);
    if (previous)
      assert.ok(
        opened.ino === previous.ino && opened.dev === previous.dev,
        'Scheduler log changed',
      );
    const childEnv = {
      ...env,
      CLINICOS_CLAUDE_CONFIG_DIR: config.configDir,
      CLAUDE_CLI_PATH: config.claude,
    };
    childEnv.PATH = [
      path.dirname(config.gh),
      path.dirname(config.git),
      path.dirname(config.claude),
      path.dirname(process.execPath),
      env.PATH,
    ]
      .filter(Boolean)
      .join(path.delimiter);
    for (const key of [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'CLAUDE_CODE_OAUTH_TOKEN',
      'OPENAI_API_KEY',
      'CODEX_API_KEY',
      'CLAUDECODE',
    ])
      delete childEnv[key];
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [worker], {
        cwd: config.root,
        env: childEnv,
        shell: false,
        stdio: ['ignore', log.fd, log.fd],
      });
      child.once('error', reject);
      child.once('close', (code) => resolve(Number.isInteger(code) ? code : 1));
    });
    return { status: code === 0 ? 'completed' : 'blocked', code };
  } finally {
    await log?.close();
    await lock.close();
    // A forcibly terminated process leaves the lock for deliberate inspection.
    await unlink(path.join(directory, 'review.lock'));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3);
    const result = await runWindowsReview(path.resolve(process.argv[2]));
    console.log(JSON.stringify(result));
    process.exitCode = result.code;
  } catch {
    console.error(
      'Windows review blocked; inspect scheduler state and the existing subscription login.',
    );
    process.exitCode = 1;
  }
}
