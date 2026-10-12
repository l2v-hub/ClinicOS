// #446 QA: un solo gesto corretto per voce, errori che non nascondono la lista, avvisi che restano
// anche senza voci visibili, stati vuoti solo con le fonti arrivate.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UnreadDiaryEntry } from '../../../lib/diaryUnreadQueue';
import type { GiroParametri } from '../../../lib/useGiroParametri';
import { TurnoDaLeggere, UnreadAction, type UnreadQueue } from '../TurnoDaLeggere';
import { TurnoUrgenti } from '../TurnoUrgenti';
import { TurnoDecisioni } from '../TurnoDecisioni';
import { TurnoGiroParametri } from '../TurnoGiroParametri';

Object.assign(globalThis, { React });
const render = (el: React.ReactElement) => renderToStaticMarkup(el);

const entry = (id: string, extra: Partial<UnreadDiaryEntry> = {}): UnreadDiaryEntry =>
  ({
    id,
    patientId: 'P1',
    sourceType: 'diary',
    sourceId: id,
    identity: null,
    entryDateTime: '2026-10-12T09:05',
    authorName: 'Medico 1',
    title: null,
    content: `nota ${id}`,
    priority: 'normale',
    status: 'aperta',
    readReceipt: { state: 'unread', readBy: null, isAuthor: false, canAcknowledge: true },
    urgency: { state: 'none' },
    ...extra,
  }) as unknown as UnreadDiaryEntry;

const queue = (over: Partial<UnreadQueue> = {}): UnreadQueue =>
  ({
    page: null,
    loading: false,
    error: '',
    busy: null,
    notice: '',
    acknowledge: async () => {},
    loadMore() {},
    retry() {},
    ...over,
  }) as unknown as UnreadQueue;

test("446 QA: «Letta» only when the reader may confirm; never on the reader's own note", () => {
  const q = queue();
  assert.match(render(React.createElement(UnreadAction, { row: entry('a'), queue: q })), />Letta</);
  const own = entry('b', {
    readReceipt: { state: 'unread', readBy: null, isAuthor: true, canAcknowledge: false },
  } as Partial<UnreadDiaryEntry>);
  const html = render(React.createElement(UnreadAction, { row: own, queue: q }));
  assert.doesNotMatch(html, />Letta</);
  assert.match(html, /Scritta da te/);
  const urgent = entry('c', {
    priority: 'urgente',
    urgency: { state: 'active', canAcknowledge: true, isAuthor: false },
  } as Partial<UnreadDiaryEntry>);
  assert.match(render(React.createElement(UnreadAction, { row: urgent, queue: q })), />Ho capito</);
});

test('446 QA: an acknowledgement error keeps the list readable', () => {
  const page = {
    entries: [entry('a')],
    totalUnread: 1,
    filteredUnread: 1,
    hasMore: false,
    nextCursor: null,
    patientCounts: [],
  };
  const html = render(
    React.createElement(TurnoDaLeggere, {
      queue: queue({
        page,
        error: 'Conferma di lettura non registrata. Riprova.',
      } as Partial<UnreadQueue>),
      onOpenAll() {},
    }),
  );
  assert.match(html, /Conferma di lettura non registrata/);
  assert.match(html, /nota a/);
  assert.match(html, /data-unread-total="1"/);
  assert.match(
    render(
      React.createElement(TurnoDaLeggere, { queue: queue(), available: false, onOpenAll() {} }),
    ),
    /non è disponibile per il tuo ruolo/,
  );
});

test('446 QA: the «more urgencies» hint stays even when none is visible', () => {
  const html = render(
    React.createElement(TurnoUrgenti, { rows: [], atLeast: true, queue: queue() }),
  );
  assert.match(html, /altre urgenze/);
  assert.equal(
    render(React.createElement(TurnoUrgenti, { rows: [], atLeast: false, queue: queue() })),
    '',
  );
});

test('446 QA: the doctor never reads «nothing to decide» while a source is loading or failed', () => {
  const base = {
    urgenti: [],
    queue: queue(),
    farmaci: [],
    farmaciState: 'ready' as const,
    dosiNonRegistrate: null,
    onOpenLateTherapy() {},
  };
  const el = (over: object) =>
    render(React.createElement(TurnoDecisioni, { ...base, ...over } as never));
  assert.match(
    el({ urgentiState: 'ready', urgentiAtLeast: false }),
    /Nessuna decisione in sospeso/,
  );
  assert.doesNotMatch(
    el({ urgentiState: 'loading', urgentiAtLeast: false }),
    /Nessuna decisione in sospeso/,
  );
  const failed = el({ urgentiState: 'error', urgentiAtLeast: false });
  assert.doesNotMatch(failed, /Nessuna decisione in sospeso/);
  assert.match(failed, /Urgenze non disponibili/);
  assert.doesNotMatch(
    el({ urgentiState: 'ready', urgentiAtLeast: true }),
    /Nessuna decisione in sospeso/,
  );
});

test('446 QA: «Giro completo» only when the round really is complete', () => {
  const giro = (completo: boolean): GiroParametri => ({
    state: 'ready',
    completo,
    aggiorna() {},
    pazienti: [{ patientId: 'a', nome: 'A', luogo: null, rilevatoOggi: true, critico: false }],
  });
  const el = (g: GiroParametri) =>
    render(React.createElement(TurnoGiroParametri, { giro: g, onStartGiro() {} }));
  assert.match(el(giro(true)), /Giro completo/);
  assert.doesNotMatch(el(giro(false)), /Giro completo/);
  assert.match(el(giro(false)), /almeno 1/);
});
