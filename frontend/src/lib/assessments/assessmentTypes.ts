import type { PatientIdentityData } from '../patientIdentity';
import {
  TRANSFERS_VERSION,
  type TransfersAnswers,
  type AssessmentCompletion,
  type TransferSection,
} from './transfersTypes';
export type AssessmentType = 'painad' | 'postural_transfers';
export interface AssessmentTarget {
  id: string;
  type: AssessmentType;
}
export type AssessmentAnswers = PainadAnswers | TransfersAnswers;
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
interface AssessmentHistoryBase {
  id: string;
  patientId: string;
  status: 'draft' | 'final';
  version: number;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  author: { operatorId: string; name: string };
  predecessorId: string | null;
  correctionReason: string | null;
  correctedById: string | null;
  pdf: AssessmentPdf | null;
}
export type PainadHistoryItem = AssessmentHistoryBase & {
  type: 'painad';
  formVersion: typeof PAINAD_VERSION;
  answeredCount: number;
  result: AssessmentResult | null;
};
export type TransfersHistoryItem = AssessmentHistoryBase & {
  type: 'postural_transfers';
  formVersion: typeof TRANSFERS_VERSION;
  completion: AssessmentCompletion;
  result: null;
};
export type AssessmentHistoryItem = PainadHistoryItem | TransfersHistoryItem;
export interface TransfersSnapshot extends Omit<
  AssessmentSnapshot,
  'form' | 'items' | 'result' | 'interpretation'
> {
  form: { type: 'postural_transfers'; version: typeof TRANSFERS_VERSION; sourceSha256: string };
  sections: TransferSection[];
  result: null;
  signatureLabels: string[];
}
export type PainadAssessmentDto = PainadHistoryItem & {
  answers: PainadAnswers;
  finalSnapshot: AssessmentSnapshot | null;
};
export type TransfersAssessmentDto = TransfersHistoryItem & {
  answers: TransfersAnswers;
  finalSnapshot: TransfersSnapshot | null;
  snapshotSha256: string | null;
};
export type AssessmentDto = PainadAssessmentDto | TransfersAssessmentDto;
export interface AssessmentPage {
  items: AssessmentHistoryItem[];
  pageInfo: { loadedCount: number; hasMore: boolean; nextCursor: string | null };
}
export interface AssessmentFields {
  assessedAtLocal: string;
  instantChoice: string;
  answers: AssessmentAnswers;
  correctionReason: string;
}
export interface AssessmentEditable {
  assessedAt: string;
  answers: AssessmentAnswers;
  correctionReason?: string;
}
export interface AssessmentCreate extends AssessmentEditable {
  requestId: string;
  type: AssessmentType;
  formVersion: typeof PAINAD_VERSION | typeof TRANSFERS_VERSION;
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
  missingPaths?: string[];
}
export type AssessmentWriteResult =
  { kind: 'saved'; assessment: AssessmentDto } | { kind: 'failed'; failure: AssessmentFailure };
