import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { resolve } from 'node:path';
import express from 'express';
import { startPo05Postgres } from '../fixtures/po05-postgres.mjs';
import {
  fixtureActors,
  selectLocalParameterDatabase,
  closeParameterPrisma,
} from '../fixtures/parameter-database.mjs';
import { seedPo07Roster } from '../fixtures/po07-roster.mjs';

let database: any, prisma: any, server: any, base: string, today: string;
const actorHeaders = (actor = fixtureActors.operator) => ({
  'X-Operator-Id': actor.id,
  'X-Operator-Role': actor.role,
  'Content-Type': 'application/json',
});
async function request(
  path: string,
  body?: unknown,
  actor = fixtureActors.operator,
  method = body === undefined ? 'GET' : 'PATCH',
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: actorHeaders(actor),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.headers.get('cache-control'), 'private, no-store', path);
  return { status: response.status, body: await response.json() };
}
async function get(path: string, actor = fixtureActors.operator) {
  const result = await request(path, undefined, actor);
  assert.equal(result.status, 200, JSON.stringify(result));
  return result.body;
}
async function pages(path: string, query: Record<string, string>, actor = fixtureActors.operator) {
  const output: any[] = [];
  let cursor: string | null = null;
  let count = 0;
  do {
    const page = await get(
      `${path}?${new URLSearchParams({ ...query, ...(cursor ? { cursor } : {}) })}`,
      actor,
    );
    output.push(page);
    cursor = (page.pageInfo ?? page).nextCursor;
    assert.equal(Boolean(cursor), (page.pageInfo ?? page).hasMore);
    assert.ok(++count < 100, 'Paging must terminate');
  } while (cursor);
  return output;
}
const folded = (text: string) =>
  text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const natural = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
function compareRows(a: any, b: any, sort: string, direction: string) {
  const sign = direction === 'asc' ? 1 : -1;
  if (sort === 'location') {
    for (const key of ['room', 'bed']) {
      const x = a.location[key],
        y = b.location[key];
      if (x === null && y !== null) return 1;
      if (x !== null && y === null) return -1;
      if (x !== null && y !== null) {
        const order = natural.compare(x, y);
        if (order) return sign * order;
      }
    }
  }
  return (
    (cmp(folded(a.lastName), folded(b.lastName)) || cmp(folded(a.firstName), folded(b.firstName))) *
      (sort === 'name' ? sign : 1) || cmp(a.id, b.id)
  );
}
before(async () => {
  database = await startPo05Postgres({
    artifactRoot: resolve('artifacts/task-validation/po-07-ordine-reparto/scratch'),
  });
  selectLocalParameterDatabase(database.url);
  ({ prisma } = await import('../../backend/src/lib/prisma.js'));
  today = (await import('../../backend/src/patients/parameter-reading-input.js')).facilityToday();
  await seedPo07Roster(prisma, database.db, today);
  const [{ default: patients }, { default: therapy }, roster] = await Promise.all([
    import('../../backend/src/routes/patients.js'),
    import('../../backend/src/routes/therapy.js'),
    import('../../backend/src/routes/roster-order.js'),
  ]);
  const app = express();
  app.use(express.json());
  app.use('/patients', patients);
  app.use('/therapy-slots', therapy);
  app.use('/me', roster.meRosterOrderRouter);
  app.use('/admin', roster.adminRosterOrderRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((ok) => server.once('listening', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise((ok) => server.close(ok));
  if (prisma) await closeParameterPrisma(prisma);
  await database?.close();
});

test('72 authorized patients are globally ordered before pagination in all four orders', async () => {
  for (const sort of ['name', 'location'])
    for (const direction of ['asc', 'desc']) {
      const result = await pages('/patients/page', { limit: '7', sort, direction, asOf: today });
      const rows = result.flatMap((page) => page.items);
      assert.equal(rows.length, 72);
      assert.equal(new Set(rows.map((row) => row.id)).size, 72);
      assert.deepEqual(
        rows.map((row) => row.id),
        [...rows].sort((a, b) => compareRows(a, b, sort, direction)).map((row) => row.id),
      );
      assert.ok(!rows.some((row) => row.id === 'vitals-qa-other'));
      for (const page of result) {
        assert.deepEqual(page.roster.order, { criterion: sort, direction });
        assert.equal(page.roster.asOf, today);
      }
      if (sort === 'location') assert.equal(rows.at(-1).location.room, null);
    }
});

test('identity bootstrap and detailed parameter pages have exactly the same patient order and date', async () => {
  for (const date of [today, '2020-01-01']) {
    const [identity, detailed] = await Promise.all([
      pages('/patients/page', { limit: '11', sort: 'location', direction: 'asc', asOf: date }),
      pages('/patients/parameters/page', {
        limit: '11',
        sort: 'location',
        direction: 'asc',
        date,
        view: 'entry',
      }),
    ]);
    assert.deepEqual(
      identity.flatMap((page) => page.items.map((row: any) => row.id)),
      detailed.flatMap((page) => page.items.map((row: any) => row.patient.id)),
    );
    assert.ok(detailed.every((page) => page.roster.asOf === date));
  }
});

test('therapy pages split groups safely without losing or duplicating scheduled therapies', async () => {
  const identity = (
    await pages('/patients/page', { limit: '20', sort: 'location', direction: 'asc' })
  ).flatMap((page) => page.items);
  const expectedTherapies = await prisma.patientTherapy.findMany({
    where: { patient: { registeredById: fixtureActors.operator.id } },
    select: { id: true, patientId: true },
  });
  const result = await pages('/therapy-slots/page', {
    limit: '7',
    date: today,
    sort: 'location',
    direction: 'asc',
  });
  const rows = result.flatMap((page) =>
    page.slots.flatMap((slot: any) =>
      slot.patients.flatMap((patient: any) =>
        patient.administrations.map((item: any) => ({
          id: item.therapyId,
          patientId: patient.patientId,
        })),
      ),
    ),
  );
  assert.equal(rows.length, expectedTherapies.length);
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  const rank = new Map(identity.map((row: any, index: number) => [row.id, index]));
  const expected = [...expectedTherapies].sort(
    (a: any, b: any) => rank.get(a.patientId)! - rank.get(b.patientId)! || cmp(a.id, b.id),
  );
  assert.deepEqual(rows, expected);
  assert.equal(
    result[0].slots.find((slot: any) => slot.fascia === 'mattina').summary.total,
    expectedTherapies.length,
  );
});

test('personal and department preferences persist independently and reject stale concurrent writes', async () => {
  const initial = await get('/me/roster-order');
  assert.equal(initial.revision, '0');
  const contextId = initial.context.id;
  const edited = await request('/me/roster-order', {
    contextId,
    override: { criterion: 'location', direction: 'desc' },
    expectedVersion: initial.revision,
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.source, 'personal');
  assert.equal((await get('/me/roster-order', fixtureActors.outsider)).source, 'system');
  assert.equal(
    (
      await request('/me/roster-order', {
        contextId,
        override: null,
        expectedVersion: initial.revision,
      })
    ).status,
    409,
  );
  const admin = await get('/admin/roster-contexts', fixtureActors.manager);
  const context = admin.items.find((row: any) => row.id === contextId);
  assert.equal(
    (
      await request(
        `/admin/roster-contexts/${contextId}`,
        { default: { criterion: 'location', direction: 'asc' }, expectedVersion: context.version },
        fixtureActors.manager,
      )
    ).status,
    200,
  );
  assert.equal((await get('/me/roster-order')).effective.direction, 'desc');
  assert.equal((await get('/me/roster-order', fixtureActors.outsider)).source, 'department');
  const reset = await request('/me/roster-order', {
    contextId,
    override: null,
    expectedVersion: edited.body.revision,
  });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.source, 'department');
  assert.notEqual(reset.body.revision, '0');
  assert.equal((await request('/admin/roster-contexts')).status, 403);
});

test('context default and patient changes fence existing cursors; scope and dates cannot reuse them', async () => {
  const first = await get('/patients/page?limit=7');
  const continuation = `/patients/page?limit=7&cursor=${encodeURIComponent(first.nextCursor)}`;
  assert.equal((await request(continuation, undefined, fixtureActors.outsider)).status, 409);
  assert.equal((await request(`${continuation}&asOf=2020-01-01`)).status, 409);
  await prisma.patient.update({
    where: { id: 'po07-patient-001' },
    data: { lastName: 'Nome aggiornato' },
  });
  const changed = await request(continuation);
  assert.equal(changed.status, 409);
  assert.equal(changed.body.code, 'roster_changed');
  const current = await get('/me/roster-order');
  await prisma.operator.update({
    where: { id: fixtureActors.operator.id },
    data: { department: 'Reparto sintetico B' },
  });
  const stale = await request('/me/roster-order', {
    contextId: current.context.id,
    override: null,
    expectedVersion: current.revision,
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.reason, 'context');
  assert.equal(
    (await get('/patients/page?limit=100')).items.length,
    72,
    'Department never filters or expands patient ownership',
  );
});

test('missing profile has explicit temporary order and no implicit operator creation', async () => {
  const actor = { id: 'PO07-MISSING', role: 'operatore' };
  const preference = await get('/me/roster-order', actor);
  assert.equal(preference.canEdit, false);
  assert.equal(preference.temporary, true);
  assert.equal(preference.reason, 'profile_missing');
  assert.equal(preference.context, null);
  assert.equal(await prisma.operator.findUnique({ where: { id: actor.id } }), null);
});
