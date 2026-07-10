// Agnos KB (Task 6): catalogo statico di suggerimenti per l'esito `clarify` — anti-allucinazione
// (domande generiche → chip cliccabili da catalogo, mai risposta indovinata o "non trovato" muto).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestFor } from '../assistant/clarify.js';
import { planQueryLLM } from '../assistant/llm-planner.js';
import { assistantQuery, clarifyAnswerText } from '../assistant/service.js';
import type { UserContext } from '../gateway/types.js';

// Contesto minimo valido (campi reali di UserContext in gateway/types.ts) — nessun accesso DB
// atteso per le domande scelte sotto (nessun nome paziente estraibile, nessun tool eseguito).
const CTX: UserContext = {
  userId: 'u1',
  tenantId: 't1',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'test-req-1',
};
// Config LLM esplicitamente vuota: il planner deterministico resta l'unico percorso, i test
// non dipendono da Azure/env reali (loadAssistantLlmConfig con env={} → llmEnabled=false).
const NO_LLM_ENV: NodeJS.ProcessEnv = {};

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

// Final review fix: this test asserted the OLD spec (turni = admin-only chip). 2026-07-10 decision:
// operators_on_duty is organizational (non-clinical) data, executable by both roles — the
// admin-only gate was removed from queryOperators (see gateway/services.ts). Suggestion parity
// with authorization: an operator now sees the turni chip too, and it is actually executable
// (spec §3 invariant: every chip must be executable — the old 'Appuntamenti di oggi' chip was not,
// since it always required cross-patient access that operators never have).
test('operatore senza scheda: include suggerimento turni (parità con l\'autorizzazione, 2026-07-10)', () => {
  const s = suggestFor({ roles: ['operatore'] });
  assert.equal(s.some((x) => /turno/.test(x)), true);
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

// Integrazione reale: assistantQuery end-to-end (nessun mock del gateway) col planner
// deterministico (LLM disattivato via env vuoto) — la domanda non nomina un paziente, quindi
// nessuna risoluzione nome→id tocca il DB, e non produce alcun tool nel piano.
test('integrazione: domanda generica → clarify con suggestions (notFound senza refusal)', async () => {
  const a = await assistantQuery('dammi i dati', CTX, {}, NO_LLM_ENV);
  assert.equal(a.notFound, true);
  assert.ok(!a.refusal);
  assert.ok(a.suggestions && a.suggestions.length >= 2);
  assert.match(a.answerText ?? '', /Forse intendevi/);
});

// Final review fix (I2): withClarify non deve mai dichiarare "non ho capito" su una domanda
// RICONOSCIUTA (intent letto correttamente) che è semplicemente vuota — sarebbe una menzogna
// (anti-allucinazione vale anche per il testo di cornice). Si testa la funzione pura esportata
// (nessun accesso DB necessario): unknown/clarify → frase di non comprensione; qualunque altro
// intent riconosciuto → frase neutra "nessun dato trovato".
test('clarifyAnswerText: intent unknown → frase di non comprensione', () => {
  assert.equal(clarifyAnswerText('unknown'), 'Non ho capito bene la domanda. Forse intendevi:');
});
test('clarifyAnswerText: intent clarify (esplicito da LLM) → frase di non comprensione', () => {
  assert.equal(clarifyAnswerText('clarify'), 'Non ho capito bene la domanda. Forse intendevi:');
});
test('clarifyAnswerText: intent riconosciuto ma vuoto (es. vitals_recent) → frase neutra, mai "non capito"', () => {
  assert.equal(clarifyAnswerText('vitals_recent'), 'Nessun dato trovato per questa richiesta. Forse cercavi:');
});

test('integrazione: rifiuto clinico NON riceve suggestions', async () => {
  const a = await assistantQuery('che terapia dovrei prendere per la pressione alta?', CTX, {}, NO_LLM_ENV);
  assert.ok(a.refusal);
  assert.equal(a.suggestions, undefined);
});
