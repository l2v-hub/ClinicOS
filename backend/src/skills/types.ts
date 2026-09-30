// Skill & Workflow layer (Phase 3, see .ai-architecture/phase-3-skills).
//
// A SKILL is an operational goal of the user ("registra i parametri di un ospite"). It orchestrates
// one or more Tool Layer tools and never owns business logic: every read/write goes through
// `ToolRegistry.invoke`, which re-authorizes against the Phase 2 policy on EVERY call.
// A WORKFLOW is one running instance of a skill, with explicit structured state (never the LLM's
// free memory).

export type SkillCategory = 'operational' | 'clinical' | 'query' | 'supervisory' | 'administrative';

/** Central confirmation classes (CONFIRMATION_POLICY.md). */
export type ConfirmationClass = 'READ' | 'LOW_RISK_WRITE' | 'SENSITIVE_WRITE' | 'HIGH_RISK';

export type SkillStatus = 'DESIGNED' | 'IMPLEMENTED' | 'EXECUTABLE' | 'TESTED' | 'BLOCKED';

export type SkillSlot =
  /** Patient/resident target, resolved through `patients.search` or the page context. */
  | 'patient'
  /** Vital signs values (keys of parameter-reading-input PARAMETER_KEYS). */
  | 'values'
  /** Free text (observation, handover note). */
  | 'text'
  /** Calendar day YYYY-MM-DD (defaults to today in the facility). */
  | 'date'
  /** Free search text (drug name, question). */
  | 'query'
  /** One pending therapy administration of the resident (administration.record). */
  | 'administration'
  /** Structured edit after «Modifica» (values / text / priority). */
  | 'edit';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  /** Baseline roles the skill is intended for (configurable, not normative). */
  intendedRoles: readonly string[];
  /** Tools that must ALL be allowed by the current policy for the skill to be available. */
  requiredTools: readonly string[];
  /** Tools that enrich the result; their absence makes the skill `partial`, not unavailable. */
  optionalTools: readonly string[];
  /** Slots the workflow must fill before it can run, in the order it asks for them. */
  slots: readonly SkillSlot[];
  /** Slots that are optional (defaults apply). */
  optionalSlots?: readonly SkillSlot[];
  output: string;
  steps: readonly string[];
  kind: 'read' | 'write' | 'action';
  confirmation: ConfirmationClass;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  /** How the workflow handles an ambiguous request. */
  ambiguity: string;
  failure: string;
  audit: string;
  /** Needs functional validation with the customer before being enabled for real users. */
  customerValidation?: string;
  /**
   * False = catalogued only. HIGH_RISK skills ARE executable since Phase 4, but only after an
   * explicit UI confirmation bound to a preview (never an LLM/text confirmation).
   */
  executable: boolean;
  /** Classic GUI screen that covers the same need (fallback, Prompt 4 §13). */
  classicScreen?: ClassicScreen;
  /** Starter phrases for the Assistant UI (Prompt 4 §5), answered by the same interpreters. */
  starters?: { withResident?: string; general?: string };
  /** Italian keywords used by the deterministic interpreter (Agno receives the description). */
  keywords: readonly RegExp[];
}

/** Workflow states (Prompt 3 §6). */
export type WorkflowStatus =
  | 'START'
  | 'CONTEXT_REQUIRED'
  | 'READY'
  | 'NEEDS_CLARIFICATION'
  | 'NEEDS_CONFIRMATION'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'DENIED'
  | 'FAILED'
  | 'CANCELLED';

export const TERMINAL_STATUSES: ReadonlySet<WorkflowStatus> = new Set([
  'COMPLETED',
  'DENIED',
  'FAILED',
  'CANCELLED',
]);

/** NavKey of the classic GUI (frontend/src/types.ts) + whether it needs the resident. */
export interface ClassicScreen {
  screen: string;
  label: string;
  needsResident?: boolean;
}

export interface PatientRef {
  id: string;
  label: string;
}

export interface WorkflowSlots {
  patient?: PatientRef;
  /** Raw patient reference typed by the user, kept until resolved. */
  patientQuery?: string;
  values?: Record<string, string>;
  text?: string;
  date?: string;
  query?: string;
  /** Instant of the request (ISO), fixed at preview time so a retry writes the same reading. */
  at?: string;
  /** Handover priority (default 'normale'; raised only by an explicit edit). */
  priority?: 'normale' | 'alta' | 'urgente';
  /** Selected pending administration (administration.record). */
  administration?: {
    therapyId: string;
    fascia: string;
    date: string;
    drugName: string;
    dosage: string;
    route: string;
    scheduledTime: string;
  };
  /** Pending administrations offered when there is more than one (administration.record). */
  administrationOptions?: Array<{
    therapyId: string;
    fascia: string;
    date: string;
    drugName: string;
    dosage: string;
    route: string;
    scheduledTime: string;
  }>;
  /** Prescription draft from diary.therapy_preview (therapy.prescribe). */
  therapyDraft?: { preview: Record<string, unknown>; entryDateTime: string };
  /** Therapy input confirmed by the professional (bound to the preview). */
  therapyInput?: Record<string, unknown>;
}

export interface WorkflowEvent {
  at: string;
  event: string;
  detail?: string;
}

export interface SkillPreview {
  /** Binds a confirmation to THIS preview: any change of payload issues a new id. */
  previewId: string;
  skillId: string;
  action: string;
  patient: PatientRef | null;
  /** What will be written, as shown to the user (labels → values). */
  values: Record<string, string>;
  notes: string[];
  origin: 'ai';
  tool: string;
  confirmationClass: ConfirmationClass;
  /** Who will be recorded as author/actor (server identity). */
  actor: { name: string; role: string };
  /** Things the user must read before confirming (never blocking by themselves). */
  warnings: string[];
  /** False → the UI must NOT show «Conferma» (missing data, conflicts): use the classic screen. */
  confirmable: boolean;
  blockedReason?: string;
  /** Fields «Modifica» may change. */
  editable: Array<'values' | 'text' | 'priority'>;
  /** Prescription: true when the values shown ARE the therapy payload that will be written. */
  therapyBound?: boolean;
  /** HIGH_RISK prescription: the draft the UI maps with the classic Terapia form mapper. */
  therapyDraft?: { preview: Record<string, unknown>; entryDateTime: string };
}

export interface WorkflowState {
  id: string;
  operatorId: string;
  /** Policy role when the workflow started (informative; every execution re-resolves it). */
  roleId: string;
  skillId: string;
  status: WorkflowStatus;
  slots: WorkflowSlots;
  /** Slot the workflow is waiting for, when status is NEEDS_CLARIFICATION / CONTEXT_REQUIRED. */
  pending: SkillSlot | null;
  /** Candidate targets when the reference is ambiguous. */
  candidates: PatientRef[];
  preview: SkillPreview | null;
  /** Stable id of the write, reused on retry so the service dedupes it (idempotency). */
  writeRequestId: string | null;
  result: unknown;
  error: { code: string; message: string } | null;
  interpreter: 'agno' | 'deterministic';
  /** Page resident when the workflow started: a different page resident invalidates it (§6). */
  contextPatientId: string | null;
  /** Optimistic concurrency: a save from a stale copy is refused (no lost update, no 2nd write). */
  version: number;
  turns: number;
  history: WorkflowEvent[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/** What the interpreter (Agno or deterministic) extracted from one user message. */
export interface Interpretation {
  source: 'agno' | 'deterministic';
  /** Skill chosen among the AVAILABLE ones (never outside the list given to the interpreter). */
  skillId: string | null;
  patientQuery?: string;
  /** "questo ospite" / "lui" → the page context patient. */
  currentPatient?: boolean;
  values?: Record<string, string>;
  text?: string;
  date?: string;
  query?: string;
  /** User is cancelling. Confirmation is NEVER taken from the interpreter (explicit act only). */
  cancel?: boolean;
}

export interface ConverseRequest {
  workflowId?: string;
  message?: string;
  action?: 'confirm' | 'cancel' | 'retry' | 'modify' | 'edit';
  /** Required with action 'confirm': the preview being confirmed. */
  previewId?: string;
  /** action 'edit' (after 'modify'): structured changes, no LLM involved. */
  edit?: { values?: Record<string, string>; text?: string; priority?: 'normale' | 'alta' | 'urgente' };
  /** action 'confirm' of a prescription: therapy input built by the UI with the Terapia mapper. */
  payload?: { therapy?: Record<string, unknown> };
  /**
   * Page context (UI). The id is re-verified by the Resident Access Scope; the label is display
   * only. `null` id = no resident open. Omitting `context` keeps the previous context.
   */
  context?: { currentPatientId?: string | null; currentPatientLabel?: string };
  /**
   * Phase 5: how the user produced `message` ('voice' = a reviewed STT transcript). Traceability
   * only (audit field `input:voice`): it never changes interpretation, policy or confirmation.
   */
  inputChannel?: 'text' | 'voice';
}

export interface ConverseResponse {
  workflowId: string | null;
  status: WorkflowStatus;
  skillId: string | null;
  reply: string;
  pending?: SkillSlot | null;
  candidates?: PatientRef[];
  preview?: SkillPreview | null;
  result?: unknown;
  error?: { code: string; message: string } | null;
  interpreter?: 'agno' | 'deterministic';
  /** Resident the workflow is bound to (server-verified). */
  resident?: PatientRef | null;
  /** Classic GUI screen to continue there (fallback). */
  classicScreen?: ClassicScreen & { patientId?: string };
  /** After «Modifica»: current editable values. */
  editable?: { values?: Record<string, string>; text?: string; priority?: string } | null;
  /** Skills the caller may use right now (only when no skill could be selected). */
  suggestions?: { id: string; name: string }[];
}
