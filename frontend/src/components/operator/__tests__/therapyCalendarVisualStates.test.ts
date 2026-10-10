import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TherapyCalendarGrid, type TherapyCalendarCell } from '../../shared/TherapyCalendarGrid';

Object.assign(globalThis, { React });
const day = '2026-10-09';
const base: TherapyCalendarCell = {
  date: day,
  time: '08:00',
  title: '2 pazienti',
  count: 3,
  pendingCount: 2,
  tone: 'late',
  detail: '1 somministrate · 0 non somministrate · 2 in ritardo / non registrate',
};
const render = (cells: TherapyCalendarCell[], today = day) =>
  renderToStaticMarkup(
    React.createElement(TherapyCalendarGrid, {
      days: [day, '2026-10-10'],
      cells,
      today,
      onOpen() {},
    }),
  );
const button = (html: string) =>
  html.match(/<button[^>]*data-testid="therapy-calendar-count"[\s\S]*?<\/button>/)?.[0] ?? '';

test('ward late count exposes visible state, distinct symbol, pending meaning and mixed breakdown', () => {
  const html = button(render([base]));
  assert.match(html, /therapy-calendar-count__symbol[^>]*>!<\/span>/);
  assert.match(html, /therapy-calendar-count__state[^>]*>Ritardo \/ non registrata/);
  assert.match(html, />2<\/strong>/);
  assert.match(html, />da erogare<\/span>/);
  assert.match(
    html,
    /therapy-calendar-count__detail[^>]*>1 somministrate · 0 non somministrate · 2 in ritardo/,
  );
  assert.match(html, /data-date="2026-10-09" data-time="08:00"/);
  assert.match(html, /aria-haspopup="dialog"/);
});
test('programmed, administered, non-administered and unknown states have non-color labels and symbols', () => {
  for (const [tone, label, symbol] of [
    ['due', 'Programmata', '○'],
    ['future', 'Programmata', '○'],
    ['done', 'Somministrate', '✓'],
    ['missed', 'Non somministrate presenti', '×'],
    ['unknown', 'Stato da verificare', '?'],
  ]) {
    const html = button(render([{ ...base, tone }]));
    assert.ok(html.includes(`>${label}</span>`), tone);
    assert.ok(html.includes(`>${symbol}</span>`), tone);
  }
});
test('mixed zero pending shows registered breakdown and never calls zero the omitted-dose count', () => {
  const html = button(
    render([
      { ...base, pendingCount: 0, tone: 'missed', detail: '1 somministrate · 2 non somministrate' },
    ]),
  );
  assert.match(html, />0<\/strong>/);
  assert.match(html, />da erogare<\/span>/);
  assert.match(html, />Non somministrate presenti<\/span>/);
  assert.match(html, />1 somministrate · 2 non somministrate<\/span>/);
  assert.doesNotMatch(html, />Somministrate<\/span>/);
});
test('partial zero is incomplete, never a completed zero; partial positive stays lower bound', () => {
  const zero = button(render([{ ...base, pendingCount: 0, tone: 'done', partial: true }]));
  assert.match(zero, />—<\/strong>/);
  assert.match(zero, />Conteggio incompleto<\/span>/);
  assert.match(zero, />Elenco parziale<\/small>/);
  assert.doesNotMatch(zero, />Somministrate<\/span>/);
  const positive = button(render([{ ...base, partial: true }]));
  assert.match(positive, />≥2<\/strong>/);
  assert.match(positive, />Ritardo \/ non registrata<\/span>/);
  assert.match(positive, />Elenco parziale<\/small>/);
});
test('facility current date header persistently names Oggi, not the selected week', () => {
  const html = render([]);
  assert.equal((html.match(/>Oggi<\/strong>/g) ?? []).length, 1);
  assert.match(html, /<th[^>]*class="therapy-calendar-grid__today"[^>]*aria-current="date"/);
  assert.doesNotMatch(render([], '2026-11-01'), />Oggi<\/strong>|aria-current="date"/);
  const source = readFileSync(
    new URL('../../shared/TherapyCalendarGrid.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /today = facilityLocalDate\(\)/);
});
test('patient non-count done means recorded, not necessarily administered; existing visible detail preserved', () => {
  const patient = { ...base, pendingCount: undefined };
  const html = render([
    {
      ...patient,
      tone: 'done',
      title: 'Farmaco sintetico',
      detail: '1 registrata · 1 non somministrata',
    },
  ]);
  assert.match(html, /data-testid="therapy-calendar-cell"/);
  assert.match(html, /1 registrata · 1 non somministrata/);
  assert.doesNotMatch(html, /therapy-calendar-count__state|>Somministrate<\/span>/);
});
test('new text remains visible with colors removed; date marker remains in sticky header', () => {
  const css = readFileSync(
    new URL('../../shared/TherapyCalendarGrid.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /\.therapy-calendar-count__state\s*\{[^}]*overflow-wrap: anywhere/s);
  assert.match(css, /\.therapy-calendar-grid__today-marker\s*\{[^}]*display: block/s);
  assert.match(css, /\.therapy-calendar-grid thead th\s*\{[^}]*position: sticky/s);
  assert.doesNotMatch(css, /\.therapy-calendar-count__(?:state|detail)[^}]*display: none/);
});
