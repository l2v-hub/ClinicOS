import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiaryThreadReceipt } from '../DiaryThreadReceipt';
import type { UrgencyView } from '../../../../types';
Object.assign(globalThis, { React });
const active: UrgencyView = {
  state: 'active',
  takenBy: null,
  isAuthor: false,
  canAcknowledge: true,
};
const render = (urgency?: UrgencyView, acknowledgements?: unknown) =>
  renderToStaticMarkup(
    React.createElement(DiaryThreadReceipt, {
      urgency,
      acknowledgements,
      priority: 'urgente',
      onAcknowledge() {},
      busy: false,
      disabled: false,
      subject: 'della nota sintetica',
    }),
  );

test('active shared state awaits understanding, author cannot self-confirm', () => {
  assert.match(render(active), /In attesa di conferma/);
  assert.match(render(active), /<button/);
  assert.doesNotMatch(render({ ...active, isAuthor: true, canAcknowledge: false }), /<button/);
});
test('taken receipt names the reader and stores full facility date, never clinical completion', () => {
  const html = render({
    ...active,
    state: 'taken',
    canAcknowledge: false,
    takenBy: {
      operatorName: 'Collega Sintetico',
      operatorRole: 'oss',
      acknowledgedAt: '2026-10-03T16:35:00Z',
      byMe: true,
    },
  });
  assert.match(html, /Letta e compresa da Collega Sintetico \(OSS\)/);
  assert.match(html, /03\/10\/2026 18:35/);
  assert.match(html, /non è dichiarato concluso/);
  assert.doesNotMatch(html, /<button/);
});
test('historical missing trace and absent/invalid shared protocol never fabricate a reader', () => {
  assert.match(
    render({ ...active, state: 'taken', takenBy: null, canAcknowledge: false }),
    /Conferma storica non disponibile/,
  );
  for (const value of [
    undefined,
    { ...active, state: 'taken', takenBy: { operatorName: 'Fake' } },
  ]) {
    const html = render(value as UrgencyView | undefined);
    assert.match(html, /Conferma condivisa non disponibile/);
    assert.doesNotMatch(html, /Letta e compresa da|<button|Fake/);
  }
});
test('verified none requires no acknowledgement and legacy reads remain personal', () => {
  assert.match(
    render({ ...active, state: 'none', canAcknowledge: false }),
    /Conferma non richiesta/,
  );
  const html = render(undefined, [
    {
      operatorName: 'Lettore Sintetico',
      operatorRole: 'infermiere',
      acknowledgedAt: '2026-10-03T16:35:00Z',
    },
    { operatorName: 'Inventato' },
  ]);
  assert.match(html, /Letta da Lettore Sintetico/);
  assert.match(html, /registrazione personale/);
  assert.doesNotMatch(html, /Inventato|Letta e compresa da/);
});
test('server names are escaped as text', () => {
  const html = render({
    ...active,
    state: 'taken',
    canAcknowledge: false,
    takenBy: {
      operatorName: '<img src=x onerror=alert(1)>',
      operatorRole: 'oss',
      acknowledgedAt: '2026-10-03T16:35:00Z',
      byMe: false,
    },
  });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});
