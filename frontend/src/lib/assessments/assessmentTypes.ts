import type { PatientIdentityData } from '../patientIdentity';
export const PAINAD_VERSION = 'painad-it-2026-09-22-v1' as const;
export const PAINAD_KEYS = [
  'respiration',
  'negativeVocalization',
  'facialExpression',
  'bodyLanguage',
  'consolability',
] as const;
export type PainadItemId = (typeof PAINAD_KEYS)[number];
export type PainadScore = 0 | 1 | 2;
export type PainadAnswers = Record<PainadItemId, PainadScore | null>;
export interface AssessmentResult {
  total: number;
  band: 'none' | 'mild' | 'moderate' | 'severe';
  label: string;
}
export interface AssessmentSnapshot {
  snapshotVersion: 1;
  patient: PatientIdentityData;
  author: { operatorId: string; name: string };
  form: { type: 'painad'; version: typeof PAINAD_VERSION; sourceSha256: string };
  assessedAt: string;
  createdAt: string;
  finalizedAt: string;
  items: Array<{ id: PainadItemId; label: string; score: PainadScore; description: string }>;
  result: AssessmentResult;
  interpretation: string;
  predecessor: { id: string; assessedAt: string; authorName: string } | null;
  predecessorId: string | null;
  correctionReason: string | null;
}
export interface AssessmentPdf {
  status: 'pending' | 'ready' | 'failed';
  documentId: string | null;
  errorCode: string | null;
  retryAvailable: boolean;
}
export interface AssessmentHistoryItem {
  id: string;
  patientId: string;
  type: 'painad';
  formVersion: typeof PAINAD_VERSION;
  status: 'draft' | 'final';
  version: number;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  author: { operatorId: string; name: string };
  answeredCount: number;
  result: AssessmentResult | null;
  predecessorId: string | null;
  correctionReason: string | null;
  correctedById: string | null;
  pdf: AssessmentPdf | null;
}
export interface AssessmentDto extends AssessmentHistoryItem {
  answers: PainadAnswers;
  finalSnapshot: AssessmentSnapshot | null;
}
export interface AssessmentPage {
  items: AssessmentHistoryItem[];
  pageInfo: { loadedCount: number; hasMore: boolean; nextCursor: string | null };
}
export interface AssessmentFields {
  assessedAtLocal: string;
  instantChoice: string;
  answers: PainadAnswers;
  correctionReason: string;
}
export interface AssessmentEditable {
  assessedAt: string;
  answers: PainadAnswers;
  correctionReason?: string;
}
export interface AssessmentCreate extends AssessmentEditable {
  requestId: string;
  type: 'painad';
  formVersion: typeof PAINAD_VERSION;
  predecessorId?: string;
}
export type AssessmentOperation =
  | { kind: 'create'; body: Readonly<AssessmentCreate> }
  | { kind: 'patch'; id: string; body: Readonly<AssessmentEditable & { expectedVersion: number }> }
  | {
      kind: 'finalize';
      id: string;
      body: Readonly<{ requestId: string; expectedVersion: number }>;
    };
export interface AssessmentFailure {
  code: string;
  message: string;
  uncertain: boolean;
}
export type AssessmentWriteResult =
  { kind: 'saved'; assessment: AssessmentDto } | { kind: 'failed'; failure: AssessmentFailure };
