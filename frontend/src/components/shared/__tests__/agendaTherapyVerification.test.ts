import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AgendaTherapyVerification,
  agendaVerificationStatus,
  type AgendaTherapyVerificationFeed,
} from '../AgendaTherapyVerification';

Object.assign(globalThis, { React });
const date = '2026-10-18';
const identity = { date, scopeKey: 'session-a:policy1:roster1' };
function feed(patch: Partial<AgendaTherapyVerificationFeed> = {}): AgendaTherapyVerificationFeed {
  return {
    accepted: identity,
    requested: identity,
    scopeKey: identity.scopeKey,
    allowed: true,
    loading: false,
    error: null,
    groups: [
      {
        kind: 'verification',
        id: 'therapy-verification',
        date,
        label: 'Da verificare',
        fascia: null,
        ora: null,
        summary: { total: 1, verification: 1 },
        patients: [
          {
            patientId: 'patient-a',
            firstName: 'Ada',
            lastName: 'Synthetic',
            room: '',
            bed: '',
            items: [
              {
                therapyId: 'therapy-a',
                drugName: 'Missing clock',
                status: 'to_verify',
                reason: 'missing_time',
                scheduledTime: null,
                dosage: null,
                quantityLabel: null,
                canAdminister: false,
              },
            ],
          },
        ],
      },
    ],
    pageInfo: {
      hasMore: false,
      nextCursor: null,
      loadedTherapies: 1,
      completeness: 'complete',
      summaryExact: true,
    },
    loadingMore: false,
    loadMoreError: null,
    onLoad: async () => {},
    onLoadMore: () => {},
    ...patch,
  };
}
const render = (value: AgendaTherapyVerificationFeed, active = true, day = date) =>
  renderToStaticMarkup(
    React.createElement(AgendaTherapyVerification, { feed: value, active, date: day }),
  );

test('accepted/requested date and current scope gate actual verification rendering before effects', () => {
  const scenarios: Array<[Partial<AgendaTherapyVerificationFeed>, string]> = [
    [{ accepted: null }, 'loading'],
    [{ requested: null }, 'loading'],
    [{ accepted: { ...identity, date: '2026-10-17' } }, 'loading'],
    [{ requested: { ...identity, date: '2026-10-17' } }, 'loading'],
    [{ scopeKey: 'session-b:policy2:roster2' }, 'loading'],
    [{ accepted: { ...identity, scopeKey: 'old-session' } }, 'loading'],
    [{ requested: { ...identity, scopeKey: 'old-roster' } }, 'loading'],
    [{ loading: true }, 'loading'],
    [{ error: 'Read failed' }, 'error'],
    [{ allowed: false }, 'denied'],
  ];
  for (const [patch, expected] of scenarios) {
    const value = feed(patch);
    assert.equal(agendaVerificationStatus(value, date, true), expected);
    const html = render(value);
    assert.doesNotMatch(html, /Missing clock|Synthetic|Nessuna terapia da verificare|Somministra/);
  }
  assert.equal(agendaVerificationStatus(feed(), date, true, true), 'loading');
  assert.equal(agendaVerificationStatus(feed(), '2026-10-19', true), 'loading');
  assert.equal(agendaVerificationStatus(feed(), date, false), 'inactive');
  assert.equal(render(feed(), false), '');
});

test('actual accepted empty is distinct from unavailable; verification contains no timed dose/actions', () => {
  const html = render(feed());
  assert.match(html, /Missing clock/);
  assert.match(html, /Da verificare · 1/);
  assert.doesNotMatch(html, /<button|Somministra|08:30|10 mg|Nessuna terapia da verificare/);
  assert.match(render(feed({ groups: [] })), /Nessuna terapia da verificare per questa data/);
  const wrongDate = feed();
  wrongDate.groups[0].date = '2026-10-19';
  assert.equal(agendaVerificationStatus(wrongDate, date, true), 'error');
  assert.doesNotMatch(render(wrongDate), /Missing clock/);
  assert.match(render(wrongDate), /Riprova verifiche/);
});

test('append failure retains accepted readonly details and exact total with bounded retry', () => {
  const value = feed();
  value.groups[0].summary = { total: 5, verification: 5 };
  value.pageInfo = {
    ...value.pageInfo,
    hasMore: true,
    nextCursor: 'owned-cursor',
    loadedTherapies: 100,
    completeness: 'partial',
  };
  value.loadMoreError = 'Continuation failed';
  let html = render(value);
  assert.match(html, /Missing clock/);
  assert.match(html, /Verifiche mostrate 1 di 5. Totale esatto/);
  assert.match(html, /Continuation failed/);
  assert.match(html, /Carica altre verifiche/);
  assert.doesNotMatch(html.slice(html.indexOf('<section'), html.indexOf('</section>')), /<button/);
  html = render({ ...value, loadingMore: true });
  assert.match(html, /disabled=""/);
  assert.match(html, /Caricamento…/);
  const completeVerification = feed({ pageInfo: value.pageInfo });
  assert.doesNotMatch(render(completeVerification), /Carica altre verifiche/);
});
