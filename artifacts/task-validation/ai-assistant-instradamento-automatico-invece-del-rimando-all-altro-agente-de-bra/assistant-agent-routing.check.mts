// EVIDENZA (non fa parte della suite CI): instradamento automatico fra sub-agent.
//
// Vive qui e non in backend/src/**/__tests__ perché usa `mock.module`, che esiste da Node 22.3 e
// richiede `--experimental-test-module-mocks`: la CI gira su Node 20 e rifiuterebbe il flag.
// Esecuzione (dalla cartella backend/):
//   npx tsx --test --experimental-test-module-mocks \
//     ../artifacts/task-validation/<slug>/assistant-agent-routing.check.ts
//
// Una domanda clinica posta con l'agente «Gestione struttura» attivo NON viene più rimandata
// all'utente: il servizio la instrada all'agente proprietario ed esegue davvero il tool di lettura.
// Il test esercita la catena reale plan → resolveAgent → dispatch; l'unico punto che tocca il DB
// (gateway services) è sostituito da uno stub, così il test resta eseguibile senza Postgres.

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { SourceReference } from '../../../backend/src/ai/gateway/types.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/none';

const ALLERGY_SOURCE: SourceReference = {
  sourceType: 'allergia',
  patientId: 'P1',
  recordId: 'A1',
  label: 'Allergia — penicillina',
  recordedAt: '2026-08-01T08:00:00.000Z',
};

mock.module('../../../backend/src/ai/gateway/services.js', {
  exports: {
    getPatientAllergies: async () => ({
      data: [{ id: 'A1', sostanza: 'penicillina', gravita: 'alta' }],
      sourceRefs: [ALLERGY_SOURCE],
    }),
    searchPatients: async () => [],
  },
});

const { assistantQuery } = await import('../../../backend/src/ai/assistant/service.js');

const CTX = {
  userId: 'op',
  tenantId: 'clinicos',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'r',
};
const ENV = { AI_DEFAULT_TENANT: 'clinicos' } as NodeJS.ProcessEnv;

test('operatore con agente «Gestione struttura»: una domanda clinica viene servita, non rimandata', async () => {
  const answer = await assistantQuery(
    'che allergie ha?',
    CTX,
    { currentPatientId: 'P1', agent: 'facility' },
    ENV,
  );

  assert.equal(answer.intent, 'allergies');
  // nessun rimando: niente refusal, dati veri, e la risposta dichiara chi ha risposto
  assert.equal(answer.refusal, undefined);
  assert.equal(answer.notFound, false);
  assert.equal(answer.results.length, 1);
  assert.equal(answer.agent, 'clinical');
  assert.equal(answer.sources[0]?.label, 'Allergia — penicillina');
});

test('nessun testo di risposta invita a selezionare un altro assistente', async () => {
  const answer = await assistantQuery(
    'che allergie ha?',
    CTX,
    { currentPatientId: 'P1', agent: 'facility' },
    ENV,
  );
  const text = JSON.stringify(answer);
  assert.ok(!/Selezionalo/i.test(text));
  assert.ok(!/competenza dell/i.test(text));
});

test('dominio proprio: l’agente selezionato resta quello che risponde', async () => {
  const answer = await assistantQuery(
    'che allergie ha?',
    CTX,
    { currentPatientId: 'P1', agent: 'clinical' },
    ENV,
  );
  assert.equal(answer.agent, 'clinical');
  assert.equal(answer.results.length, 1);
});

test('senza agente selezionato la risposta non ne inventa uno', async () => {
  const answer = await assistantQuery('che allergie ha?', CTX, { currentPatientId: 'P1' }, ENV);
  assert.equal(answer.agent, undefined);
  assert.equal(answer.results.length, 1);
});
