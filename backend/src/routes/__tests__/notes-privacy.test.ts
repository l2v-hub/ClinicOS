import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import noteRouter from '../note.js';

let server: Server;
let base = '';
const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const actorA = `notes-a-${run}`;
const actorB = `notes-b-${run}`;
const actorC = `notes-c-${run}`;
const headers = (id: string) => ({ 'X-Operator-Id': id, 'X-Operator-Role': 'operatore' });

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/notes', noteRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
      resolve();
    });
  });
  await prisma.nota.createMany({
    data: [
      {
        id: `note-ab-${run}`,
        autoreId: actorA,
        autoreNome: 'A',
        destinatarioId: actorB,
        destinatarioNome: 'B',
        messaggio: 'solo b',
      },
      {
        id: `note-ac-${run}`,
        autoreId: actorA,
        autoreNome: 'A',
        destinatarioId: actorC,
        destinatarioNome: 'C',
        messaggio: 'solo c',
      },
      {
        id: `note-ca-${run}`,
        autoreId: actorC,
        autoreNome: 'C',
        destinatarioId: actorA,
        destinatarioNome: 'A',
        messaggio: 'solo a',
      },
      {
        id: `note-all-${run}`,
        autoreId: actorA,
        autoreNome: 'A',
        destinatarioId: 'tutti',
        destinatarioNome: 'Tutti gli operatori',
        messaggio: 'broadcast',
      },
    ],
  });
});

after(async () => {
  await prisma.nota.deleteMany({
    where: { OR: [{ autoreId: { in: [actorA, actorB, actorC] } }, { id: { contains: run } }] },
  });
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('notes mailbox is authenticated, no-store, bounded and private per operator', async () => {
  const unauthenticated = await fetch(`${base}/notes`);
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get('cache-control') ?? '', /private, no-store/);

  const response = await fetch(`${base}/notes?box=all&limit=50`, { headers: headers(actorB) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
  const page = (await response.json()) as {
    items: Array<{ id: string }>;
    pageInfo: { hasMore: boolean; nextCursor: string | null };
    summary: { unread: number };
  };
  assert.deepEqual(
    page.items.map((item) => item.id).sort(),
    [`note-ab-${run}`, `note-all-${run}`].sort(),
  );
  assert.equal(page.pageInfo.hasMore, false);
  assert.equal(page.summary.unread, 2);
});

test('notes keyset pagination, exact summary, indexed search and malformed queries', async () => {
  await prisma.nota.createMany({
    data: Array.from({ length: 55 }, (_, index) => ({
      id: `note-page-${index}-${run}`,
      autoreId: actorA,
      autoreNome: 'A',
      destinatarioId: actorB,
      destinatarioNome: 'B',
      messaggio: `mailbox pagination ${index}`,
      createdAt: new Date(Date.now() + index * 1000),
    })),
  });
  const firstResponse = await fetch(`${base}/notes?box=received&limit=20`, {
    headers: headers(actorB),
  });
  assert.equal(firstResponse.status, 200);
  const first = (await firstResponse.json()) as {
    items: Array<{ id: string }>;
    pageInfo: { hasMore: boolean; nextCursor: string | null };
    summary: { unread: number };
  };
  assert.equal(first.items.length, 20);
  assert.equal(first.pageInfo.hasMore, true);
  assert.ok(first.pageInfo.nextCursor);
  assert.equal(first.summary.unread, 57);

  const secondResponse = await fetch(
    `${base}/notes?box=received&limit=20&cursor=${encodeURIComponent(first.pageInfo.nextCursor!)}`,
    { headers: headers(actorB) },
  );
  assert.equal(secondResponse.status, 200);
  const second = (await secondResponse.json()) as { items: Array<{ id: string }> };
  assert.equal(second.items.length, 20);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 40);

  const searchResponse = await fetch(`${base}/notes?box=received&q=pagination%2054`, {
    headers: headers(actorB),
  });
  assert.equal(searchResponse.status, 200);
  const search = (await searchResponse.json()) as { items: Array<{ id: string }> };
  assert.deepEqual(
    search.items.map((item) => item.id),
    [`note-page-54-${run}`],
  );

  for (const query of [
    '?box=private',
    '?limit=51',
    '?limit=10foo',
    `?q=${'x'.repeat(101)}`,
    '?q=---',
    '?cursor=not%2Bbase64',
  ]) {
    const invalid = await fetch(`${base}/notes${query}`, { headers: headers(actorB) });
    assert.equal(invalid.status, 400, query);
  }
});

test('a second operator cannot enumerate or mutate a foreign note; actor spoof is ignored', async () => {
  const foreignId = `note-ac-${run}`;
  for (const request of [
    fetch(`${base}/notes/${foreignId}`, {
      method: 'PUT',
      headers: { ...headers(actorB), 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'letta' }),
    }),
    fetch(`${base}/notes/${foreignId}`, { method: 'DELETE', headers: headers(actorB) }),
  ]) {
    const response = await request;
    assert.equal(response.status, 404);
  }

  const recipientStatus = await fetch(`${base}/notes/note-ab-${run}`, {
    method: 'PUT',
    headers: { ...headers(actorB), 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'letta' }),
  });
  assert.equal(recipientStatus.status, 200);
  const broadcastStatus = await fetch(`${base}/notes/note-all-${run}`, {
    method: 'PUT',
    headers: { ...headers(actorB), 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'letta' }),
  });
  assert.equal(broadcastStatus.status, 200);
  const [mailboxB, mailboxC, storedBroadcast] = await Promise.all([
    fetch(`${base}/notes?box=all&limit=1`, { headers: headers(actorB) }).then(
      (response) => response.json() as Promise<{ summary: { unread: number } }>,
    ),
    fetch(`${base}/notes?box=all&limit=50`, { headers: headers(actorC) }).then(
      (response) =>
        response.json() as Promise<{
          items: Array<{ id: string; stato: string }>;
          summary: { unread: number };
        }>,
    ),
    prisma.nota.findUnique({ where: { id: `note-all-${run}` }, select: { stato: true } }),
  ]);
  assert.equal(mailboxB.summary.unread, 55);
  assert.equal(mailboxC.summary.unread, 2);
  assert.equal(mailboxC.items.find((item) => item.id === `note-all-${run}`)?.stato, 'non_letta');
  assert.equal(storedBroadcast?.stato, 'non_letta');
  assert.equal(
    await prisma.notaRecipientState.count({
      where: { notaId: `note-all-${run}`, operatorId: actorB, stato: 'letta' },
    }),
    1,
  );
  const recipientContent = await fetch(`${base}/notes/note-ab-${run}`, {
    method: 'PUT',
    headers: { ...headers(actorB), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaggio: 'tentativo destinatario' }),
  });
  assert.equal(recipientContent.status, 404);
  const authorContent = await fetch(`${base}/notes/note-ab-${run}`, {
    method: 'PUT',
    headers: { ...headers(actorA), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaggio: 'modifica autore' }),
  });
  assert.equal(authorContent.status, 200);
  const managerContent = await fetch(`${base}/notes/note-ac-${run}`, {
    method: 'PUT',
    headers: {
      'X-Operator-Id': `manager-${run}`,
      'X-Operator-Role': 'manager',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priorita: 'urgente' }),
  });
  assert.equal(managerContent.status, 200);
  const managerDelete = await fetch(`${base}/notes/note-ca-${run}`, {
    method: 'DELETE',
    headers: { 'X-Operator-Id': `manager-${run}`, 'X-Operator-Role': 'manager' },
  });
  assert.equal(managerDelete.status, 204);

  const createdResponse = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { ...headers(actorB), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      autoreId: actorA,
      autoreNome: 'Falso autore',
      destinatarioId: 'tutti',
      messaggio: 'identità server',
      stato: 'risolta',
    }),
  });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()) as {
    autoreId: string;
    autoreNome: string;
    stato: string;
  };
  assert.equal(created.autoreId, actorB);
  assert.equal(created.autoreNome, actorB);
  assert.equal(created.stato, 'non_letta');
});
