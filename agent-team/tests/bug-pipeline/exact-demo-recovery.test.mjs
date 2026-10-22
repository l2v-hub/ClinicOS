import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyReleaseAncestry,
  archiveRecovery,
} from '../../src/bug-pipeline/exact-demo-recovery.mjs';
const merge = 'a'.repeat(40),
  head = 'b'.repeat(40);
test('descendant recovery authenticates both compare endpoints and rereads current main', async () => {
  const comparison = {
    base_commit: { sha: merge },
    merge_base_commit: { sha: merge },
    status: 'ahead',
    ahead_by: 1,
    behind_by: 0,
    commits: [{ sha: head }],
  };
  for (const mutate of [
    null,
    (c) => (c.base_commit.sha = head),
    (c) => (c.merge_base_commit.sha = head),
    (c) => (c.status = 'diverged'),
    (c) => (c.behind_by = 1),
    (c) => (c.commits[0].sha = merge),
  ]) {
    const value = structuredClone(comparison);
    mutate?.(value);
    const reader = {
      getJson: async (route) => (route === 'commits/main' ? { sha: head } : value),
    };
    if (mutate)
      await assert.rejects(
        verifyReleaseAncestry({
          reader,
          originalMergeSha: merge,
          deploymentSha: head,
        }),
      );
    else
      assert.deepEqual(
        await verifyReleaseAncestry({
          reader,
          originalMergeSha: merge,
          deploymentSha: head,
        }),
        { originalMergeSha: merge, deploymentSha: head },
      );
  }
  let reads = 0;
  await assert.rejects(
    verifyReleaseAncestry({
      reader: {
        getJson: async (route) =>
          route === 'commits/main' ? { sha: ++reads === 1 ? head : merge } : comparison,
      },
      originalMergeSha: merge,
      deploymentSha: head,
    }),
    /main changed/,
  );
});
test('recovery archives exact old progress and deployment facts without changing review or attempt histories', () => {
  const batch = {
    sha: merge,
    reviews: [{ status: 'approved' }],
    implementation: [{ round: 1, status: 'passed' }],
    releaseBlock: { id: 'old' },
    releaseHold: 'exact-release-block',
    release: {
      status: 'merged',
      mergeSha: merge,
      deployment: { vercelUrl: 'https://old.vercel.app' },
      publication: { status: 'pending' },
    },
    exactDemoDispatches: {
      deploy: {
        runId: 5,
        priorRunIds: [3],
        dispatchId: '12345678-1234-4123-8123-123456789abc',
      },
    },
  };
  const before = structuredClone(batch);
  const archive = archiveRecovery(batch, {
    actor: 'l2v-hub',
    deploymentSha: head,
    newId: () => '22345678-1234-4123-8123-123456789abc',
  });
  assert.deepEqual(archive.dispatches, before.exactDemoDispatches);
  assert.deepEqual(archive.release, before.release);
  assert.deepEqual(batch.reviews, before.reviews);
  assert.deepEqual(batch.implementation, before.implementation);
  assert.deepEqual(batch.exactDemoRecovery.excludedRunIds, [3, 5]);
  assert.equal(batch.release.deployment, undefined);
  assert.equal(batch.release.publication, undefined);
  assert.equal(batch.releaseBlock, undefined);
  assert.equal(batch.release.deploymentSha, head);
});
