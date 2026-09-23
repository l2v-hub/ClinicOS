import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsegnePage, type ConsegnePageProps } from '../../../../frontend/src/components/operator/ConsegnePage';
import { ConsegneWorkspace } from '../../../../frontend/src/components/operator/ConsegneWorkspace';
Object.assign(globalThis, { React });
const props: ConsegnePageProps = {
  consegne: [], summary: { total: 3, open: 2, urgentOpen: 1, inProgress: 0, completed: 1 },
  operatori: [], operatoreId: 'synthetic', isAdmin: false,
  onAdd: async () => ({ kind: 'failed', code: 'synthetic', uncertain: false, message: '' }),
  onUpdate() {}, onUpdateStato() {}, onDelete() {}, loading: false, loadError: null,
  hasMore: false, onQueryChange() {}, onLoadMore() {}, onRetry() {},
};
const standalone = renderToStaticMarkup(React.createElement(ConsegnePage, props));
const embedded = renderToStaticMarkup(React.createElement(ConsegneWorkspace, {
  ...props, sessionKey: 'synthetic', entry: { mode: 'feed', key: 1 },
}));
for (const html of [standalone, embedded]) {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((html.match(/aria-label="Breadcrumb"/g) ?? []).length, 1);
  assert.equal((html.match(/<header class="page-header"/g) ?? []).length, 1);
  assert.match(html, /Nel tuo perimetro: 2 aperte · 1 urgenti/);
  assert.match(html, /Nuova consegna/);
}
console.log('PASS: standalone and embedded Feed each have one breadcrumb, one h1 and one page header; summary and create action retained.');
