import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';

process.env.AUTH_MODE = 'demo';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:9/clinicos_test';

const SECURITY_HEADERS: Record<string, RegExp> = {
  'content-security-policy': /default-src 'none'.*frame-ancestors 'none'/,
  'x-content-type-options': /nosniff/,
  'x-frame-options': /DENY/,
  'referrer-policy': /no-referrer/,
};

async function withServer(
  run: (base: string) => Promise<void>,
  context: Parameters<Parameters<typeof test>[1]>[0],
) {
  const { default: app } = await import('../app.js');
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  context.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await run(`http://127.0.0.1:${port}`);
}

function assertSecurityHeaders(response: Response) {
  for (const [name, expected] of Object.entries(SECURITY_HEADERS)) {
    assert.match(response.headers.get(name) ?? '', expected, `${name} missing`);
  }
}

test('API responses carry the non-renderable security policy', async (t) => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assertSecurityHeaders(response);
  }, t);
});

test('standard JSON endpoints reject payloads above 512 KiB with a uniform 413', async (t) => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/ai/actions/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(513 * 1024) }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      error: 'Payload JSON troppo grande',
      code: 'payload_too_large',
    });
    assertSecurityHeaders(response);
  }, t);
});

test('malformed JSON receives a bounded error without parser internals', async (t) => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/ai/actions/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"text":',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'JSON non valido', code: 'invalid_json' });
    assertSecurityHeaders(response);
  }, t);
});

test('legacy intake parses its larger compatibility envelope only after privileged auth', async (t) => {
  await withServer(async (base) => {
    const unauthenticated = await fetch(`${base}/patient-intake/discharge-letter/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: `{${'x'.repeat(600 * 1024)}`,
    });
    assert.equal(unauthenticated.status, 401);

    const privileged = await fetch(`${base}/patient-intake/discharge-letter/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': 'manager-a',
        'X-Operator-Role': 'manager',
      },
      body: JSON.stringify({ padding: 'x'.repeat(600 * 1024) }),
    });
    assert.equal(privileged.status, 400);
    assertSecurityHeaders(privileged);
  }, t);
});

test('legacy intake rejects payloads above its 8 MiB compatibility limit', async (t) => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/patient-intake/discharge-letter/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': 'manager-a',
        'X-Operator-Role': 'manager',
      },
      body: JSON.stringify({ padding: 'x'.repeat(8 * 1024 * 1024) }),
    });
    assert.equal(response.status, 413);
    assertSecurityHeaders(response);
  }, t);
});
