// REQ-041: typed contracts for the voice write-action flow.
//
// A spoken command is transcribed CLIENT-SIDE (the audio never reaches this backend), turned into a
// deterministic, typed ActionPlan, previewed, and only executed after explicit operator confirmation.
// The "model" never touches the database: planning is a pure parser, execution is the trusted backend.

export type VoiceActionType =
  | 'read'                          // a question → delegated to the read-only assistant (REQ-040)
  | 'create_vital_sign'
  | 'update_patient_demographics'
  | 'update_narrative_section'
  | 'add_diary_note'
  | 'create_appointment'            // SPEC-015 US4: agenda slot via Agnos (create)
  | 'update_appointment'            // SPEC-015 US4: move an existing agenda slot (update)
  | 'create_consegna'               // Issue #130: consegna (handover card) via Agnos (create)
  | 'refuse_clinical'               // diagnosis / therapy advice / prognosis
  | 'refuse_forbidden'              // deletes, therapy/allergy changes — disabled in v1
  | 'unknown';

// The only write tools enabled. Deletes and clinically-critical changes are intentionally absent.
export const WRITE_ACTION_TYPES: readonly VoiceActionType[] = [
  'create_vital_sign', 'update_patient_demographics', 'update_narrative_section', 'add_diary_note',
  'create_appointment', 'update_appointment', 'create_consegna',
] as const;

export function isWriteAction(t: VoiceActionType): boolean {
  return WRITE_ACTION_TYPES.includes(t);
}

export interface ActionPlan {
  actionType: VoiceActionType;
  patientId: string | null;
  targetRecordId: string | null;
  /** Whitelisted, validated fields for the chosen tool (never an arbitrary patch). */
  fields: Record<string, unknown>;
  sourceTranscript: string;
  /** Anything that BLOCKS execution until resolved (missing patient, value, unit, time; ambiguity). */
  ambiguities: string[];
  requiresConfirmation: boolean;
  idempotencyKey: string;
  /** Narrative section key, when actionType === 'update_narrative_section'. */
  sectionKey?: string;
  /** The question to run, when actionType === 'read'. */
  readQuery?: string;
  /** Why a refusal happened (refuse_clinical / refuse_forbidden). */
  refusalReason?: string;
  /** SPEC-015: set when the refusal is specifically a deletion attempt (CRU-only: delete has no AI path). */
  refusalKind?: 'delete';
  /** SPEC-015: input channel the command arrived on ('testo' | 'voce'); attached by the orchestrator. */
  channel?: string;
}

// A human-readable, source-grounded preview shown before the operator confirms.
export interface ActionPreview {
  actionType: VoiceActionType;
  patientId: string | null;
  patientName?: string;
  title: string;
  lines: Array<{ label: string; value: string }>;
  /** For narrative edits: current vs proposed vs resulting text. */
  diff?: { current: string; proposed: string; resulting: string };
  ambiguities: string[];
  canExecute: boolean;
  warnings: string[];
  /** SPEC-015: refusal message (delete/clinical/forbidden) that points the operator to the traditional UI. */
  refusal?: string;
}

export interface ExecuteResult {
  ok: boolean;
  actionType: VoiceActionType;
  recordId?: string;
  message: string;
  /** True when an identical confirmed action was already applied (idempotent replay). */
  deduped: boolean;
}
