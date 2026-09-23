import type { PatientIdentityDto } from '../patients/operational-identity.js';

export const PAINAD_VERSION = 'painad-it-2026-09-22-v1' as const;
export const PAINAD_SOURCE_SHA256 =
  '2a3c3b2724ed7cc46aa09db715680b0d494a63b587898b45d61c8db8ec73abb1';
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
export interface PainadResult {
  total: number;
  band: 'none' | 'mild' | 'moderate' | 'severe';
  label: string;
}
export interface AssessmentSnapshot {
  snapshotVersion: 1;
  patient: PatientIdentityDto;
  author: { operatorId: string; name: string };
  form: { type: 'painad'; version: typeof PAINAD_VERSION; sourceSha256: string };
  assessedAt: string;
  createdAt: string;
  finalizedAt: string;
  items: Array<{ id: PainadItemId; label: string; score: PainadScore; description: string }>;
  result: PainadResult;
  interpretation: string;
  predecessorId: string | null;
  predecessor: { id: string; assessedAt: string; authorName: string } | null;
  correctionReason: string | null;
}
export interface AssessmentPdfDto {
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
  result: PainadResult | null;
  predecessorId: string | null;
  correctionReason: string | null;
  correctedById: string | null;
  pdf: AssessmentPdfDto | null;
}
export interface AssessmentDto extends AssessmentHistoryItem {
  answers: PainadAnswers;
  finalSnapshot: AssessmentSnapshot | null;
}
export interface AssessmentDocumentMeta {
  id: string;
  type: 'painad';
  formVersion: string;
  assessedAt: string;
}
export class AssessmentError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'assessment_invalid_input',
    public details?: { missingItems?: PainadItemId[]; currentVersion?: number },
  ) {
    super(message);
  }
}
