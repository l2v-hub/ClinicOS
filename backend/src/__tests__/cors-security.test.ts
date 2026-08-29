import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app, { developmentOrigins, isAllowedOrigin } from '../app.js';
import { signUserContext } from '../ai/gateway/context.js';

let server: Server;
let base = '';

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const info = server.address();
      const port = typeof info === 'object' && info ? info.port : 0;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('production CORS accepts only exact configured origins', () => {
  const allowlist = [
    'https://clinicos-eosin.vercel.app',
    'https://clinicos-preview-owner.vercel.app',
  ];

  assert.equal(isAllowedOrigin('https://clinicos-eosin.vercel.app', allowlist), true);
  assert.equal(isAllowedOrigin('https://clinicos-preview-owner.vercel.app', allowlist), true);
  assert.equal(isAllowedOrigin('https://clinicos-evil.vercel.app', allowlist), false);
  assert.equal(isAllowedOrigin('https://clinicos-eosin.vercel.app.evil.example', allowlist), false);
});

test('localhost origins are development-only', () => {
  assert.deepEqual(developmentOrigins({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), []);
  assert.ok(
    developmentOrigins({ NODE_ENV: 'test' } as NodeJS.ProcessEnv).includes('http://localhost:3000'),
  );
});

test('auth/me returns the server-resolved demo identity outside production', async () => {
  const response = await fetch(`${base}/auth/me`, {
    headers: { 'X-Operator-Id': 'operator-server', 'X-Operator-Role': 'operatore' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'operator-server', role: 'operatore' });
});

test('backend responses expose the defensive browser headers without framework disclosure', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(
      response.headers.get('strict-transport-security'),
      'max-age=31536000; includeSubDomains',
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('internal AI rejects legacy spoofed context and accepts only a signed envelope', async () => {
  const previousToken = process.env.AI_RUNTIME_SERVICE_TOKEN;
  const previousSecret = process.env.AI_GATEWAY_CONTEXT_SECRET;
  process.env.AI_RUNTIME_SERVICE_TOKEN = 'route-test-service-token';
  process.env.AI_GATEWAY_CONTEXT_SECRET = 'route-test-context-secret-at-least-32-bytes';
  try {
    const legacy = await fetch(`${base}/internal/ai/search/patients`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer route-test-service-token',
        'content-type': 'application/json',
        'x-ai-user-id': 'attacker',
        'x-ai-roles': 'admin',
      },
      body: JSON.stringify({ query: 'Rossi' }),
    });
    assert.equal(legacy.status, 401);

    const signed = signUserContext({
      userId: 'operator-1',
      tenantId: 'clinicos',
      roles: ['operator'],
      permittedPatientIds: ['patient-1'],
      requestId: 'route-test-1',
    });
    const bounded = await fetch(`${base}/internal/ai/search/patients`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer route-test-service-token',
        'content-type': 'application/json',
        ...signed,
      },
      body: JSON.stringify({}),
    });
    assert.equal(bounded.status, 400);
    assert.equal(bounded.headers.get('cache-control'), 'private, no-store');
    assert.equal(((await bounded.json()) as { kind?: string }).kind, 'bad_request');
  } finally {
    if (previousToken === undefined) delete process.env.AI_RUNTIME_SERVICE_TOKEN;
    else process.env.AI_RUNTIME_SERVICE_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.AI_GATEWAY_CONTEXT_SECRET;
    else process.env.AI_GATEWAY_CONTEXT_SECRET = previousSecret;
  }
});
