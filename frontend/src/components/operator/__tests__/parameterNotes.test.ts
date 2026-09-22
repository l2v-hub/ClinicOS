import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ParameterEntryRow } from '../ParameterEntryRow';

Object.assign(globalThis, { React });
const patient = {
  id: 'qa',
  firstName: 'Esempio',
  lastName: 'Sintetico',
  medicalRecordNumber: 'QA',
};
function render(extra: Partial<React.ComponentProps<typeof ParameterEntryRow>> = {}) {
  return renderToStaticMarkup(
    React.createElement(ParameterEntryRow, {
      patient,
      onOpenHistory() {},
      async onSave() {
        throw new Error('not called');
      },
      ...extra,
    }),
  );
}
test('saved note count is distinct from reading count and exposed in the accessible action', () => {
  const html = render({ readingCount: 8, noteCount: 2 });
  assert.match(html, /2 note salvate oggi/);
  assert.match(html, /class="parameter-note-count"[^>]*>2<\/span>/);
  assert.doesNotMatch(html, /8 note salvate/);
});
test('zero notes has no badge; missing metadata never fabricates zero notes or unassigned room', () => {
  assert.doesNotMatch(render({ noteCount: 0 }), /class="parameter-note-count/);
  const pending = render({ summaryPending: true });
  assert.match(pending, /Verifica note in corso/);
  assert.match(pending, /Caricamento camera/);
  assert.doesNotMatch(pending, /0 note salvate|Camera non assegnata/);
  const unavailable = render({ summaryUnavailable: true });
  assert.match(unavailable, /Conteggio note non disponibile/);
  assert.match(unavailable, /Camera non disponibile/);
});
