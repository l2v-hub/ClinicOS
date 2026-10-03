// UX2 W8 (owner 2026-10-03): one urgency model for diary + consegne. Pure rules + real components
// rendered statically: an urgent note stays «Urgente» with «Ho capito» (never for its author) until
// the first non-author takes charge; then only the trace remains and nothing counts it as urgent.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  canTakeCharge,
  countActiveUrgencies,
  countToTakeCharge,
  isActiveUrgency,
  postUrgencyAck,
  urgencyTraceText,
} from '../urgency';
import { consegnaPriorityLabel, isConsegnaUrgencyActive } from '../consegnaUrgency';
import { buildAdessoQueue } from '../adessoQueue';
import { ConsegnePage, type ConsegnePageProps } from '../../components/operator/ConsegnePage';
import { UrgencyNotice } from '../../components/shared/UrgencyNotice';
import { identityHandover } from '../../components/operator/__tests__/operationalIdentity.fixtures';
import type { Consegna, UrgencyView } from '../../types';
Object.assign(globalThis, { React });

const NOW = new Date('2026-10-03T10:00:00.000Z');
const ACTIVE: UrgencyView = {
  state: 'active',
  takenBy: null,
  isAuthor: false,
  canAcknowledge: true,
};
const MINE: UrgencyView = { state: 'active', takenBy: null, isAuthor: true, canAcknowledge: false };
const TAKEN: UrgencyView = {
  state: 'taken',
  takenBy: {
    operatorName: 'Medico 1',
    operatorRole: 'medico',
    acknowledgedAt: '2026-10-03T08:15:00.000Z',
    byMe: false,
  },
  isAuthor: true,
  canAcknowledge: false,
};
const NONE: UrgencyView = { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false };

const handover = (over: Partial<Consegna>): Consegna => ({
  ...identityHandover,
  priorita: 'urgente',
  ...over,
});

test('rules: active vs take-charge (never the author), counts', () => {
  assert.equal(isActiveUrgency(ACTIVE), true);
  assert.equal(isActiveUrgency(MINE), true, 'still an active urgency for the counters');
  assert.equal(isActiveUrgency(TAKEN), false);
  assert.equal(canTakeCharge(ACTIVE), true);
  assert.equal(canTakeCharge(MINE), false);
  assert.equal(canTakeCharge(TAKEN), false);
  // Defence in depth: a malformed view that says isAuthor never offers the button.
  assert.equal(canTakeCharge({ ...ACTIVE, isAuthor: true }), false);
  const items = [ACTIVE, MINE, TAKEN, NONE].map((urgency) => ({ urgency }));
  assert.equal(countActiveUrgencies(items), 2);
  assert.equal(countToTakeCharge(items), 1);
  assert.equal(urgencyTraceText(NONE), null);
  assert.equal(
    urgencyTraceText(TAKEN, NOW),
    'Letta e compresa da Medico 1 (medico) alle 10:15 · priorità originale: urgente',
  );
});

test('consegna labels: Urgente only while active; legacy alta shown as «(valore precedente)»', () => {
  assert.equal(consegnaPriorityLabel(handover({ urgency: ACTIVE })), 'Urgente');
  assert.equal(consegnaPriorityLabel(handover({ urgency: TAKEN })), 'Letta e compresa');
  assert.equal(consegnaPriorityLabel(handover({ priorita: 'alta' })), 'Alta (valore precedente)');
  assert.equal(consegnaPriorityLabel(handover({ priorita: 'normale' })), 'Normale');
  // Without the backend view (local / legacy data) the same rule applies on the stored fields.
  assert.equal(isConsegnaUrgencyActive(handover({ stato: 'aperta' })), true);
  assert.equal(isConsegnaUrgencyActive(handover({ stato: 'completata' })), false);
  assert.equal(isConsegnaUrgencyActive(handover({ stato: 'aperta', urgency: TAKEN })), false);
});

test('UrgencyNotice: button only for a non-author on an active urgency, trace afterwards', () => {
  const render = (urgency: UrgencyView) =>
    renderToStaticMarkup(React.createElement(UrgencyNotice, { urgency, onAcknowledge() {} }));
  assert.match(render(ACTIVE), />Ho capito</);
  assert.doesNotMatch(render(MINE), /Ho capito/);
  assert.match(render(MINE), /in attesa che un collega confermi la lettura/);
  assert.doesNotMatch(render(TAKEN), /Ho capito/);
  assert.match(render(TAKEN), /Letta e compresa da Medico 1 \(medico\)/);
  assert.equal(render(NONE), '');
});

test('Turno «Adesso»: the author never gets their own urgency to do; taken ones never appear', () => {
  const queue = buildAdessoQueue({
    now: NOW,
    scadute: [],
    prossime: [],
    urgenti: [
      handover({ id: 'a', urgency: ACTIVE }),
      handover({ id: 'b', urgency: MINE }),
      handover({ id: 'c', urgency: TAKEN }),
    ],
    anomalie: [],
  });
  assert.deepEqual(
    queue.map((item) => item.key),
    ['consegna:a'],
  );
});

const pageProps = (consegne: Consegna[]): ConsegnePageProps => ({
  consegne,
  summary: { total: consegne.length, urgentActive: 1, urgentTaken: 1 },
  operatori: [],
  operatoreId: 'reader',
  isAdmin: false,
  onAdd: async () => ({ kind: 'failed', uncertain: false, code: 'x', message: 'x' }),
  onUpdate() {},
  onAcknowledge() {},
  onDelete() {},
  loading: false,
  loadError: null,
  hasMore: false,
  onQueryChange() {},
  onLoadMore() {},
  onRetry() {},
});

test('Consegne feed: no aperta / in corso / completata anywhere; urgent section + «Ho capito» + trace', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ConsegnePage,
      pageProps([
        handover({ id: 'u1', urgency: ACTIVE }),
        handover({ id: 'u2', urgency: TAKEN, stato: 'in_corso' }),
        handover({ id: 'n1', priorita: 'normale', urgency: NONE }),
      ]),
    ),
  );
  assert.match(html, /1 urgenza da prendere in carico/);
  assert.match(html, /Urgenze da prendere in carico/);
  assert.equal(html.match(/>Ho capito</g)?.length, 1);
  assert.match(html, /Letta e compresa da Medico 1/);
  assert.doesNotMatch(html, /Aperta|In corso|Completat|Da iniziare|Prendi in carico|Rilascia/);
  assert.doesNotMatch(html, />Alta</, 'priority filter offers only Normale / Urgente');
});

test('source guards: forms and edit never ask «Stato»; no transition handlers remain', () => {
  const page = readFileSync(
    new URL('../../components/operator/ConsegnePage.tsx', import.meta.url),
    'utf8',
  );
  const detail = readFileSync(
    new URL('../../components/operator/PatientDetail.tsx', import.meta.url),
    'utf8',
  );
  const create = readFileSync(
    new URL('../../components/operator/ConsegnaCreateForm.tsx', import.meta.url),
    'utf8',
  );
  for (const src of [page, detail, create]) {
    assert.doesNotMatch(src, /onUpdateStato|onUpdateConsegnaStato|<option value="in_corso">/);
    assert.doesNotMatch(src, /stato-pill--consegna/);
  }
  assert.doesNotMatch(page, /<label className="form-label">Stato<\/label>/);
});

test('postUrgencyAck: server message (e.g. author 409) is shown as is', async () => {
  const fetcher = (async () =>
    new Response(
      JSON.stringify({
        error: 'Hai scritto tu questa urgenza: la presa in carico spetta a un altro operatore.',
        code: 'author_cannot_acknowledge',
      }),
      { status: 409 },
    )) as unknown as typeof fetch;
  await assert.rejects(postUrgencyAck('/api/consegne/x/ack', {}, fetcher), /un altro operatore/);
  const ok = (async () =>
    new Response(JSON.stringify({ created: true, urgency: TAKEN }), {
      status: 201,
    })) as unknown as typeof fetch;
  assert.equal((await postUrgencyAck('/api/consegne/x/ack', {}, ok)).urgency.state, 'taken');
});
