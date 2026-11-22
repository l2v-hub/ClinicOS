// Milo: il testo del modello si legge senza simboli markdown grezzi e senza HTML grezzo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as { React?: typeof React }).React = React;
const { MiloText } = await import('./MiloText');
const html = (text: string) => renderToStaticMarkup(createElement(MiloText, { text }));

test('bold, lists and table rows seen on the demo are rendered readably', () => {
  const demo = [
    'Le ultime rilevazioni sono del **22/11/2026 alle 19:33** [1][2]:',
    '',
    '| Parametro | Registrazione [1] | Registrazione [2] |',
    '|---|---:|---:|',
    '| Pressione | 150/90 mmHg [1] | 125/80 mmHg [2] |',
    '',
    '- **Letti:** 16 totali, tutti liberi [1].',
    '- **Agenda:** nessun appuntamento oggi [2].',
  ].join('\n');
  const out = html(demo);
  assert.match(out, /<strong>22\/11\/2026 alle 19:33<\/strong>/);
  assert.match(out, /<li>Parametro · Registrazione \[1\] · Registrazione \[2\]<\/li>/);
  assert.match(out, /<li>Pressione · 150\/90 mmHg \[1\] · 125\/80 mmHg \[2\]<\/li>/);
  assert.match(out, /<li><strong>Letti:<\/strong> 16 totali, tutti liberi \[1\].<\/li>/);
  assert.doesNotMatch(out, /\*\*|\|---|\| Pressione/);
});

test('plain paragraphs stay paragraphs; data is never interpreted as HTML', () => {
  const out = html('Prima riga.\n\nSeconda <b>riga</b>.');
  assert.match(out, /<p>Prima riga.<\/p><p>Seconda &lt;b&gt;riga&lt;\/b&gt;.<\/p>/);
});
