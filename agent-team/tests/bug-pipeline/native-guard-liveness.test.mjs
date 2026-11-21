import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  boundedCleanup,
  runtimeCleanup,
  stageGuardedSession,
  createNativeRuntimeFactory,
} from '../../src/bug-pipeline/native-guard-session.mjs';

test(
  'real factory missing CLI path reports proven cleanup and removes its directory',
  { skip: process.platform !== 'linux', timeout: 30000 },
  async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'native-factory-test-'));
    const previous = process.env.TMPDIR;
    process.env.TMPDIR = dir;
    try {
      const runtime = createNativeRuntimeFactory({
        cliPath: '/missing-native-cli-fixture',
        oauthToken: 'synthetic-only-token',
      });
      await assert.rejects(
        stageGuardedSession({
          expected: {
            input: 'synthetic',
            schema: {},
            subjectSha: 'a'.repeat(40),
            model: 'claude-opus-5-5',
            contextWindow: 1000000,
            outputCap: 32768,
          },
          startRuntime: runtime,
          validateClaim: async () => true,
          timeoutMs: 20000,
          cleanupTimeoutMs: 10000,
        }),
        { message: 'native-session-rejected' },
      );
      assert.deepEqual(await readdir(dir), []);
    } finally {
      if (previous === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = previous;
      await rm(dir, { recursive: true, force: true });
    }
  },
);

const fixture = fileURLToPath(new URL('./fixtures/native-liveness-child.mjs', import.meta.url));
test('hung proxy still starts container stop and never reports removed resources', () => {
  const child = fileURLToPath(new URL('./fixtures/native-resource-child.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [child], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'native-session-cleanup-failed proxy=1 container=1 removed=0');
});
for (const [mode, message] of [
  ['startup', 'native-session-cleanup-failed'],
  ['cleanup', 'native-session-cleanup-failed'],
  ['isolation', 'native-session-rejected'],
  ['release', 'native-session-rejected forwards=1'],
  ['late-success', 'native-session-rejected closes=1 forwards=0'],
  ['late-reject', 'native-session-cleanup-failed closes=1 forwards=0'],
  ['late-hang', 'native-session-cleanup-failed closes=1 forwards=0'],
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

test('untrusted startup rejection cannot claim proven cleanup', async () => {
  for (const text of ['native-runtime-rejected', 'native-session-cleanup-failed']) {
    await assert.rejects(
      stageGuardedSession({
        expected: {
          input: 'synthetic',
          schema: {},
          subjectSha: 'a'.repeat(40),
          model: 'claude-opus-5-5',
          contextWindow: 1000000,
          outputCap: 32768,
        },
        startRuntime: async () => {
          throw Error(text);
        },
        validateClaim: async () => true,
        timeoutMs: 100,
        cleanupTimeoutMs: 50,
      }),
      { message: 'native-session-cleanup-failed' },
    );
  }
});

test('late startup after cleanup timeout is closed exactly once and cannot regain authority', async () => {
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
    { message: 'native-session-cleanup-failed' },
  );
  resolveStartup({
    close: async () => {
      closes++;
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(closes, 1);
});

for (const mode of ['success', 'reject', 'hang'])
  test(`TLS key is synchronously erased on ${mode} resource cleanup`, async () => {
    const key = Buffer.from('synthetic private key');
    let proxyCalls = 0,
      containerCalls = 0,
      removals = 0;
    const close = runtimeCleanup(
      { dispose: () => key.fill(0) },
      {
        close: () => {
          proxyCalls++;
          if (mode === 'hang') return new Promise(() => {});
        },
      },
      {
        close: () => {
          containerCalls++;
          if (mode === 'reject') throw Error('private');
          return { removed: true };
        },
      },
      async () => {
        removals++;
      },
      40,
    );
    const result = close();
    assert.ok(key.every((byte) => byte === 0));
    assert.equal(proxyCalls, 1);
    assert.equal(containerCalls, 1);
    if (mode === 'success') await result;
    else await assert.rejects(result, { message: 'native-session-cleanup-failed' });
    assert.equal(removals, mode === 'success' ? 1 : 0);
  });

test('failed disposal still attempts both stops and never removes the directory', async () => {
  let proxyCalls = 0,
    containerCalls = 0,
    removals = 0;
  const close = runtimeCleanup(
    {
      dispose: () => {
        throw Error('private');
      },
    },
    {
      close: () => {
        proxyCalls++;
      },
    },
    {
      close: () => {
        containerCalls++;
        return { removed: true };
      },
    },
    async () => {
      removals++;
    },
    40,
  );
  await assert.rejects(close(), { message: 'native-session-cleanup-failed' });
  assert.deepEqual([proxyCalls, containerCalls, removals], [1, 1, 0]);
});
