import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app, { developmentOrigins, isAllowedOrigin } from '../app.js';

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
