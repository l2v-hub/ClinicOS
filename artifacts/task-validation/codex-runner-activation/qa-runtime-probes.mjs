import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createRunner } from '../../../agent-team/src/bug-pipeline/process.mjs';

test('first child sees private config roots and its role credential only', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'runner-qa-'));
  try {
    const run = createRunner({
      runtimeRoot: root,
      env: { PATH: process.env.PATH, CODEX_API_KEY: 'synthetic-model-fixture', ANTHROPIC_API_KEY: 'synthetic-review-fixture', GH_TOKEN: 'synthetic-controller-fixture' },
    });
    for (const role of ['model', 'review', 'verification']) {
      const result = await run({ command: process.execPath, cwd: root, envMode: role, args: ['-e', `
        const fs = require('node:fs');
        process.stdout.write(JSON.stringify({
          roots: ['HOME', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR'].map(key => ({ key, value: process.env[key], mode: fs.statSync(process.env[key]).mode & 0o777 })),
          codex: process.env.CODEX_API_KEY || null, claude: process.env.ANTHROPIC_API_KEY || null, github: process.env.GH_TOKEN || null
        }));
      `] });
      assert.equal(result.ok, true, result.stderr);
      const actual = JSON.parse(result.stdout);
      assert(actual.roots.every(({ value, mode }) => value.startsWith(root + path.sep) && mode === 0o700));
      assert.equal(actual.codex, role === 'model' ? 'synthetic-model-fixture' : null);
      assert.equal(actual.claude, role === 'review' ? 'synthetic-review-fixture' : null);
      assert.equal(actual.github, null);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('existing configuration content survives failed and successful launches', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'runner-qa-'));
  try {
    const run = createRunner({ runtimeRoot: root, env: { PATH: process.env.PATH } });
    const failed = await run({ command: path.join(root, 'missing-executable'), cwd: root, envMode: 'verification' });
    assert.equal(failed.ok, false);
    assert.equal(failed.error, 'spawn-failed');
    const config = path.join(root, 'verification-home', '.codex', 'config.toml');
    await writeFile(config, '# synthetic preserved fixture\n', { mode: 0o600 });
    const success = await run({ command: process.execPath, args: ['-e', 'process.stdout.write("ready")'], cwd: root, envMode: 'verification' });
    assert.equal(success.ok, true);
    assert.equal(success.stdout, 'ready');
    assert.equal(await readFile(config, 'utf8'), '# synthetic preserved fixture\n');
    assert.equal((await stat(config)).mode & 0o777, 0o600);
  } finally { await rm(root, { recursive: true, force: true }); }
});
