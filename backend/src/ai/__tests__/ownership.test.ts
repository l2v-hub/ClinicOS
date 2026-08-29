import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { canAccessOwnedResource, createOwnedResourceParamGuard } from '../ownership-policy.js';
import type { Operator } from '../auth.js';

const owner = { id: 'operator-a', role: 'operatore' };

test('owner can access a resource created by the same operator', () => {
  assert.equal(canAccessOwnedResource(owner, 'operator-a'), true);
});

test('ordinary operator cannot access another operator resource or an ownerless legacy resource', () => {
  assert.equal(canAccessOwnedResource(owner, 'operator-b'), false);
  assert.equal(canAccessOwnedResource(owner, null), false);
});

test('admin and manager can access cross-operator and ownerless resources', () => {
  assert.equal(canAccessOwnedResource({ id: 'admin-a', role: 'admin' }, 'operator-b'), true);
  assert.equal(canAccessOwnedResource({ id: 'manager-a', role: 'manager' }, null), true);
});

test('HTTP guard returns the same 404 for foreign and missing resources', async (t) => {
  const app = express();
  app.use((req, _res, next) => {
    (req as typeof req & { operator?: Operator }).operator = {
      id: String(req.header('X-Test-Operator') ?? ''),
      role: String(req.header('X-Test-Role') ?? 'operatore'),
    };
    next();
  });
  const router = express.Router();
  const owners = new Map<string, string | null>([
    ['owned', 'operator-a'],
    ['foreign', 'operator-b'],
    ['legacy', null],
  ]);
  router.param(
    'id',
    createOwnedResourceParamGuard(
      async (id) => (owners.has(id) ? { createdById: owners.get(id) ?? null } : null),
      'Job non trovato',
    ),
  );
  router.get('/:id', (_req, res) => res.status(200).json({ ok: true }));
  app.use('/jobs', router);

  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const request = (id: string, operatorId = 'operator-a', role = 'operatore') =>
    fetch(`http://127.0.0.1:${port}/jobs/${id}`, {
      headers: { 'X-Test-Operator': operatorId, 'X-Test-Role': role },
    });

  assert.equal((await request('owned')).status, 200);
  const foreign = await request('foreign');
  const missing = await request('missing');
  assert.equal(foreign.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(await foreign.json(), await missing.json());
  assert.equal((await request('legacy')).status, 404);
  assert.equal((await request('legacy', 'manager-a', 'manager')).status, 200);
});
