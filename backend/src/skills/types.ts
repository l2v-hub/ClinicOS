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
  | 'query';

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
  /** HIGH_RISK skills are catalogued but never executed by the assistant (human control). */
  executable: boolean;
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
}

export interface WorkflowEvent {
  at: string;
  event: string;
  detail?: string;
}

export interface SkillPreview {
  skillId: string;
  action: string;
  patient: PatientRef | null;
  /** What will be written, as shown to the user (labels → values). */
  values: Record<string, string>;
  notes: string[];
  origin: 'ai';
  tool: string;
  confirmationClass: ConfirmationClass;
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
  action?: 'confirm' | 'cancel' | 'retry';
  /** Page context (UI). The id is re-verified through the Tool Layer; the label is display only. */
  context?: { currentPatientId?: string; currentPatientLabel?: string };
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
  /** Skills the caller may use right now (only when no skill could be selected). */
  suggestions?: { id: string; name: string }[];
}
