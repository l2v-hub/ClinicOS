import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClinicalNoteEditor } from '../ClinicalNoteEditor';
import { createConsegnaDraftStore } from '../../../lib/consegnaDrafts';
Object.assign(globalThis, { React });

test('shared editor has two severity levels, automatic stamp and no manual type/date', () => {
  const html = renderToStaticMarkup(React.createElement(ClinicalNoteEditor, {
    content: 'Synthetic observation', priority: 'normale', onChange() {},
  }));
  assert.equal((html.match(/<option/g) ?? []).length, 2);
  assert.match(html, /value="urgente">Alta · richiede presa in carico/);
  assert.match(html, /Data, ora e autore sono registrati automaticamente/);
  assert.doesNotMatch(html, /type="date"|type="time"|Tipo|scadenza/);
});
test('historical intermediate value remains selectable, without converting to urgency', () => {
  const html = renderToStaticMarkup(React.createElement(ClinicalNoteEditor, {
    content: '', priority: 'importante', onChange() {},
  }));
  assert.match(html, /value="importante" selected=""/);
  assert.match(html, /Gravità storica conservata/);
});
test('automatic stamp freezes once; uncertain retry never re-dates the request', () => {
  const store = createConsegnaDraftStore();
  store.update('synthetic-patient', { note: 'Observation', scadenza: '2001-01-01', oraScadenza: '01:00', tipo: 'Legacy' });
  const first = store.begin('synthetic-patient')!;
  assert.notEqual(first.request.scadenza, '2001-01-01');
  assert.equal(first.request.tipo, 'Segnalazione');
  assert.ok(!('oraScadenza' in first.request));
  store.finish(first, { kind: 'failed', code: 'unverified', uncertain: true, message: 'Retry' });
  const retry = store.begin('synthetic-patient')!;
  assert.equal(retry.request, first.request);
  assert.equal(retry.request.requestId, first.request.requestId);
});
