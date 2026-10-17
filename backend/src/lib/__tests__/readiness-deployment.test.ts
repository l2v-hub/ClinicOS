import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readinessHandler, setReadinessDeps } from '../readiness.js';

const deploymentId = '12345678-1234-4234-8234-123456789abc';
test('readiness exposes only a valid optional public Railway deployment identity with no-store', async () => {
  const previous = process.env.RAILWAY_DEPLOYMENT_ID;
  setReadinessDeps({ pingDatabase: async () => 1, loadPolicy: async () => ({}) });
  const app = express();
  app.get('/ready', readinessHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    for (const value of [
      undefined,
      '',
      'not-a-uuid',
      'https://sensitive.example/a',
      deploymentId,
      `${deploymentId}\n`,
    ]) {
      if (value === undefined) delete process.env.RAILWAY_DEPLOYMENT_ID;
      else process.env.RAILWAY_DEPLOYMENT_ID = value;
      const response = await fetch(`http://127.0.0.1:${address.port}/ready`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(body.status, 'ready');
      assert.equal(body.checks.database, 'ok');
      assert.equal(body.checks.policy, 'ok');
      assert.equal(body.deploymentId, value === deploymentId ? deploymentId : undefined);
      assert.equal(
        Object.keys(body).sort().join(','),
        value === deploymentId
          ? 'ai,authMode,checks,deploymentId,status,tier'
          : 'ai,authMode,checks,status,tier',
      );
    }
    process.env.RAILWAY_DEPLOYMENT_ID = deploymentId;
    setReadinessDeps({
      pingDatabase: async () => {
        throw new Error('private connection failure');
      },
      loadPolicy: async () => ({}),
    });
    const response = await fetch(`http://127.0.0.1:${address.port}/ready`);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.deploymentId, deploymentId);
    assert.equal(body.status, 'not_ready');
    assert.equal(JSON.stringify(body).includes('private connection failure'), false);
  } finally {
    if (previous === undefined) delete process.env.RAILWAY_DEPLOYMENT_ID;
    else process.env.RAILWAY_DEPLOYMENT_ID = previous;
    setReadinessDeps(null);
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
