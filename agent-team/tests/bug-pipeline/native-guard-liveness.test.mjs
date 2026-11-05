import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  boundedCleanup,
  stageGuardedSession,
} from '../../src/bug-pipeline/native-guard-session.mjs';

const fixture = fileURLToPath(new URL('./fixtures/native-liveness-child.mjs', import.meta.url));
test('hung proxy still starts container stop and never reports removed resources', () => {
  const child = fileURLToPath(new URL('./fixtures/native-resource-child.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [child], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'native-session-cleanup-failed proxy=1 container=1 removed=0');
});
for (const [mode, message] of [
  ['startup', 'native-session-rejected'],
  ['cleanup', 'native-session-cleanup-failed'],
  ['isolation', 'native-session-rejected'],
  ['release', 'native-session-rejected forwards=1'],
]) {
  test(`standalone child settles bounded ${mode} with no keepalive`, () => {
    const result = spawnSync(process.execPath, [fixture, mode], {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), message);
    assert.doesNotMatch(result.stderr, /unsettled top-level await/);
  });
}

test('concurrent cleanup shares one operation and the same sanitized outcome', async () => {
  let calls = 0,
    finish;
  const cleanup = boundedCleanup(() => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  }, 1000);
  const a = cleanup(),
    b = cleanup();
  assert.equal(a, b);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish();
  await Promise.all([a, b]);
  assert.equal(cleanup(), a);
  const failed = boundedCleanup(() => {
    throw new Error('private provider text');
  }, 1000);
  await assert.rejects(failed(), { message: 'native-session-cleanup-failed' });
  await assert.rejects(failed(), { message: 'native-session-cleanup-failed' });
});

test('late startup is closed and cannot regain a rejected capability', async () => {
  let resolveStartup,
    closes = 0;
  const expected = {
    input: 'synthetic',
    schema: {},
    subjectSha: 'a'.repeat(40),
    model: 'claude-opus-5-5',
    contextWindow: 1000000,
    outputCap: 32768,
  };
  const startup = new Promise((resolve) => {
    resolveStartup = resolve;
  });
  await assert.rejects(
    stageGuardedSession({
      expected,
      startRuntime: () => startup,
      validateClaim: async () => true,
      timeoutMs: 30,
      cleanupTimeoutMs: 100,
    }),
  );
  resolveStartup({
    close: async () => {
      closes++;
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(closes, 1);
});
