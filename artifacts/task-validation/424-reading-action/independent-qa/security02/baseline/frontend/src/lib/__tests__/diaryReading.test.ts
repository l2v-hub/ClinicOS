import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isDiaryReadReceipt, parseDiaryUnreadCount, postDiaryRead } from '../diaryReading';
import { DiaryThreadReceipt } from '../../components/operator/cartella/DiaryThreadReceipt';
import Sidebar from '../../components/shared/TeamsLikeSidebar';
Object.assign(globalThis, { React });
const unread = { state: 'unread' as const, readBy: null, isAuthor: false, canAcknowledge: true };
const read = {
  state: 'read' as const,
  readBy: {
    operatorName: 'Lettore Sintetico',
    operatorRole: 'oss',
    acknowledgedAt: '2026-10-05T08:00:00Z',
    byMe: true,
  },
  isAuthor: false,
  canAcknowledge: false,
};
test('all priorities support explicit Letto, opening cannot confirm; author waits for a colleague', () => {
  for (const priority of ['normale', 'importante', 'urgente']) {
    const html = renderToStaticMarkup(
      React.createElement(DiaryThreadReceipt, {
        priority,
        readReceipt: unread,
        busy: false,
        disabled: false,
        subject: 'nota sintetica',
        onAcknowledge() {},
      }),
    );
    assert.match(html, /Nessuno ha ancora confermato la lettura/);
    assert.match(html, /Aprire la nota non la segna come letta/);
    assert.match(html, />Letto</);
  }
  const html = renderToStaticMarkup(
    React.createElement(DiaryThreadReceipt, {
      priority: 'normale',
      readReceipt: { ...unread, isAuthor: true, canAcknowledge: false },
      busy: false,
      disabled: false,
      subject: 'nota',
      onAcknowledge() {},
    }),
  );
  assert.match(html, /un altro operatore/);
  assert.doesNotMatch(html, /<button/);
});
test('confirmed reading displays identity, role and full facility date; no action remains', () => {
  const html = renderToStaticMarkup(
    React.createElement(DiaryThreadReceipt, {
      priority: 'normale',
      readReceipt: read,
      busy: false,
      disabled: false,
      subject: 'nota',
      onAcknowledge() {},
    }),
  );
  assert.match(html, /Letta da Lettore Sintetico \(OSS\)/);
  assert.match(html, /05\/10\/2026 10:00/);
  assert.doesNotMatch(html, /<button/);
});
test('unknown or malformed receipts and counts never manufacture an unread number or confirmation', () => {
  assert.ok(isDiaryReadReceipt(unread));
  assert.ok(isDiaryReadReceipt(read));
  for (const value of [
    null,
    {},
    { ...read, readBy: null },
    { ...read, readBy: { operatorName: 'Fake' } },
    { ...unread, isAuthor: true },
    { ...unread, readBy: read.readBy },
  ])
    assert.equal(isDiaryReadReceipt(value), false);
  assert.equal(parseDiaryUnreadCount({ unreadCount: 103 }), 103);
  assert.equal(parseDiaryUnreadCount({ unreadCount: 0 }), 0);
  for (const value of [{}, { unreadCount: -1 }, { unreadCount: '5' }, { unreadCount: 1.5 }])
    assert.throws(() => parseDiaryUnreadCount(value));
  const html = renderToStaticMarkup(
    React.createElement(Sidebar, {
      activeKey: 'consegne',
      utente: {
        id: 'reader',
        nome: 'Sintetico',
        ruolo: 'operatore',
        iniziali: 'S',
        reparto: 'Test',
      },
      onNavigate() {},
      unreadDiaryNotes: null,
    }),
  );
  assert.match(html, /conteggio delle note da leggere non disponibile/);
  assert.doesNotMatch(html, /teams-sidebar__badge/);
});
test('explicit POST requests reading and validates durable receipt before any client update', async () => {
  let posted = false;
  const fetcher = (async (_url: unknown, request?: RequestInit) => {
    assert.equal(request?.method, 'POST');
    assert.deepEqual(JSON.parse(request?.body as string), { purpose: 'read' });
    posted = true;
    return new Response(
      JSON.stringify({
        readReceipt: read,
        urgency: { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false },
      }),
      { status: 201 },
    );
  }) as typeof fetch;
  assert.deepEqual((await postDiaryRead('/synthetic/ack', {}, fetcher)).readReceipt, read);
  assert.ok(posted);
  await assert.rejects(
    postDiaryRead('/synthetic/ack', {}, (async () => new Response('{}')) as typeof fetch),
    /non ha confermato/,
  );
  await assert.rejects(
    postDiaryRead(
      '/synthetic/ack',
      {},
      (async () => new Response('{}', { status: 503 })) as typeof fetch,
    ),
    /non registrata/,
  );
});
