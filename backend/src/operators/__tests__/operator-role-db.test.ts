import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { call, login, startApp, type Session } from '../../authz/__tests__/harness-support.js';

let base: string, close: () => Promise<void>, admin: Session, nurse: Session;
const fixtures: Array<{ id: string; ruolo: string | null }> = [];
const cluster = process.env.BUG428_SYNTHETIC_CLUSTER;
const options = { skip: !cluster };
before(async () => {
  if (!cluster) return; // Dedicated isolated harness only, never the concurrent shared CI database.
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1');
  assert.match(cluster.replace(/\\/g, '/'), /\/clinicos-bug428-synthetic\/postgres-[\w-]+$/);
  const location = await prisma.$queryRaw<
    Array<{ directory: string }>
  >`SELECT current_setting('data_directory') AS directory`;
  assert.equal(
    location[0].directory.replace(/\\/g, '/').toLowerCase(),
    resolve(cluster, 'data').replace(/\\/g, '/').toLowerCase(),
  );
  ({ base, close } = await startApp());
  admin = await login(base, 'SIM-ADMIN');
  nurse = await login(base, 'SIM-NURSE-1');
  for (const [index, ruolo] of [
    null,
    '',
    '  OSS ',
    'fisioterapista',
    'custom',
    'medico',
  ].entries()) {
    const id = `SYNTHETIC-428-${index}`;
    await prisma.operator.create({
      data: {
        id,
        ruolo,
        department: 'Reparto sintetico',
        phone: 'test-only',
        qualifica: 'Qualifica sintetica',
        user: {
          create: {
            id: `USER-${id}`,
            fullName: `Nome Sintetico${index}`,
            email: `role428-${index}@example.test`,
            passwordHash: 'synthetic-not-login',
            role: index % 2 ? 'MANAGER' : 'OPERATOR',
          },
        },
      },
    });
    fixtures.push({ id, ruolo });
  }
});
after(async () => {
  if (!cluster) return;
  await close();
  await prisma.$disconnect();
});

test(
  '428 real API admin and minimum directory preserve missing/legacy role without GET writes',
  options,
  async () => {
    const snapshot = await prisma.operator.findMany({
      where: { id: { in: fixtures.map((f) => f.id) } },
      include: { user: true },
      orderBy: { id: 'asc' },
    });
    for (const path of [
      '/operators',
      '/operators/page',
      '/operators/directory',
      '/operators/directory/page',
    ]) {
      const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      const body = await response.json();
      const rows = Array.isArray(body) ? body : body.items;
      for (const fixture of fixtures) {
        const row = rows.find((r: { id: string }) => r.id === fixture.id);
        assert.ok(row);
        assert.equal(row.ruolo, fixture.ruolo ?? '');
        assert.equal(row.qualifica, 'Qualifica sintetica');
        if (path.includes('/directory')) {
          assert.equal(row.email, '');
          assert.equal(row.telefono, '');
          assert.equal(row.pazientiAssegnati, 0);
        }
        assert.equal('role' in row, false);
        assert.equal('permissions' in row, false);
      }
    }
    assert.deepEqual(
      await prisma.operator.findMany({
        where: { id: { in: fixtures.map((f) => f.id) } },
        include: { user: true },
        orderBy: { id: 'asc' },
      }),
      snapshot,
    );
  },
);

test(
  '428 unrelated real PUT and fresh GET preserve exact DB role and authorization assignments',
  options,
  async () => {
    const policyBefore = await prisma.authzPolicyVersion.findMany({ orderBy: { version: 'asc' } });
    const actorBefore = await call(base, admin, 'GET', '/auth/me');
    for (const fixture of fixtures) {
      const before = await prisma.operator.findUniqueOrThrow({
        where: { id: fixture.id },
        include: { user: true },
      });
      const update = await call(base, admin, 'PUT', `/operators/${fixture.id}`, {
        reparto: 'Reparto aggiornato sintetico',
      });
      assert.equal(update.status, 200);
      const after = await prisma.operator.findUniqueOrThrow({
        where: { id: fixture.id },
        include: { user: true },
      });
      assert.equal(after.department, 'Reparto aggiornato sintetico');
      assert.equal(after.ruolo, before.ruolo);
      assert.deepEqual(after.user, before.user);
      const fresh = await call(base, admin, 'GET', '/operators');
      assert.equal(
        fresh.body.find((row: { id: string }) => row.id === fixture.id).ruolo,
        fixture.ruolo ?? '',
      );
    }
    assert.deepEqual(
      await prisma.authzPolicyVersion.findMany({ orderBy: { version: 'asc' } }),
      policyBefore,
    );
    assert.deepEqual(await call(base, admin, 'GET', '/auth/me'), actorBefore);
  },
);

test(
  '428 explicit professional change never promotes the User role or active authorization policy',
  options,
  async () => {
    const target = fixtures[0];
    const userBefore = await prisma.user.findUniqueOrThrow({ where: { id: `USER-${target.id}` } });
    const policyBefore = await prisma.authzPolicyVersion.findMany({ orderBy: { version: 'asc' } });
    const response = await call(base, admin, 'PUT', `/operators/${target.id}`, {
      ruolo: 'infermiere',
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.ruolo, 'infermiere');
    assert.equal(
      (await prisma.operator.findUniqueOrThrow({ where: { id: target.id } })).ruolo,
      'infermiere',
    );
    assert.deepEqual(
      await prisma.user.findUniqueOrThrow({ where: { id: `USER-${target.id}` } }),
      userBefore,
    );
    assert.deepEqual(
      await prisma.authzPolicyVersion.findMany({ orderBy: { version: 'asc' } }),
      policyBefore,
    );
  },
);

test(
  '428 outer policy denials preserve accepted baseline behavior and never mutate profiles',
  options,
  async () => {
    // The existing outer capability gate precedes operatorsRouter's cache middleware.
    // Bind that baseline gap explicitly; do not imply this presentation fix repairs it.
    for (const path of [
      'backend/src/app.ts',
      'backend/src/authz/route-gate.ts',
      'backend/src/ai/auth.ts',
    ]) {
      const baseline = execFileSync(
        'git',
        ['show', `7680ec0b25c61de5745f296d91e370b575de9c00:${path}`],
        { encoding: 'utf8' },
      );
      assert.equal(
        readFileSync(
          new URL(`../../${path.slice('backend/src/'.length)}`, import.meta.url),
          'utf8',
        ).replace(/\r\n/g, '\n'),
        baseline.replace(/\r\n/g, '\n'),
      );
    }
    const snapshot = await prisma.operator.findUniqueOrThrow({
      where: { id: fixtures[0].id },
      include: { user: true },
    });
    for (const [actor, method, path, status] of [
      [nurse, 'GET', '/operators', 403],
      [nurse, 'PUT', `/operators/${fixtures[0].id}`, 403],
      [null, 'GET', '/operators', 401],
    ] as const) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
        },
        ...(method === 'PUT' ? { body: JSON.stringify({ ruolo: 'medico' }) } : {}),
      });
      assert.equal(response.status, status);
      assert.equal(
        response.headers.get('cache-control'),
        null,
        'unchanged outer-gate baseline gap, not a no-store pass',
      );
    }
    assert.equal((await call(base, nurse, 'GET', '/operators/directory')).status, 200);
    assert.deepEqual(
      await prisma.operator.findUniqueOrThrow({
        where: { id: fixtures[0].id },
        include: { user: true },
      }),
      snapshot,
    );
  },
);
