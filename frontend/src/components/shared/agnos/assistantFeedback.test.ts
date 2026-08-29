import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARTIAL_RESULTS_MESSAGE, spokenAssistantSummary } from './assistantFeedback';

const answer = {
  notFound: false,
  results: [{ patientId: 'p-1' }],
  sources: [{ label: 'PA' }],
};

test('spoken assistant summary distinguishes complete and partial results', () => {
  assert.equal(spokenAssistantSummary(answer), 'Trovato 1 risultato: PA.');
  assert.equal(
    spokenAssistantSummary({ ...answer, truncated: true }),
    `Trovato 1 risultato: PA. ${PARTIAL_RESULTS_MESSAGE}`,
  );
});

test('partial-results message gives the operator a recovery action', () => {
  assert.match(PARTIAL_RESULTS_MESSAGE, /parziali/i);
  assert.match(PARTIAL_RESULTS_MESSAGE, /restringi/i);
});

test('answer view exposes the partial-results warning as a live status', () => {
  const source = readFileSync(new URL('../AIAssistantButton.tsx', import.meta.url), 'utf8');
  assert.match(source, /answer\.truncated/);
  assert.match(source, /className="ai-asst__partial"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
});

test('automatic assistant briefs disclose how many sampled activities are shown', () => {
  const source = readFileSync(new URL('./AgnosBrief.tsx', import.meta.url), 'utf8');
  assert.match(source, /Riepilogo parziale: mostrato un esempio per categoria/);
  assert.match(source, /Mostrate \{righe\.length\} di \{totale\} attività/);
  assert.match(source, /className="ai-asst__partial"/);
  assert.match(source, /role="status"/);
});
