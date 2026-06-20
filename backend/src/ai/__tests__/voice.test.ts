import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAction } from '../voice/plan.js';
import { executeAction, VoiceError, type VoiceWriter } from '../voice/execute.js';
import { IdempotencyStore } from '../voice/idempotency.js';
import { loadVoiceConfig, sttStatus } from '../voice/config.js';
import { buildPreview } from '../voice/preview.js';

const PID = 'pat-1';
const idem = (k: string) => () => k;

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

const baseCtx = { requestId: 'r1', userId: 'op1', operatorName: 'Inf. Demo' };

// ── PLAN ────────────────────────────────────────────────────────────────────

test('vocal read: question routes to read intent', () => {
  const p = planAction('Mostrami gli ultimi parametri del paziente', { currentPatientId: PID });
  assert.equal(p.actionType, 'read');
  assert.equal(p.requiresConfirmation, false);
});

test('vital PA 130/80 with time → executable plan', () => {
  const p = planAction('Registra pressione 130 su 80 rilevata alle 9:00', { currentPatientId: PID });
  assert.equal(p.actionType, 'create_vital_sign');
  assert.equal(p.fields.etichetta, 'PA');
  assert.equal(p.fields.valore, '130/80');
  assert.equal(p.fields.timeHHMM, '09:00');
  assert.deepEqual(p.ambiguities, []);
});

test('temperature with decimal comma', () => {
  const p = planAction('Aggiungi temperatura 37,4 rilevata alle 9:00', { currentPatientId: PID });
  assert.equal(p.fields.etichetta, 'TC');
  assert.equal(p.fields.valore, '37.4');
  assert.deepEqual(p.ambiguities, []);
});

test('vital without time → blocking ambiguity', () => {
  const p = planAction('Aggiungi temperatura 37,4', { currentPatientId: PID });
  assert.ok(p.ambiguities.some((a) => /orario/i.test(a)));
});

test('ambiguous patient (no current patient) blocks the action', () => {
  const p = planAction('Registra pressione 130 su 80 alle 9:00 per Mario Rossi', {});
  assert.ok(p.ambiguities.some((a) => /paziente/i.test(a)));
});

test('demographics: phone', () => {
  const p = planAction('Modifica il numero di telefono del paziente con 0612345678', { currentPatientId: PID });
  assert.equal(p.actionType, 'update_patient_demographics');
  assert.equal(p.fields.field, 'phone');
  assert.equal(p.fields.value, '0612345678');
  assert.deepEqual(p.ambiguities, []);
});

test('demographics: address keeps original casing', () => {
  const p = planAction("Sostituisci l'indirizzo con Via Roma 10", { currentPatientId: PID });
  assert.equal(p.fields.field, 'address');
  assert.equal(p.fields.value, 'Via Roma 10');
});

test('narrative: append to Anamnesi', () => {
  const p = planAction('Aggiorna la sezione Anamnesi aggiungendo paziente iperteso noto', { currentPatientId: PID });
  assert.equal(p.actionType, 'update_narrative_section');
  assert.equal(p.sectionKey, 'ANAMNESIS');
  assert.equal(p.fields.addedText, 'paziente iperteso noto');
});

test('forbidden: delete, therapy, allergy writes are refused', () => {
  assert.equal(planAction('Elimina il paziente corrente', { currentPatientId: PID }).actionType, 'refuse_forbidden');
  assert.equal(planAction('Aggiungi una nuova terapia con paracetamolo', { currentPatientId: PID }).actionType, 'refuse_forbidden');
  assert.equal(planAction("Modifica l'allergia alla penicillina", { currentPatientId: PID }).actionType, 'refuse_forbidden');
});

test('clinical advice is refused', () => {
  assert.equal(planAction('Suggerisci una terapia per questo paziente', { currentPatientId: PID }).actionType, 'refuse_clinical');
});

test('out-of-range vital is flagged as warning, not auto-corrected', () => {
  const p = planAction('Registra temperatura 50 alle 10:00', { currentPatientId: PID });
  assert.equal(p.fields.valore, '50'); // kept as transcribed
  assert.ok((p.fields.warnings as string[]).some((w) => /intervallo/i.test(w)));
});

// ── EXECUTE ─────────────────────────────────────────────────────────────────

test('execute: confirmed write applies once and returns recordId', async () => {
  const cfg = loadVoiceConfig({});
  const { w, calls } = fakeWriter();
  const plan = planAction('Registra pressione 130 su 80 alle 9:00', { currentPatientId: PID }, idem('k1'));
  const r = await executeAction(plan, { confirmed: true, ctx: baseCtx, cfg, writer: w, store: new IdempotencyStore(), nowISO: '2026-06-20T09:00:00.000Z' });
  assert.equal(r.ok, true);
  assert.equal(r.recordId, 'rec-vital');
  assert.equal(r.deduped, false);
  assert.deepEqual(calls, ['vital']);
});

test('execute: double confirmation does NOT duplicate (idempotent replay)', async () => {
  const cfg = loadVoiceConfig({});
  const { w, calls } = fakeWriter();
  const store = new IdempotencyStore();
  const opts = { confirmed: true, ctx: baseCtx, cfg, writer: w, store, nowISO: '2026-06-20T09:00:00.000Z' };
  const p1 = planAction('Registra pressione 130 su 80 alle 9:00', { currentPatientId: PID }, idem('same-key'));
  const p2 = planAction('Registra pressione 130 su 80 alle 9:00', { currentPatientId: PID }, idem('same-key'));
  const r1 = await executeAction(p1, opts);
  const r2 = await executeAction(p2, opts);
  assert.equal(r1.deduped, false);
  assert.equal(r2.deduped, true);
  assert.deepEqual(calls, ['vital']); // writer invoked exactly once
});

test('execute: blocked when write actions disabled', async () => {
  const cfg = loadVoiceConfig({ AI_WRITE_ACTIONS_ENABLED: 'false' } as NodeJS.ProcessEnv);
  const { w } = fakeWriter();
  const plan = planAction('Registra pressione 130 su 80 alle 9:00', { currentPatientId: PID }, idem('k2'));
  await assert.rejects(
    () => executeAction(plan, { confirmed: true, ctx: baseCtx, cfg, writer: w, store: new IdempotencyStore() }),
    (e: unknown) => e instanceof VoiceError && e.kind === 'writes_disabled',
  );
});

test('execute: confirmation is mandatory', async () => {
  const cfg = loadVoiceConfig({});
  const { w } = fakeWriter();
  const plan = planAction('Registra pressione 130 su 80 alle 9:00', { currentPatientId: PID }, idem('k3'));
  await assert.rejects(
    () => executeAction(plan, { confirmed: false, ctx: baseCtx, cfg, writer: w, store: new IdempotencyStore() }),
    (e: unknown) => e instanceof VoiceError && e.kind === 'confirmation_required',
  );
});

test('execute: ambiguous plan can never run', async () => {
  const cfg = loadVoiceConfig({});
  const { w } = fakeWriter();
  const plan = planAction('Aggiungi temperatura 37,4', { currentPatientId: PID }, idem('k4')); // missing time
  await assert.rejects(
    () => executeAction(plan, { confirmed: true, ctx: baseCtx, cfg, writer: w, store: new IdempotencyStore() }),
    (e: unknown) => e instanceof VoiceError && e.kind === 'ambiguous',
  );
});

// ── STT / CONFIG / PRIVACY ───────────────────────────────────────────────────

test('STT degrades when no model configured', () => {
  const s = sttStatus(loadVoiceConfig({}));
  assert.equal(s.available, false);
  assert.equal(s.degraded, true);
});

test('STT available when model configured', () => {
  const s = sttStatus(loadVoiceConfig({ AI_STT_MODEL: 'openai:whisper-1' } as NodeJS.ProcessEnv));
  assert.equal(s.available, true);
  assert.equal(s.model, 'openai:whisper-1');
});

test('audio retention defaults to 0 (delete after processing)', () => {
  const cfg = loadVoiceConfig({});
  assert.equal(cfg.audioRetentionSeconds, 0);
  assert.equal(cfg.transcriptRetentionDays, 0);
});

test('preview shows patient + cannot execute while ambiguous', () => {
  const plan = planAction('Aggiungi temperatura 37,4', { currentPatientId: PID }); // missing time
  const prev = buildPreview(plan, { patientName: 'Rossi Mario' });
  assert.equal(prev.canExecute, false);
  assert.equal(prev.patientName, 'Rossi Mario');
});
