import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reconcileOnce } from '../../src/core/reconciler.mjs';
import { acquireLocalSupervisorLock } from '../../src/core/locks.mjs';

test('reconciler never launches development when doctor says Claude is unavailable', async () => {
  let developmentRuns = 0;
  const result = await reconcileOnce({ doctor: async () => ({ developmentReady: false, qaReady: true }), listDevelopment: async () => [{ number: 263 }], listQa: async () => [], runDevelopment: async () => { developmentRuns += 1; }, runQa: async () => {} });
  assert.equal(developmentRuns, 0);
  assert.equal(result.development.skipped_reason, 'doctor-not-ready');
});

test('duplicate supervisor lock remains rejected', async () => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-supervisor-'));
  const first = await acquireLocalSupervisorLock(runtimeRoot);
  await assert.rejects(() => acquireLocalSupervisorLock(runtimeRoot), /already running/);
  await first.release();
});
