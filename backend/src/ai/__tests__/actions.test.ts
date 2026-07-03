// SPEC-015 Increment A: unified Agnos orchestrator — CRU-only catalog, channel-agnostic
// plan/execute, delete refused at every level. No DB: preview context, writer and store are injected
// (same mocking pattern as voice.test.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGNOS_ACTION_CATALOG, isActionAllowed, listCatalog, type AgnosActionKind } from '../actions/catalog.js';
import { planCommand, executeCommand, type AgnosOperatorContext } from '../actions/orchestrate.js';
import { VoiceError, type VoiceWriter } from '../voice/execute.js';
import { IdempotencyStore } from '../voice/idempotency.js';
import { loadVoiceConfig } from '../voice/config.js';
import type { UserContext } from '../gateway/types.js';
import type { AssistantAnswer } from '../assistant/service.js';

const PID = 'pat-1';
const gatewayCtx: UserContext = {
  userId: 'op1', tenantId: 'default', roles: ['operatore'], permittedPatientIds: null, requestId: 'test',
};
const operatorCtx: AgnosOperatorContext = { operatorId: 'op1', operatorName: 'Inf. Demo', gatewayCtx };
const noDb = { loadPreviewContext: async () => ({}) };
const emptyEnv = {} as NodeJS.ProcessEnv;

function fakeWriter() {
  const calls: string[] = [];
  const w: VoiceWriter = {
    async createVitalSign() { calls.push('vital'); return 'rec-vital'; },
    async updateDemographics() { calls.push('demo'); return 'rec-demo'; },
    async appendNarrative() { calls.push('narr'); return 'rec-narr'; },
    async addDiaryNote() { calls.push('diary'); return 'rec-diary'; },
  };
  return { w, calls };
}

function execDeps(w: VoiceWriter, env: NodeJS.ProcessEnv = emptyEnv) {
  return { cfg: loadVoiceConfig(emptyEnv), writer: w, store: new IdempotencyStore(), env, nowISO: '2026-07-03T10:00:00.000Z' };
}

// ── CATALOG ─────────────────────────────────────────────────────────────────

test('catalog: zero delete actions, kinds are CRU-only by construction', () => {
  const entries = Object.values(AGNOS_ACTION_CATALOG);
  assert.ok(entries.length >= 5);
  const allowedKinds: AgnosActionKind[] = ['read', 'create', 'update'];
  for (const e of entries) {
    assert.ok(allowedKinds.includes(e.kind), `${e.name}: kind ${e.kind}`);
    assert.notEqual(e.kind as string, 'delete');
    assert.ok(e.description.length > 0);
  }
  // the 4 write actions + the read entry are all present
  for (const name of ['read', 'create_vital_sign', 'update_patient_demographics', 'update_narrative_section', 'add_diary_note']) {
    assert.ok(AGNOS_ACTION_CATALOG[name], `manca ${name}`);
  }
});

test('catalog: deny-by-default and AI_DISABLED_ACTIONS kill-switch', () => {
  assert.equal(isActionAllowed('create_vital_sign', emptyEnv), true);
  assert.equal(isActionAllowed('delete_patient', emptyEnv), false);            // not in catalog
  assert.equal(isActionAllowed('delete_vital_sign', emptyEnv), false);         // not in catalog
  assert.equal(isActionAllowed('create_vital_sign', { AI_DISABLED_ACTIONS: 'create_vital_sign' } as NodeJS.ProcessEnv), false);
  assert.equal(isActionAllowed('add_diary_note', { AI_DISABLED_ACTIONS: 'create_vital_sign, add_diary_note' } as NodeJS.ProcessEnv), false);
  const listed = listCatalog({ AI_DISABLED_ACTIONS: 'add_diary_note' } as NodeJS.ProcessEnv);
  assert.equal(listed.find((e) => e.name === 'add_diary_note')?.enabled, false);
  assert.equal(listed.find((e) => e.name === 'create_vital_sign')?.enabled, true);
});

// ── PLAN (channel testo) ────────────────────────────────────────────────────

test('planCommand testo: vital command → executable create_vital_sign preview', async () => {
  const r = await planCommand(
    { text: 'registra pressione 130 su 80 alle 9', channel: 'testo', currentPatientId: PID, operatorCtx },
    { loadPreviewContext: async () => ({ patientName: 'Rossi Mario' }) },
  );
  assert.equal(r.plan.actionType, 'create_vital_sign');
  assert.equal(r.plan.channel, 'testo');
  assert.equal(r.plan.patientId, PID);
  assert.deepEqual(r.plan.ambiguities, []);
  assert.equal(r.read, null);
  assert.equal(r.preview?.canExecute, true);
  assert.equal(r.preview?.patientName, 'Rossi Mario');
  assert.equal(r.preview?.title, 'Aggiungi parametro');
});

test('planCommand: read question delegates to the assistant (preview null, read populated)', async () => {
  const answer = { intent: 'unknown', results: [], sources: [], navigation: [], notFound: false, truncated: false } as unknown as AssistantAnswer;
  let asked = '';
  const r = await planCommand(
    { text: 'Quali sono gli ultimi parametri?', channel: 'testo', currentPatientId: PID, operatorCtx },
    { runRead: async (q) => { asked = q; return answer; } },
  );
  assert.equal(r.plan.actionType, 'read');
  assert.equal(r.plan.channel, 'testo');
  assert.equal(r.preview, null);
  assert.ok(r.read);
  assert.match(asked, /parametri/i);
});

// ── DELETE: refused at plan AND at execute, on every variant ────────────────

const DELETE_VARIANTS = [
  "cancella l'ultima nota",
  'rimuovi il parametro',
  'elimina il paziente',
  'togli la nota',
  'svuota il diario',
  'azzera i parametri di oggi',
  'distruggi la cartella',
  'butta via la nota di ieri',
  'deleta la nota',
  'cestina il documento',
];

test('planCommand: every delete variant → refusal pointing to the traditional UI', async () => {
  for (const text of DELETE_VARIANTS) {
    const r = await planCommand({ text, channel: 'testo', currentPatientId: PID, operatorCtx }, noDb);
    assert.equal(r.plan.actionType, 'refuse_forbidden', text);
    assert.equal(r.plan.refusalKind, 'delete', text);
    assert.equal(r.plan.requiresConfirmation, false, text);
    assert.match(r.preview?.refusal ?? '', /interfaccia tradizionale/i, text);
  }
});

test('executeCommand: delete variants are rejected even when confirmed — NO write happens', async () => {
  for (const text of DELETE_VARIANTS) {
    const { w, calls } = fakeWriter();
    await assert.rejects(
      () => executeCommand(
        { text, channel: 'testo', patientId: PID, idempotencyKey: `k-${text}`, confirmed: true, operatorCtx },
        execDeps(w),
      ),
      (e: unknown) => e instanceof VoiceError && (e.kind === 'delete_forbidden' || e.kind === 'not_executable'),
      text,
    );
    assert.deepEqual(calls, [], `writer chiamato per: ${text}`);
  }
});

test('executeCommand: delete refusal uses the dedicated delete_forbidden kind', async () => {
  const { w } = fakeWriter();
  await assert.rejects(
    () => executeCommand(
      { text: 'elimina il paziente', channel: 'voce', patientId: PID, idempotencyKey: 'k-del', confirmed: true, operatorCtx },
      execDeps(w),
    ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'delete_forbidden' && /interfaccia tradizionale/i.test(e.message),
  );
});

// ── ALLOWLIST at execute ────────────────────────────────────────────────────

test('executeCommand: action disabled via AI_DISABLED_ACTIONS → not_in_catalog, NO write', async () => {
  const { w, calls } = fakeWriter();
  await assert.rejects(
    () => executeCommand(
      { text: 'registra pressione 130 su 80 alle 9', channel: 'testo', patientId: PID, idempotencyKey: 'k-dis', confirmed: true, operatorCtx },
      execDeps(w, { AI_DISABLED_ACTIONS: 'create_vital_sign' } as NodeJS.ProcessEnv),
    ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'not_in_catalog',
  );
  assert.deepEqual(calls, []);
});

// ── HAPPY PATH (channel testo) ──────────────────────────────────────────────

test('executeCommand testo: add_diary_note happy path writes once', async () => {
  const { w, calls } = fakeWriter();
  const r = await executeCommand(
    { text: 'aggiungi una nota al diario con paziente tranquillo', channel: 'testo', patientId: PID, idempotencyKey: 'k-diary', confirmed: true, operatorCtx },
    execDeps(w),
  );
  assert.equal(r.ok, true);
  assert.equal(r.actionType, 'add_diary_note');
  assert.equal(r.recordId, 'rec-diary');
  assert.equal(r.deduped, false);
  assert.deepEqual(calls, ['diary']);
});

test('executeCommand testo: replayed idempotency key does not duplicate the write', async () => {
  const { w, calls } = fakeWriter();
  const deps = execDeps(w);
  const input = { text: 'aggiungi una nota al diario con paziente tranquillo', channel: 'testo' as const, patientId: PID, idempotencyKey: 'k-same', confirmed: true, operatorCtx };
  const r1 = await executeCommand(input, deps);
  const r2 = await executeCommand(input, deps);
  assert.equal(r1.deduped, false);
  assert.equal(r2.deduped, true);
  assert.deepEqual(calls, ['diary']);
});

test('executeCommand: confirmation still mandatory on the text channel', async () => {
  const { w, calls } = fakeWriter();
  await assert.rejects(
    () => executeCommand(
      { text: 'registra pressione 130 su 80 alle 9', channel: 'testo', patientId: PID, idempotencyKey: 'k-noconf', confirmed: false, operatorCtx },
      execDeps(w),
    ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'confirmation_required',
  );
  assert.deepEqual(calls, []);
});
