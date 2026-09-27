// Ingresso unico "Nuovo paziente": documenti (rapido) prima, a mano dopo. Al primo render lo stato
// del servizio AI non è noto, quindi "Da documenti" è disattivata e il focus iniziale va su "A mano".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewPatientChooser } from '../NewPatientChooser';

// Il test runner usa JSX classico per i TSX importati.
Object.assign(globalThis, { React });

const html = renderToStaticMarkup(
  createElement(NewPatientChooser, { onClose: () => {}, onChoose: () => {} }),
);

test('is an accessible dialog titled "Nuovo paziente"', () => {
  assert.match(html, /role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="([^"]+)"/);
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/)![1];
  assert.match(html, new RegExp(`<h3 id="${labelledBy}"[^>]*>Nuovo paziente</h3>`));
  assert.match(html, /aria-label="Chiudi"/);
});

test('offers documents first, then manual entry', () => {
  const docs = html.indexOf('Da documenti');
  const manual = html.indexOf('A mano');
  assert.ok(docs > 0 && manual > docs);
});

test('while the AI status is unknown, documents are disabled and manual entry gets the focus', () => {
  const [docsButton, manualButton] = html.match(
    /<button type="button" class="new-patient-chooser__option[^>]*>/g,
  )!;
  assert.match(docsButton, /disabled=""/);
  assert.match(docsButton, /aria-busy="true"/);
  assert.doesNotMatch(docsButton, /data-dialog-initial-focus/);
  assert.match(html, /Verifica del servizio AI in corso/);
  assert.doesNotMatch(manualButton, /disabled/);
  assert.match(manualButton, /data-dialog-initial-focus/);
});
