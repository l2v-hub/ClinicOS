import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { isDiaryReadReceipt, parseDiaryUnreadCount, postDiaryRead } from '../diaryReading';
import * as DiaryReceipt from '../../components/operator/cartella/DiaryThreadReceipt';
import Sidebar from '../../components/shared/TeamsLikeSidebar';
Object.assign(globalThis, { React });
const { DiaryReadingGuide, DiaryThreadReceipt } = DiaryReceipt;
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
test('all priorities describe the explicit reading action; author waits for a colleague', () => {
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
    assert.match(html, /Lettura non confermata/);
    assert.match(html, /aria-label="Conferma lettura: nota sintetica"/);
    assert.match(html, />Conferma lettura</);
    assert.doesNotMatch(html, /Aprire la nota|intervento clinico/);
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
  assert.match(html, /Lettura confermata da Lettore Sintetico \(OSS\)/);
  assert.match(html, /05\/10\/2026 10:00/);
  assert.match(html, /dateTime="2026-10-05T08:00:00Z"/i);
  assert.doesNotMatch(html, /esplicitamente|intervento clinico/);
  assert.doesNotMatch(html, /<button/);
});

test('busy and unavailable capability disable the existing reading action without changing its purpose', () => {
  for (const [busy, disabled] of [[true, false], [false, true]]) {
    const html = renderToStaticMarkup(React.createElement(DiaryThreadReceipt, {
      priority: 'urgente', readReceipt: unread, busy, disabled, subject: 'nota', onAcknowledge() {},
    }));
    assert.match(html, /aria-label="Conferma lettura: nota" disabled=""/);
    assert.match(html, busy ? />Registrazione…</ : />Conferma lettura</);
    assert.doesNotMatch(html, /Ho capito|completata/);
  }
});

test('server reader and subject are escaped and never render hostile markup', () => {
  const hostile = '<img src=x onerror=alert(1)>';
  const props = {priority:'normale',busy:false,disabled:false,subject:hostile,onAcknowledge() {}};
  const confirmed = renderToStaticMarkup(React.createElement(DiaryThreadReceipt, {
    ...props,readReceipt:{...read,readBy:{...read.readBy,operatorName:hostile}},
  }));
  assert.match(confirmed, /Lettura confermata da &lt;img/);
  assert.doesNotMatch(confirmed, /<img/);
  const action = renderToStaticMarkup(React.createElement(DiaryThreadReceipt,{...props,readReceipt:unread}));
  assert.match(action, /Conferma lettura: &lt;img/);
  assert.doesNotMatch(action, /<img/);
});

test('collapsed contextual guide is shared once per diary or unread list, never in each receipt', () => {
  const html = renderToStaticMarkup(React.createElement(DiaryReadingGuide));
  assert.match(html, /<details class="diary-reading-guide"><summary>/);
  assert.doesNotMatch(html, / open/);
  assert.match(html, /Aprire la nota non conferma la lettura/);
  assert.match(html, /non prende in carico/);
  assert.match(html, /non dichiara completato/);
  for (const name of ['DiarioPazienteTab.tsx','../ConsegneUnreadQueue.tsx']) {
    const source=readFileSync(new URL('../../components/operator/cartella/'+name,import.meta.url),'utf8');
    assert.equal((source.match(/<DiaryReadingGuide\s*\/>/g)||[]).length,1);
  }
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
