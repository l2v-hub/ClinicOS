import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import patientsRouter from '../../routes/patients.js';
import { loadPatientIdentityPage } from '../identity-page.js';
import { parsePatientRoomFilter } from '../room-filter.js';
import {
  actor,
  other,
  rows,
  id,
  today,
  seedRoster,
  cleanRoster,
  expectedIds,
} from '../../roster/__tests__/roster-fixture.js';

let server: Server;
let base = '';
const headers = {
  'X-Operator-Id': actor.id,
  'X-Operator-Role': actor.role,
  'Content-Type': 'application/json',
};
before(async () => {
  await seedRoster();
  const app = express();
  app.use(express.json());
  app.use('/patients', patientsRouter);
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

for (const sort of ['name', 'location'] as const)
  for (const direction of ['asc', 'desc'] as const)
    test(`room filter precedes limit for all pages under ${sort}/${direction}`, async () => {
      const ids: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await loadPatientIdentityPage(
          { room: ' 1A ', sort, direction, limit: '3', cursor },
          actor,
        );
        ids.push(...page.items.map((row) => row.id));
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      const matches = new Set(
        rows.filter((row) => row.room?.toLowerCase().includes('1a')).map((row) => row.id),
      );
      assert.deepEqual(
        ids,
        expectedIds(sort, direction).filter((key) => matches.has(key)),
      );
      assert.ok(ids.length > 3);
      assert.equal(new Set(ids).size, ids.length);
    });

test('room and POST name search intersect; ownership applies before either filter', async () => {
  await prisma.cartella.create({
    data: { patientId: id('foreign'), data: { cameraNumero: id('1A') } },
  });
  const expected = rows.filter(
    (row) => row.room?.toLowerCase().includes('1a') && row.lastName === 'ROSSI',
  );
  const result = await fetch(`${base}/patients/page/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: '1a', q: 'rossi', limit: '100' }),
  });
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.items.length, expected.length);
  assert.ok(body.items.every((row: { id: string }) => expected.some((item) => item.id === row.id)));
  assert.equal(body.roster.asOf, today);
  const own = await loadPatientIdentityPage({ room: '1a', limit: '100' }, actor);
  assert.equal(
    own.items.some((row) => row.id === id('foreign')),
    false,
  );
  const otherPage = await loadPatientIdentityPage({ room: '1a' }, other);
  assert.deepEqual(
    otherPage.items.map((row) => row.id),
    [id('foreign')],
  );
  const all = await loadPatientIdentityPage(
    { room: '1a', limit: '100' },
    { ...actor, role: 'manager' },
  );
  assert.equal(all.items.length, own.items.length + 1);
});

test('room is literal, normalized, camera-only and respects historical legacy rules', async () => {
  await prisma.room.update({ where: { id: id('room-1A') }, data: { numero: 'Étage%_\\42' } });
  const expected = rows
    .filter((_, index) => index % 8 === 0)
    .map((row) => row.id)
    .sort();
  for (const room of [' ÉTAGE ', 'etage', '%_\\']) {
    const page = await loadPatientIdentityPage({ room, limit: '100' }, actor);
    assert.deepEqual(page.items.map((row) => row.id).sort(), expected);
  }
  await prisma.cartella.update({
    where: { patientId: rows[6].id },
    data: { data: { cameraNumero: null, lettoNumero: 'BED-ONLY-NEEDLE' } },
  });
  await prisma.cartella.update({
    where: { patientId: rows[7].id },
    data: { data: { cameraNumero: 'LEGACY-ROOM-NEEDLE' } },
  });
  assert.deepEqual((await loadPatientIdentityPage({ room: 'BED-ONLY-NEEDLE' }, actor)).items, []);
  assert.deepEqual(
    (await loadPatientIdentityPage({ room: 'LEGACY-ROOM-NEEDLE' }, actor)).items.map(
      (row) => row.id,
    ),
    [rows[7].id],
  );
  assert.deepEqual(
    (await loadPatientIdentityPage({ room: 'LEGACY-ROOM-NEEDLE', asOf: '2001-01-01' }, actor))
      .items,
    [],
  );
  for (const room of ["' OR 1=1 --", 'does-not-exist'])
    assert.deepEqual((await loadPatientIdentityPage({ room }, actor)).items, []);
});

test('cursor binds normalized room and epoch; malformed room cannot become a silent broad query', async () => {
  const first = await loadPatientIdentityPage({ room: ' 2A ', limit: '3' }, actor);
  assert.ok(first.nextCursor);
  const second = await loadPatientIdentityPage(
    { room: '2a', cursor: first.nextCursor!, limit: '3' },
    actor,
  );
  assert.equal(second.items.length, 3);
  await assert.rejects(loadPatientIdentityPage({ room: '2B', cursor: first.nextCursor! }, actor), {
    code: 'roster_changed',
  });
  await prisma.room.update({ where: { id: id('room-2A') }, data: { numero: 'changed-room' } });
  await assert.rejects(loadPatientIdentityPage({ room: '2a', cursor: first.nextCursor! }, actor), {
    code: 'roster_changed',
  });
  assert.equal(parsePatientRoomFilter('  '), undefined);
  assert.equal(parsePatientRoomFilter('x'.repeat(80)), 'x'.repeat(80));
  for (const room of [null, [], ['1A'], {}, 1, 'x'.repeat(81)])
    await assert.rejects(loadPatientIdentityPage({ room }, actor), /room non valido/);
  const bad = await fetch(`${base}/patients/page?room=1&room=2`, { headers });
  assert.equal(bad.status, 400);
});
