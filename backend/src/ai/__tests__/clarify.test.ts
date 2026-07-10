// Agnos KB (Task 6): catalogo statico di suggerimenti per l'esito `clarify` — anti-allucinazione
// (domande generiche → chip cliccabili da catalogo, mai risposta indovinata o "non trovato" muto).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestFor } from '../assistant/clarify.js';
import { planQueryLLM } from '../assistant/llm-planner.js';

test('con scheda aperta: suggerimenti compilati col nome reale, tutti da catalogo template', () => {
  const s = suggestFor({ currentPatientId: 'p1', currentPatientName: 'Moretti Elena', roles: ['operatore'] });
  assert.ok(s.length >= 2 && s.length <= 4);
  assert.ok(s.some((x) => x.includes('Moretti Elena')));
});

test('admin senza scheda: include suggerimenti organizzativi (camere/turni)', () => {
  const s = suggestFor({ roles: ['admin'] });
  assert.ok(s.some((x) => /camere/.test(x)));
  assert.ok(s.some((x) => /turno/.test(x)));
});

test('operatore senza scheda: MAI suggerimento turni (role-gated)', () => {
  const s = suggestFor({ roles: ['operatore'] });
  assert.equal(s.some((x) => /turno/.test(x)), false);
});

// Un piano LLM esplicito {intent:'clarify', tools:[]} è valido (intent in INTENTS, tools vuoto
// ammesso) e viene accettato in modalità 'llm' — service.ts lo esegue con zero tool call e produce
// l'esito clarify (notFound senza refusal) tramite l'hook su suggestFor.
test('piano LLM {intent: clarify, tools: []} è accettato, mode llm, nessun tool eseguito', async () => {
  const r = await planQueryLLM('boh non so cosa chiedere', {}, {
    callPlanRuntime: async () => ({ plan: { intent: 'clarify', scope: 'cross_patient', requiresCrossPatientAccess: false, tools: [] } }),
    roles: ['operatore'],
  });
  assert.equal(r.mode, 'llm');
  assert.equal(r.plan.intent, 'clarify');
  assert.deepEqual(r.plan.tools, []);
});
