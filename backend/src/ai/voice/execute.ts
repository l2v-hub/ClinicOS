// REQ-041: the trusted execution boundary. Takes a CONFIRMED ActionPlan and applies it through the
// injected writer (which calls the existing ClinicOS domain writes). Enforces every safety gate:
// feature flags, write-confirmation, ambiguity block, idempotency, audit. Pure orchestration —
// the writer is injected so this is fully unit-testable without a database.

import type { ActionPlan, ExecuteResult, VoiceActionType } from './types.js';
import { isWriteAction } from './types.js';
import type { VoiceConfig } from './config.js';
import { IdempotencyStore } from './idempotency.js';
import { voiceAudit } from './audit.js';

export type VoiceErrorKind =
  | 'feature_disabled' | 'writes_disabled' | 'not_executable' | 'ambiguous' | 'confirmation_required'
  // SPEC-015 (Agnos orchestrator): allowlist violation and delete refusal at the execute boundary.
  | 'not_in_catalog' | 'delete_forbidden';

export class VoiceError extends Error {
  constructor(public kind: VoiceErrorKind, message: string) { super(message); this.name = 'VoiceError'; }
}

export interface WriteMeta {
  operatorName: string;
  operatorId: string;
  nowISO: string;            // injectable "now" for deterministic tests
}

// The writer maps a validated plan to a real ClinicOS domain write and returns the new/updated recordId.
export interface VoiceWriter {
  createVitalSign(patientId: string, fields: Record<string, unknown>, meta: WriteMeta): Promise<string>;
  updateDemographics(patientId: string, field: string, value: string, meta: WriteMeta): Promise<string>;
  appendNarrative(patientId: string, sectionKey: string, addedText: string, meta: WriteMeta): Promise<string>;
  addDiaryNote(patientId: string, content: string, meta: WriteMeta): Promise<string>;
  // SPEC-015 US4: agenda appointments via the shared appointment-service (create/update ONLY —
  // the VoiceWriter has no delete method, by construction).
  createAppointment(patientId: string, fields: Record<string, unknown>, meta: WriteMeta): Promise<string>;
  updateAppointment(targetRecordId: string, fields: Record<string, unknown>, meta: WriteMeta): Promise<string>;
  // Issue #130: consegne via the shared consegna-service (create ONLY — no delete, by construction).
  createConsegna(patientId: string, fields: Record<string, unknown>, meta: WriteMeta): Promise<string>;
}

const SUCCESS_MESSAGE: Record<VoiceActionType, string> = {
  create_vital_sign: 'Parametro registrato.',
  update_patient_demographics: 'Dato anagrafico aggiornato.',
  update_narrative_section: 'Sezione narrativa aggiornata.',
  add_diary_note: 'Nota aggiunta al diario.',
  create_appointment: 'Appuntamento creato in agenda.',
  update_appointment: 'Appuntamento aggiornato in agenda.',
  create_consegna: 'Consegna creata.',
  read: '', refuse_clinical: '', refuse_forbidden: '', unknown: '',
};

export interface ExecuteOptions {
  confirmed: boolean;
  ctx: { requestId: string; userId: string; operatorName: string; channel?: 'TESTO' | 'VOCE'; operatorRole?: string };
  cfg: VoiceConfig;
  writer: VoiceWriter;
  store: IdempotencyStore;
  nowISO?: string;
}

export async function executeAction(plan: ActionPlan, opts: ExecuteOptions): Promise<ExecuteResult> {
  const { cfg, ctx, writer, store } = opts;
  const nowISO = opts.nowISO ?? new Date().toISOString();
  // One clock for the whole call: the idempotency read AND write must use the same "now",
  // otherwise an injected nowISO (deterministic tests) writes with one timestamp while the
  // TTL read uses wall-clock, making a just-stored entry look expired and breaking dedup.
  const nowMs = Date.parse(nowISO) || Date.now();
  const audit = (recordId: string | null, outcome: Parameters<typeof voiceAudit>[5]) =>
    voiceAudit(ctx, plan.actionType, plan.patientId, recordId, Object.keys(plan.fields), outcome, nowISO);

  if (!cfg.voiceEnabled) { audit(null, 'denied'); throw new VoiceError('feature_disabled', 'Funzione vocale disabilitata.'); }
  if (!isWriteAction(plan.actionType)) { audit(null, 'denied'); throw new VoiceError('not_executable', 'Questa azione non è eseguibile come scrittura.'); }
  if (!cfg.writeActionsEnabled) { audit(null, 'denied'); throw new VoiceError('writes_disabled', 'Le azioni di scrittura sono disabilitate.'); }
  if (!plan.patientId) { audit(null, 'denied'); throw new VoiceError('ambiguous', 'Paziente non identificato.'); }
  if (plan.ambiguities.length > 0) { audit(null, 'denied'); throw new VoiceError('ambiguous', plan.ambiguities.join(' · ')); }
  if (cfg.requireWriteConfirmation && !opts.confirmed) {
    audit(null, 'denied');
    throw new VoiceError('confirmation_required', 'Conferma richiesta prima di salvare.');
  }

  // idempotency: a replayed confirmation returns the original result, never a duplicate write.
  const prior = store.get(plan.idempotencyKey, nowMs);
  if (prior) { audit(prior.recordId ?? null, 'deduped'); return prior; }

  const meta: WriteMeta = { operatorName: ctx.operatorName, operatorId: ctx.userId, nowISO };
  let recordId: string;
  switch (plan.actionType) {
    case 'create_vital_sign':
      recordId = await writer.createVitalSign(plan.patientId, plan.fields, meta); break;
    case 'update_patient_demographics':
      recordId = await writer.updateDemographics(plan.patientId, String(plan.fields.field), String(plan.fields.value), meta); break;
    case 'update_narrative_section':
      recordId = await writer.appendNarrative(plan.patientId, String(plan.sectionKey), String(plan.fields.addedText), meta); break;
    case 'add_diary_note':
      recordId = await writer.addDiaryNote(plan.patientId, String(plan.fields.content), meta); break;
    case 'create_appointment':
      recordId = await writer.createAppointment(plan.patientId, plan.fields, meta); break;
    case 'update_appointment':
      if (!plan.targetRecordId) { audit(null, 'denied'); throw new VoiceError('ambiguous', 'Appuntamento da modificare non identificato.'); }
      recordId = await writer.updateAppointment(plan.targetRecordId, plan.fields, meta); break;
    case 'create_consegna':
      recordId = await writer.createConsegna(plan.patientId, plan.fields, meta); break;
    default:
      throw new VoiceError('not_executable', 'Azione non supportata.');
  }

  const result: ExecuteResult = { ok: true, actionType: plan.actionType, recordId, message: SUCCESS_MESSAGE[plan.actionType], deduped: false };
  store.put(plan.idempotencyKey, result, nowMs);
  audit(recordId, 'ok');
  return result;
}
