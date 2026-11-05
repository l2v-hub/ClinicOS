import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('worker entry can self-import while asynchronous CLI main is pending', () => {
  const file = fileURLToPath(
    new URL('../../src/bug-pipeline/cloud-review-worker.mjs', import.meta.url),
  );
  const loader = fileURLToPath(new URL('./fixtures/native-entry-loader.mjs', import.meta.url));
  for (const mode of ['--qualify-native', '--native-review']) {
    const result = spawnSync(
      process.execPath,
      ['--no-warnings', '--experimental-loader', pathToFileURL(loader).href, file, mode],
      {
        env: { PATH: process.env.PATH ?? process.env.Path, SystemRoot: process.env.SystemRoot },
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { status: 'empty' });
    assert.doesNotMatch(result.stderr, /unsettled top-level await/);
  }
});

test('CLI bootstrap rejection emits a finite unknown-outcome receipt without credentials', () => {
  const file = fileURLToPath(
    new URL('../../src/bug-pipeline/cloud-review-worker.mjs', import.meta.url),
  );
  const result = spawnSync(process.execPath, [file, '--native-review'], {
    env: { PATH: process.env.PATH ?? process.env.Path, SystemRoot: process.env.SystemRoot },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  const receipt = JSON.parse(result.stdout);
  assert.deepEqual(receipt, {
    status: 'worker-failed',
    providerExecuted: 'unknown',
    claimed: 'unknown',
    retryAllowed: false,
  });
  assert.doesNotMatch(result.stderr, /AssertionError|Bot token required|GITHUB_/);
});
