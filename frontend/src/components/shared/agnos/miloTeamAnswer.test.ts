// Milo fase 2: la risposta del team è visibile (testo, specialisti, fonti numerate) e la domanda
// successiva porta con sé gli ultimi scambi della conversazione.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssistantAnswer } from '../AIAssistantButton';
import { conversationHistory } from './useAgnosChat';

// Il test gira senza bundler: il JSX dei componenti cerca React nello scope globale.
(globalThis as { React?: typeof React }).React = React;
const { AnswerView } = await import('../AIAssistantButton');

const answer: AssistantAnswer = {
  intent: 'parameters_overview',
  scope: 'current_patient',
  results: [{ x: 1 }],
  sources: [
    { sourceType: 'VITAL_SIGN', patientId: 'p', recordId: 'r1', label: 'Rilevazione parametri' },
    { sourceType: 'THERAPY', patientId: 'p', recordId: 't1', label: 'Terapia' },
  ] as never,
  navigation: [],
  notFound: false,
  mode: 'team',
  composed: true,
  answerText:
    'La sistolica è salita a 150 mmHg [1] dopo la sospensione del ramipril [2].\n\nNessun altro dato.',
  team: { members: ['clinico', 'sorveglianza'], tools: ['get_patient_parameters'] },
};

test('the team answer, its specialists and numbered sources are rendered', () => {
  const html = renderToStaticMarkup(createElement(AnswerView, { answer }));
  assert.match(html, /La sistolica è salita a 150 mmHg \[1\]/);
  assert.match(html, /<p>Nessun altro dato.<\/p>/);
  assert.match(html, /Milo · Clinico paziente, Sorveglianza clinica/);
  assert.match(html, /\[1\] <!-- -->Rilevazione parametri|\[1\] Rilevazione parametri/);
  assert.match(html, /2 fonti citate/);
});

test('a classic answer keeps its result count and shows composed prose when present', () => {
  const html = renderToStaticMarkup(
    createElement(AnswerView, {
      answer: { ...answer, mode: 'deterministic', answerText: undefined, team: undefined },
    }),
  );
  assert.match(html, /1 risultato/);
  assert.doesNotMatch(html, /Milo ·/);
});

test('conversation history: last turns, operator text and Milo answer text', () => {
  const turns = [
    { role: 'utente' as const, text: 'Come sta Rossi?' },
    { role: 'agnos' as const, read: answer },
    { role: 'agnos' as const, status: 'attesa' as const },
    { role: 'utente' as const, text: '   ' },
  ];
  assert.deepEqual(conversationHistory(turns), [
    { role: 'user', text: 'Come sta Rossi?' },
    { role: 'assistant', text: answer.answerText!.slice(0, 600) },
  ]);
  const many = Array.from({ length: 10 }, (_, i) => ({ role: 'utente' as const, text: `d${i}` }));
  assert.equal(conversationHistory(many).length, 6);
});
