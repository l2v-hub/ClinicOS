import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgendaLegend } from '../../components/shared/AgendaLegend';
import { AgendaStatoFilterRow } from '../../components/shared/AgendaStatoFilter';
import type { Appuntamento } from '../../types';

const styles = readFileSync(
  new URL('../../components/shared/AgendaInline.css', import.meta.url),
  'utf8',
);
const states: Appuntamento['stato'][] = ['programmato', 'in_corso', 'completato', 'annullato'];
const appointments = states.map((stato, i): Appuntamento => ({
  id: `QA-427-${i}`,
  data: '2026-10-10',
  ora: '08:00',
  durata: 30,
  pazienteId: null,
  pazienteNome: null,
  operatoreId: `QA-OP-${i}`,
  operatoreNome: `Operatore sintetico ${i}`,
  tipoIntervento: 'altro',
  stato,
  priorita: 'normale',
  note: '',
}));

test('legend explicitly names all four activity states beyond color', () => {
  const html = renderToStaticMarkup(createElement(AgendaLegend));
  assert.match(html, /Stati delle attività/);
  assert.match(html, /aria-label="Stati delle attività"/);
  for (const label of ['Programmato', 'In corso', 'Completato', 'Annullato', 'Disponibile']) {
    assert.ok(html.includes(label), label);
  }
});

test('empty and populated period filters have a real caption and unchanged native counts', () => {
  for (const items of [[], appointments]) {
    const html = renderToStaticMarkup(
      createElement(AgendaStatoFilterRow, {
        filtro: 'tutti',
        appuntamenti: items,
        onChange: () => {},
      }),
    );
    assert.match(html, /Appuntamenti nel periodo selezionato/);
    assert.match(html, /role="group" aria-label="Filtra per stato"/);
    assert.match(html, new RegExp(`class="ds-chip__count">${items.length}<`));
    assert.equal((html.match(/<button /g) ?? []).length, 5);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /Nessun appuntamento|giornata vuota/i);
  }
});

test('operator colors are suppressed only for admin identity, including inline aggregate borders', () => {
  assert.match(styles, /\.agt-view:not\(\.agt-view--hmi\) \.agt-op-dot\s*\{\s*display: none;/);
  assert.match(
    styles,
    /\.agt-view:not\(\.agt-view--hmi\) \.agt-inline-apt\s*\{\s*border-left-width: 0;/,
  );
});

test('admin card surfaces match badge/legend semantics without rewriting operator HMI', () => {
  for (const [state, background] of [
    ['programmato', '#fff0cf'],
    ['in_corso', '#e7efff'],
    ['completato', '#e3f5eb'],
    ['annullato', '#eceff3'],
  ]) {
    assert.match(
      styles,
      new RegExp(
        `\\.agt-view:not\\(\\.agt-view--hmi\\) \\.agt-apt-card--${state}\\s*\\{[^}]*background: ${background};`,
      ),
    );
  }
});
