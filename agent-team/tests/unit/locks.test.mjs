import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { arbitrateClaims, acquireLocalSupervisorLock } from '../../src/core/locks.mjs';

test('arbitration selects earliest created claim then lowest comment id', () => {
  const now = new Date('2026-07-12T12:00:00Z');
  const claims = [
    { comment_id: 12, created_at: '2026-07-12T11:59:00Z', expires_at: '2026-07-12T12:10:00Z' },
    { comment_id: 11, created_at: '2026-07-12T11:59:00Z', expires_at: '2026-07-12T12:10:00Z' },
  ];
  assert.equal(arbitrateClaims(claims, now).comment_id, 11);
});

test('arbitration ignores expired claims', () =>
  assert.equal(
    arbitrateClaims(
      [{ comment_id: 1, created_at: '2026-07-12T10:00:00Z', expires_at: '2026-07-12T10:01:00Z' }],
      new Date('2026-07-12T12:00:00Z'),
    ),
    null,
  ));

test('local supervisor lock is exclusive', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-team-lock-'));
  const lock = await acquireLocalSupervisorLock(root);
  await assert.rejects(() => acquireLocalSupervisorLock(root), /supervisor already running/);
  await lock.release();
});
