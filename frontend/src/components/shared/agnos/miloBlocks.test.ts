// Milo fase 3: il pannello disegna i blocchi ricevuti dal backend (indicatori, tabelle, andamento)
// e offre «Fissa come cruscotto» e «Stampa report» solo quando conosce la domanda.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssistantAnswer } from '../AIAssistantButton';

(globalThis as { React?: typeof React }).React = React;
const { AnswerView } = await import('../AIAssistantButton');

const answer: AssistantAnswer = {
  intent: 'clinical_score',
  scope: 'current_patient',
  results: [{ x: 1 }],
  sources: [
    { sourceType: 'CLINICAL_SCORE', patientId: 'p', recordId: 'r1', label: 'NEWS2' },
  ] as never,
  navigation: [],
  notFound: false,
  mode: 'deterministic',
  blocks: [
    {
      type: 'kpi',
      title: 'Punteggio di allerta',
      items: [
        { label: 'NEWS2', value: '6', tone: 'warning', note: 'rischio medio' },
        { label: 'Risposta prevista dal protocollo', value: 'Valutazione medica urgente' },
      ],
      source: 'NEWS2 — RCP 2017 — scala SpO₂ 1',
    },
    {
      type: 'table',
      title: 'Somministrazioni',
      columns: [
        { key: 'drug', label: 'Farmaco' },
        { key: 'dose', label: 'Dose' },
      ],
      rows: [{ drug: '<b>Paracetamolo</b>', dose: '1 g' }],
    },
    {
      type: 'parameter_trend',
      title: 'Andamento dei parametri',
      patientId: 'p',
      period: { start: '2026-11-16', end: '2026-11-22' },
      params: ['pa', 'sconosciuto'],
      readings: [
        {
          id: 'r1',
          measuredAt: '2026-11-20T08:00:00.000Z',
          values: { pa: '130/80' },
          source: 'parametri',
          author: 'Inf. Bianchi',
        },
        {
          id: 'r2',
          measuredAt: '2026-11-22T08:00:00.000Z',
          values: { pa: '150/90' },
          source: 'cartella',
        },
      ],
    },
  ],
};

test('kpi, tables and the parameter trend are rendered from the blocks, as text', () => {
  const html = renderToStaticMarkup(createElement(AnswerView, { answer }));
  assert.match(html, /data-testid="milo-blocks"/);
  assert.match(html, /milo-kpi__item--warning/);
  assert.match(html, /Valutazione medica urgente/);
  assert.match(html, /Fonte: NEWS2 — RCP 2017/);
  assert.match(html, /<th scope="col">Farmaco<\/th>/);
  // Testo dei dati mai interpretato come HTML.
  assert.match(html, /&lt;b&gt;Paracetamolo&lt;\/b&gt;/);
  assert.match(html, /milo-block--trend/);
});

test('pin and print appear only with the question; a pinned answer says so', () => {
  const without = renderToStaticMarkup(createElement(AnswerView, { answer }));
  assert.doesNotMatch(without, /Fissa come cruscotto|Stampa report/);
  const withQ = renderToStaticMarkup(
    createElement(AnswerView, { answer, question: 'NEWS2 di oggi', onPin: () => {} }),
  );
  assert.match(withQ, /Fissa come cruscotto/);
  assert.match(withQ, /Stampa report/);
  assert.match(withQ, /milo-print-header/);
  const pinned = renderToStaticMarkup(
    createElement(AnswerView, { answer, question: 'NEWS2 di oggi', onPin: () => {}, pinned: true }),
  );
  assert.match(pinned, /Fissato tra i cruscotti/);
});

test('no blocks: nothing new is drawn', () => {
  const html = renderToStaticMarkup(
    createElement(AnswerView, { answer: { ...answer, blocks: undefined } }),
  );
  assert.doesNotMatch(html, /milo-blocks/);
});
