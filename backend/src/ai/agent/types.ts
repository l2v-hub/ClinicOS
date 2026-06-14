// ExtractionAgent: agent-native extraction (REQ-021).
//
// Instead of a fixed extract→merge pipeline, an agent operates in a loop with real
// tools (look up existing patients, read their cartella) and emits a single
// proposal that targets a NEW patient or an EXISTING one. Persistence stays
// deterministic + human-gated (review → transactional confirm).

import type { MergedProposal } from '../merge.js';

export interface TargetDecision {
  /** 'new' → create a patient; 'existing' → update an existing patient's cartella. */
  mode: 'new' | 'existing';
  patientId?: string;
  patientLabel?: string;
  medicalRecordNumber?: string;
  /** Why the agent chose this target (e.g. "match codice fiscale", "ri-ammissione"). */
  reason?: string;
}

/** What the agent submits via its submit_proposal tool (model-facing shape). */
export interface AgentProposalInput {
  mode: 'new' | 'existing';
  patientId?: string;
  reason?: string;
  patient: Record<string, string>; // nome, cognome, dataNascita, sesso, telefono, email, indirizzo, codiceFiscale...
  clinical?: {
    diagnosi?: Record<string, unknown>[];
    allergie?: Record<string, unknown>[];
    farmaci?: Record<string, unknown>[];
    terapie?: Record<string, unknown>[];
    parametriVitali?: Record<string, unknown>[];
    noteClinica?: Record<string, unknown>[];
  };
  /** Conflicts the agent surfaced across documents (never auto-resolved). */
  conflicts?: { path: string; candidates: { value: unknown; source?: string }[] }[];
}

/** Stored proposal: the review-UI shape (MergedProposal) plus the target decision. */
export type AgentProposal = MergedProposal & { _target: TargetDecision };

export interface AgentExtractionRequest {
  jobId: string;
  files: { id: string; filename: string; mimeType: string; data: Buffer }[];
  schema: unknown;
  prompt: string;
}

export interface AgentResult {
  model: string;
  /** Raw submitted proposal — validated + adapted by the caller. */
  input: AgentProposalInput;
  /** Tool calls the agent made, for audit (no clinical content). */
  toolTrace: string[];
}

export interface AgentExtractionProvider {
  readonly name: string;
  readonly model: string;
  /** Run the extraction agent loop; returns a validated, review-ready proposal. */
  run(request: AgentExtractionRequest): Promise<AgentResult>;
}

// ── Agent tool backend implementations (real, DB-backed) ─────────────────────
export interface ExistingPatientMatch {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
}
