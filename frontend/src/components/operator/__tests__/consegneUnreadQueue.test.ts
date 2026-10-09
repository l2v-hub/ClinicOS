import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { ConsegneWorkspace, type ConsegneWorkspaceProps } from '../ConsegneWorkspace';
Object.assign(globalThis, { React });
const props: ConsegneWorkspaceProps = {
  sessionKey: 'QA409',
  consegne: [],
  summary: { total: 0, urgentActive: 0, urgentTaken: 0 },
  operatori: [],
  operatoreId: 'QA409',
  isAdmin: false,
  onAdd: async () =>
    ({ kind: 'failed', uncertain: false, code: 'unavailable', message: 'QA' }) as never,
  onUpdate() {},
  onAcknowledge() {},
  onDelete() {},
  loading: false,
  loadError: null,
  hasMore: false,
  onQueryChange() {},
  onLoadMore() {},
  onRetry() {},
};
test('generic workspace defaults to selected Non confermate, not first patient or date restriction', () => {
  const html = renderToStaticMarkup(React.createElement(ConsegneWorkspace, props));
  assert.match(html, /aria-pressed="true"[^>]*>Non confermate/);
  assert.match(html, /diario e consegne/);
  assert.match(html, /Per paziente/);
  assert.doesNotMatch(html, /Caricamento pazienti/);
});
test('sidebar and session defaults explicitly target unread, while dashboard feed remains separate', () => {
  const app = readFileSync(new URL('../../../App.tsx', import.meta.url), 'utf8');
  assert.match(
    app,
    /setConsegneView\(\(value\) => \(\{ mode: 'unread', key: value.key \+ 1 \}\)\)/,
  );
  assert.match(app, /mode: 'feed',[\s\S]*?query,/);
});
