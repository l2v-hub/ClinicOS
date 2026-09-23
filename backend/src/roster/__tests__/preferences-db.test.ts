import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { meRosterOrderRouter, adminRosterOrderRouter } from '../../routes/roster-order.js';
import { readRosterPreference, patchRosterPreference, patchRosterDefault } from '../preferences.js';
import { loadPatientIdentityPage } from '../../patients/identity-page.js';
import {
  actor,
  other,
  caseActor,
  noDepartment,
  missing,
  id,
  seedRoster,
  cleanRoster,
} from './roster-fixture.js';

let server: Server;
let base = '';
before(async () => {
  await seedRoster();
  const app = express();
  app.use(express.json());
  app.use('/me', meRosterOrderRouter);
  app.use('/admin', adminRosterOrderRouter);
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await cleanRoster();
});
const headers = (who = actor, role = who.role) => ({
  'X-Operator-Id': who.id,
  'X-Operator-Role': role,
  'Content-Type': 'application/json',
});

test('exact department contexts, no-department and absent profile remain distinct without implicit profile creation', async () => {
  const [a, b, c, none, absent] = await Promise.all(
    [actor, other, caseActor, noDepartment, missing].map((who) => readRosterPreference(who)),
  );
  assert.equal(a.context!.id, b.context!.id);
  assert.notEqual(a.context!.id, c.context!.id);
  assert.equal(none.context!.label, 'Senza reparto');
  assert.equal(a.revision, '0');
  assert.equal(absent.context, null);
  assert.equal(absent.revision, null);
  assert.equal(absent.canEdit, false);
  assert.equal(absent.temporary, true);
  assert.equal(absent.reason, 'profile_missing');
  assert.equal(await prisma.operator.count({ where: { id: missing.id } }), 0);
});

test('department defaults, independent personal overrides, reset and CAS preserve revisions', async () => {
  const initial = await readRosterPreference(actor);
  const contextId = initial.context!.id;
  await patchRosterDefault(contextId, {
    default: { criterion: 'location', direction: 'asc' },
    expectedVersion: initial.context!.version,
  });
  assert.equal((await readRosterPreference(other)).source, 'department');
  const saves = await Promise.allSettled(
    [1, 2].map(() =>
      patchRosterPreference(actor, {
        contextId,
        override: { criterion: 'name', direction: 'desc' },
        expectedVersion: '0',
      }),
    ),
  );
  assert.equal(saves.filter((row) => row.status === 'fulfilled').length, 1);
  assert.equal(
    (saves.find((row) => row.status === 'rejected') as PromiseRejectedResult).reason.code,
    'roster_preference_conflict',
  );
  assert.equal((await readRosterPreference(other)).override, null);
  const saved = await readRosterPreference(actor);
  assert.equal(saved.revision, '1');
  assert.equal(saved.source, 'personal');
  const reset = await patchRosterPreference(actor, {
    contextId,
    override: null,
    expectedVersion: '1',
  });
  assert.equal(reset.revision, '2');
  assert.equal(reset.override, null);
  assert.equal(reset.source, 'department');
  assert.equal(
    await prisma.operatorRosterPreference.count({ where: { operatorId: actor.id, contextId } }),
    1,
  );
  const defaults = await Promise.allSettled(
    [1, 2].map(() =>
      patchRosterDefault(contextId, {
        default: { criterion: 'location', direction: 'desc' },
        expectedVersion: reset.context!.version,
      }),
    ),
  );
  assert.equal(defaults.filter((row) => row.status === 'fulfilled').length, 1);
  assert.equal(
    (defaults.find((row) => row.status === 'rejected') as PromiseRejectedResult).reason.code,
    'roster_default_conflict',
  );
});

test('department changes invalidate cursor and stale preference context without changing patient scope', async () => {
  const old = await readRosterPreference(actor);
  const first = await loadPatientIdentityPage({ limit: '3' }, actor);
  const count = await prisma.patient.count({ where: { registeredById: actor.id } });
  await prisma.operator.update({ where: { id: actor.id }, data: { department: id('ward') } });
  const current = await readRosterPreference(actor);
  assert.notEqual(current.context!.id, old.context!.id);
  await assert.rejects(
    patchRosterPreference(actor, {
      contextId: old.context!.id,
      override: null,
      expectedVersion: old.revision,
    }),
    { code: 'roster_changed', reason: 'context' },
  );
  await assert.rejects(loadPatientIdentityPage({ cursor: first.nextCursor! }, actor), {
    code: 'roster_changed',
  });
  assert.equal(await prisma.patient.count({ where: { registeredById: actor.id } }), count);
  await prisma.operator.update({ where: { id: actor.id }, data: { department: id('Ward') } });
  assert.equal((await readRosterPreference(actor)).revision, old.revision);
});

test('HTTP personal/admin endpoints enforce roles, bounded envelopes, validation and conflict codes', async () => {
  assert.equal((await fetch(`${base}/me/roster-order`)).status, 401);
  const me = await fetch(`${base}/me/roster-order`, { headers: headers() });
  assert.equal(me.status, 200);
  assert.equal(me.headers.get('cache-control'), 'private, no-store');
  const preference = await me.json();
  const request = (url: string, body: unknown, role = 'operatore') =>
    fetch(`${base}${url}`, {
      method: 'PATCH',
      headers: headers(actor, role),
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await request('/me/roster-order', {
        operatorId: other.id,
        contextId: preference.context.id,
        override: null,
        expectedVersion: preference.revision,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/me/roster-order', {
        contextId: preference.context.id,
        override: { criterion: 'fiscalCode', direction: 'asc' },
        expectedVersion: preference.revision,
      })
    ).status,
    400,
  );
  const conflict = await request('/me/roster-order', {
    contextId: preference.context.id,
    override: null,
    expectedVersion: '0',
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'roster_preference_conflict');
  assert.equal((await fetch(`${base}/admin/roster-contexts`, { headers: headers() })).status, 403);
  const contexts = await fetch(`${base}/admin/roster-contexts?limit=1`, {
    headers: headers(actor, 'manager'),
  });
  const page = await contexts.json();
  assert.equal(page.items.length, 1);
  assert.equal(page.hasMore, true);
  assert.ok(page.nextCursor);
  assert.equal(typeof page.items[0].version, 'string');
  const next = await fetch(`${base}/admin/roster-contexts?limit=1&cursor=${page.nextCursor}`, {
    headers: headers(actor, 'manager'),
  });
  assert.notEqual((await next.json()).items[0].id, page.items[0].id);
  assert.equal(
    (
      await request(`/admin/roster-contexts/${preference.context.id}`, {
        default: null,
        expectedVersion: preference.context.version,
      })
    ).status,
    403,
  );
  const temporary = await loadPatientIdentityPage(
    { sort: 'name', direction: 'asc', limit: '3' },
    missing,
  );
  assert.equal(temporary.roster.source, 'temporary');
  assert.equal(temporary.roster.context, null);
  assert.deepEqual(temporary.items, []);
});
