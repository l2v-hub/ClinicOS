import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { childEnvironment, createRunner } from '../../src/bug-pipeline/process.mjs';
import { sanitizeText } from '../../src/core/sanitize.mjs';

const fixture = {
  PATH: process.env.PATH,
  CLAUDE_REVIEW_AUTH_MODE: 'subscription',
  CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-synthetic-fixture',
  ANTHROPIC_API_KEY: 'sk-ant-api03-synthetic-fixture',
  GH_TOKEN: 'github_pat_synthetic_fixture',
};

test('external subscription mode reuses only the explicit local config and excludes every token/API fallback', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'external-auth-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = path.join(directory, 'own-subscription-config');
  const env = {
    ...fixture,
    CLAUDE_REVIEW_AUTH_MODE: 'subscription-local',
    CLINICOS_CLAUDE_CONFIG_DIR: config,
  };
  const run = createRunner({ env, runtimeRoot: path.join(directory, 'runtime') });
  const result = await run({
    command: process.execPath,
    args: [
      '-e',
      'require("node:fs").writeSync(1, JSON.stringify({config:process.env.CLAUDE_CONFIG_DIR,api:!!process.env.ANTHROPIC_API_KEY,oauth:!!process.env.CLAUDE_CODE_OAUTH_TOKEN,github:!!process.env.GH_TOKEN}))',
    ],
    cwd: directory,
    envMode: 'review',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(result.stdout), { config, api: false, oauth: false, github: false });
  const missing = createRunner({
    env: { ...env, CLINICOS_CLAUDE_CONFIG_DIR: undefined },
    runtimeRoot: directory,
  });
  assert.equal(
    (await missing({ command: process.execPath, cwd: directory, envMode: 'review' })).error,
    'local-subscription-config-required',
  );
});

test('Max OAuth is confined to the reviewer and excludes separately billed API authentication', () => {
  for (const mode of ['controller', 'model', 'verification', 'review']) {
    const child = childEnvironment(mode, fixture, '/tmp/max-review-test');
    assert.equal(child.ANTHROPIC_API_KEY, undefined);
    assert.equal(
      child.CLAUDE_CODE_OAUTH_TOKEN,
      mode === 'review' ? fixture.CLAUDE_CODE_OAUTH_TOKEN : undefined,
    );
  }
});

test('subscription mode fails closed with only an API key and recognizes a legacy OAuth secret', () => {
  const env = { ...fixture, CLAUDE_CODE_OAUTH_TOKEN: undefined };
  const missing = childEnvironment('review', env, '/tmp/max-review-test');
  assert.equal(missing.ANTHROPIC_API_KEY, undefined);
  assert.equal(missing.CLAUDE_CODE_OAUTH_TOKEN, undefined);
  env.ANTHROPIC_API_KEY = fixture.CLAUDE_CODE_OAUTH_TOKEN;
  const legacy = childEnvironment('review', env, '/tmp/max-review-test');
  assert.equal(legacy.CLAUDE_CODE_OAUTH_TOKEN, fixture.CLAUDE_CODE_OAUTH_TOKEN);
  assert.equal(legacy.ANTHROPIC_API_KEY, undefined);
});

test('actual reviewer subprocess has OAuth only, including when both credentials exist', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'max-auth-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const run = createRunner({ env: fixture, runtimeRoot: directory });
  const result = await run({
    command: process.execPath,
    args: [
      '-e',
      'require("node:fs").writeSync(1, JSON.stringify({oauth: Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN), api: Boolean(process.env.ANTHROPIC_API_KEY), github: Boolean(process.env.GH_TOKEN)}))',
    ],
    cwd: directory,
    envMode: 'review',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(result.stdout), { oauth: true, api: false, github: false });
});

test('missing Max OAuth prevents launching a reviewer even with cached API authentication', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'max-auth-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cache = path.join(directory, 'model-home', '.claude');
  await mkdir(cache, { recursive: true });
  await writeFile(
    path.join(cache, '.credentials.json'),
    JSON.stringify({ apiKey: fixture.ANTHROPIC_API_KEY }),
  );
  const marker = path.join(directory, 'launched.txt');
  const run = createRunner({
    env: { ...fixture, CLAUDE_CODE_OAUTH_TOKEN: undefined },
    runtimeRoot: directory,
  });
  const result = await run({
    command: process.execPath,
    args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'launched')`],
    cwd: directory,
    envMode: 'review',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'subscription-oauth-required');
  await assert.rejects(access(marker), { code: 'ENOENT' });
});

test('captured diagnostics redact OAuth and GitHub token forms and arbitrary OAuth assignments', () => {
  for (const secret of [fixture.CLAUDE_CODE_OAUTH_TOKEN, fixture.GH_TOKEN]) {
    assert.ok(!sanitizeText(`failed: ${secret}`).includes(secret));
  }
  assert.equal(
    sanitizeText('CLAUDE_CODE_OAUTH_TOKEN=synthetic_opaque_value'),
    'CLAUDE_CODE_OAUTH_TOKEN=[REDACTED]',
  );
});
