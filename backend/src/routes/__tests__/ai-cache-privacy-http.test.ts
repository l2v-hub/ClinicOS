import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { Express } from 'express';

let server: Server;
let base = '';
let app: Express;
const previousAuthMode = process.env.AUTH_MODE;
const previousNodeEnv = process.env.NODE_ENV;
const previousDatabaseUrl = process.env.DATABASE_URL;

before(async () => {
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
  app = (await import('../../app.js')).default;
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
  if (previousAuthMode === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = previousAuthMode;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('public AI successes, auth denials and parser errors are non-cacheable', async () => {
  const success = await fetch(`${base}/ai/extraction/status`);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get('cache-control'), 'private, no-store');

  const unauthenticatedRequests: Array<[string, RequestInit]> = [
    ['/ai/assistant/query', { method: 'POST', body: '{}' }],
    ['/ai/actions/plan', { method: 'POST', body: '{}' }],
    ['/ai/voice/plan', { method: 'POST', body: '{}' }],
    ['/ai/audit', {}],
  ];
  for (const [path, init] of unauthenticatedRequests) {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 401, path);
    assert.equal(response.headers.get('cache-control'), 'private, no-store', path);
  }

  const oversized = await fetch(`${base}/ai/actions/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: 'x'.repeat(600 * 1024) }),
  });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.headers.get('cache-control'), 'private, no-store');
});
