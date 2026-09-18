import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import express from 'express';
import { prisma } from '../../lib/prisma.js';
import patientsRouter from '../../routes/patients.js';
import { loadPatientIdentityPage } from '../identity-page.js';
import { loadPatientParametersPage } from '../parameters-page.js';
import { encodePatientPageCursor } from '../pagination.js';

const marker = `sortfixture${Date.now()}`;
const collator = new Intl.Collator('it', { sensitivity: 'base' });
const surname = [
  'zanni',
  'ROSSI',
  'Àlba',
  'bianchi',
  'DèLuca',
  'éSposito',
  'Gatti',
  'mori',
  'Nèri',
  'Verdi',
  'rossi',
];
const name = ['anna', 'BRUNO', 'Élia', 'MÀRIA', 'elia', 'e\u0301lia', 'ànna'];
const rows = Array.from({ length: 193 }, (_, index) => ({
  id: `${marker}-${String(index).padStart(3, '0')}`,
  medicalRecordNumber: `${marker}-mrn-${index}`,
  firstName: `${marker} ${name[index % name.length]}`,
  lastName: surname[index % surname.length],
  dateOfBirth: new Date('1970-01-01T00:00:00.000Z'),
  sex: index % 2 ? 'M' : 'F',
}));
const own = rows.slice(0, 167);
const foreign = rows.slice(167);
let operatorId = '';
let foreignOperatorId = '';
let server: Server | undefined;
let base = '';
const oldAuth = process.env.AUTH_MODE;
const oldEnv = process.env.NODE_ENV;

function sortedIds(data: typeof rows): string[] {
  return [...data]
    .sort(
      (a, b) =>
        collator.compare(a.lastName, b.lastName) ||
        collator.compare(a.firstName, b.firstName) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .map((row) => row.id);
}

before(async () => {
  process.env.AUTH_MODE = 'demo';
  process.env.NODE_ENV = 'test';
  const users = await Promise.all(
    ['own', 'foreign'].map((key) =>
      prisma.user.create({
        data: {
          email: `${marker}-${key}@example.test`,
          passwordHash: 'synthetic-test-only',
          fullName: `Synthetic ${key}`,
          operator: { create: { ruolo: 'infermiere' } },
        },
        include: { operator: true },
      }),
    ),
  );
  operatorId = users[0].operator!.id;
  foreignOperatorId = users[1].operator!.id;
  await prisma.patient.createMany({
    data: rows.map((row, index) => ({
      ...row,
      registeredById: index < own.length ? operatorId : foreignOperatorId,
    })),
  });
  const app = express();
  app.use(express.json());
  app.use('/patients', patientsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  await prisma.patient.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
  if (oldAuth === undefined) delete process.env.AUTH_MODE;
  else process.env.AUTH_MODE = oldAuth;
  if (oldEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = oldEnv;
  await prisma.$disconnect();
});

async function traverse(
  parameters: boolean,
  actor = { id: operatorId, role: 'operatore' },
  filters: Record<string, string> = {},
) {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < 30; pageIndex += 1) {
    const query = { ...filters, limit: parameters ? '100' : '50', cursor };
    const page = parameters
      ? await loadPatientParametersPage(query, actor)
      : await loadPatientIdentityPage(query, actor);
    const pageIds = page.items.map((item) => ('patient' in item ? item.patient.id : item.id));
    assert.ok(pageIds.length <= (parameters ? 25 : 50));
    assert.equal(page.hasMore, page.nextCursor !== null);
    ids.push(...pageIds);
    if (!page.hasMore) return ids;
    assert.ok(pageIds.length > 0);
    assert.notEqual(page.nextCursor, cursor);
    cursor = page.nextCursor!;
  }
  assert.fail('Pagination failed to finish within the bounded fixture');
}

test('global alphabetical order across >50 mixed-case/accent rows, with stable duplicate-name ties', async () => {
  const first = await traverse(false);
  assert.equal(first.length, own.length);
  assert.equal(new Set(first).size, own.length);
  assert.deepEqual(first, sortedIds(own));
  assert.deepEqual(await traverse(false), first);
});

test('parameter pages share identity ordering/cursors while respecting their smaller limit', async () => {
  assert.deepEqual(await traverse(true), sortedIds(own));
  const first = await loadPatientIdentityPage(
    { limit: '50' },
    { id: operatorId, role: 'operatore' },
  );
  const continuation = await loadPatientParametersPage(
    { cursor: first.nextCursor!, limit: '25' },
    { id: operatorId, role: 'operatore' },
  );
  assert.deepEqual(
    continuation.items.map((item) => item.patient.id),
    sortedIds(own).slice(50, 75),
  );
});

test('scope, manager access and sex/search predicates apply before sorting and limits', async () => {
  const female = own.filter((row) => row.sex === 'F');
  for (const parameters of [false, true]) {
    assert.deepEqual(
      await traverse(parameters, undefined, { q: marker, sex: 'F' }),
      sortedIds(female),
    );
    assert.deepEqual(
      await traverse(parameters, { id: foreignOperatorId, role: 'operatore' }),
      sortedIds(foreign),
    );
    assert.deepEqual(
      await traverse(parameters, { id: 'synthetic-manager', role: 'manager' }, { q: marker }),
      sortedIds(rows),
    );
  }
});

test('search and cursor values are data, and malformed legacy cursors cannot traverse new ordering', async () => {
  const actor = { id: operatorId, role: 'operatore' };
  for (const q of ['%', '_', "' OR 1=1 --"]) {
    assert.deepEqual((await loadPatientIdentityPage({ q }, actor)).items, []);
    assert.deepEqual((await loadPatientParametersPage({ q }, actor)).items, []);
  }
  const cursor = encodePatientPageCursor(
    {
      lastName: "x'); DELETE FROM Patient; --",
      firstName: 'synthetic',
      id: 'synthetic',
    },
    {},
  );
  await loadPatientIdentityPage({ cursor }, actor);
  assert.equal(await prisma.patient.count({ where: { registeredById: operatorId } }), own.length);
  const legacy = Buffer.from(JSON.stringify({ v: 1, ...own[0] })).toString('base64url');
  await assert.rejects(loadPatientIdentityPage({ cursor: legacy }, actor), /cursor non valido/);
  await assert.rejects(loadPatientParametersPage({ cursor: legacy }, actor), /cursor non valido/);
});

test('HTTP pages expose globally ordered results and keep textual searches behind POST/auth', async () => {
  const headers = { 'X-Operator-Id': operatorId, 'X-Operator-Role': 'operatore' };
  const first = await fetch(`${base}/patients/page`, { headers });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('cache-control'), 'private, no-store');
  const body = (await first.json()) as { items: Array<{ id: string }>; nextCursor: string };
  assert.deepEqual(
    body.items.map((item) => item.id),
    sortedIds(own).slice(0, 50),
  );
  const second = await fetch(`${base}/patients/page?cursor=${body.nextCursor}`, { headers });
  const next = (await second.json()) as { items: Array<{ id: string }> };
  assert.deepEqual(
    next.items.map((item) => item.id),
    sortedIds(own).slice(50, 100),
  );
  const search = await fetch(`${base}/patients/page/search`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: `${marker} rossi`, limit: '100' }),
  });
  assert.equal(search.status, 200);
  const searched = (await search.json()) as { items: Array<{ id: string }> };
  assert.deepEqual(
    searched.items.map((item) => item.id),
    sortedIds(own.filter((row) => row.lastName.toLowerCase() === 'rossi')),
  );
  assert.equal((await fetch(`${base}/patients/page?q=${marker}`, { headers })).status, 400);
  assert.equal((await fetch(`${base}/patients/page`)).status, 401);
});
