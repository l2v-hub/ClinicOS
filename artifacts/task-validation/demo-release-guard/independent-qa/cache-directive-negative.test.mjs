import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyLiveReady } from '../../../../agent-team/src/bug-pipeline/demo-deployment.mjs';

const id = '12345678-1234-4234-8234-123456789abc';
for (const directive of [
  'public, max-age=3600, x-no-store-extension=1',
  'public, max-age=3600, no-store-extension',
  'public, max-age=3600, extension="no-store"',
]) {
  test(`cacheable extension does not establish no-store: ${directive}`, async () => {
    await assert.rejects(verifyLiveReady(id, {
      fetchImpl: async () => new Response(JSON.stringify({
        status: 'ready', tier: 'demo', deploymentId: id,
        checks: { database: 'ok', policy: 'ok' },
      }), { headers: { 'Cache-Control': directive } }),
    }), /uncached demo readiness unavailable/);
  });
}
