import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueSimulatorToken } from '../../authz/simulator.js';
import { startApp } from '../../authz/__tests__/harness-support.js';

test('hosted synthetic status is truthful and rejected credentials never reach a database', async () => {
  const env = {
    NODE_ENV: 'production',
    CLINICOS_ENV: 'demo',
    AUTH_MODE: 'demo',
    DEMO_DATASET_ID: 'synthetic-v1',
    ALLOW_PRODUCTION_DEMO_AUTH: 'true',
    DEMO_AUTH_NO_EXPIRY: 'true',
    ROLE_SIMULATOR_ENABLED: 'true',
    ROLE_SIMULATOR_ALLOW_PRODUCTION: 'true',
    ROLE_SIMULATOR_SECRET: 's'.repeat(64),
    DEMO_AUTH_EXPIRES_AT: '2000-01-01T00:00:00Z',
  };
  const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  const { base, close } = await startApp();
  try {
    const status = await fetch(`${base}/auth/status`);
    assert.deepEqual(await status.json(), {
      mode: 'demo',
      simulator: true,
      temporaryDemo: false,
      syntheticOnly: true,
      expiresAt: null,
    });
    const headerOnly = await fetch(`${base}/auth/me`, {
      headers: { 'X-Operator-Id': 'SIM-ADMIN', 'X-Operator-Role': 'admin' },
    });
    assert.equal(headerOnly.status, 401);
    const token = issueSimulatorToken('SIM-NURSE-1').token;
    const [, encoded, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const forged = `sim.${Buffer.from(JSON.stringify({ ...claims, sub: 'SIM-ADMIN' })).toString('base64url')}.${signature}`;
    assert.equal(
      (await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${forged}` } })).status,
      401,
    );
    process.env.ROLE_SIMULATOR_ENABLED = 'false';
    assert.equal(
      (
        await fetch(`${base}/auth/me`, {
          headers: { 'X-Operator-Id': 'SEED-OP-004', 'X-Operator-Role': 'admin' },
        })
      ).status,
      503,
    );
    assert.equal((await fetch(`${base}/auth/simulator/identities`)).status, 404);
  } finally {
    await close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
