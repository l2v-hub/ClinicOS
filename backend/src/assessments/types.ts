import type { PatientIdentityDto } from '../patients/operational-identity.js';
import {
  TRANSFERS_VERSION,
  type TransfersAnswers,
  type AssessmentCompletion,
  type TransferSnapshotSection,
} from './transfers-types.js';
export * from './transfers-types.js';
import {
  TINETTI_VERSION,
  type TinettiAnswers,
  type TinettiResult,
  type TinettiSnapshotItem,
} from './tinetti-types.js';
export * from './tinetti-types.js';
import {
  MNA_VERSION,
  type MnaAnswers,
  type MnaCompletion,
  type MnaExtent,
  type MnaResult,
  type MnaSnapshot,
} from './mna-types.js';
export * from './mna-types.js';
import {
  GDS15_VERSION,
  type Gds15Answers,
  type Gds15Result,
  type Gds15SnapshotItem,
} from './gds15-types.js';
export * from './gds15-types.js';
export type AssessmentType = 'painad' | 'postural_transfers' | 'tinetti' | 'mna' | 'gds15';

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
export interface PainadSnapshot {
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
export interface TransfersSnapshot extends Omit<
  PainadSnapshot,
  'form' | 'items' | 'result' | 'interpretation'
> {
  form: { type: 'postural_transfers'; version: typeof TRANSFERS_VERSION; sourceSha256: string };
  sections: TransferSnapshotSection[];
  signatureLabels: ['Firma Fisioterapista', 'Firma Operatori'];
  result: null;
}
export interface TinettiSnapshot extends Omit<
  PainadSnapshot,
  'form' | 'items' | 'result' | 'interpretation'
> {
  form: {
    type: 'tinetti';
    version: typeof TINETTI_VERSION;
    sourceSha256: string;
    referenceSha256: string;
  };
  items: TinettiSnapshotItem[];
  result: TinettiResult;
  notes: string;
  provenance: string;
}
export interface Gds15Snapshot extends Omit<
  PainadSnapshot,
  'form' | 'items' | 'result' | 'interpretation'
> {
  form: { type: 'gds15'; version: typeof GDS15_VERSION; sourceSha256: string };
  instruction: string;
  items: Gds15SnapshotItem[];
  result: Gds15Result;
  notes: string;
  screeningNote: string;
  provenance: string;
  reference: string;
}
export type AssessmentSnapshot =
  PainadSnapshot | TransfersSnapshot | TinettiSnapshot | MnaSnapshot | Gds15Snapshot;
export interface AssessmentPdfDto {
  status: 'pending' | 'ready' | 'failed';
  documentId: string | null;
  errorCode: string | null;
  retryAvailable: boolean;
}
export interface PainadHistoryItem {
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
export interface PainadAssessmentDto extends PainadHistoryItem {
  answers: PainadAnswers;
  finalSnapshot: PainadSnapshot | null;
  snapshotSha256: string | null;
}
export interface TransfersHistoryItem extends Omit<
  PainadHistoryItem,
  'type' | 'formVersion' | 'answeredCount' | 'result'
> {
  type: 'postural_transfers';
  formVersion: typeof TRANSFERS_VERSION;
  completion: AssessmentCompletion;
  result: null;
}
export interface TransfersAssessmentDto extends TransfersHistoryItem {
  answers: TransfersAnswers;
  finalSnapshot: TransfersSnapshot | null;
  snapshotSha256: string | null;
}
export interface TinettiHistoryItem extends Omit<
  PainadHistoryItem,
  'type' | 'formVersion' | 'result'
> {
  type: 'tinetti';
  formVersion: typeof TINETTI_VERSION;
  completion: AssessmentCompletion;
  result: TinettiResult | null;
}
export interface TinettiAssessmentDto extends TinettiHistoryItem {
  answers: TinettiAnswers;
  finalSnapshot: TinettiSnapshot | null;
  snapshotSha256: string | null;
}
export interface MnaHistoryItem extends Omit<PainadHistoryItem, 'type' | 'formVersion' | 'result'> {
  type: 'mna';
  formVersion: typeof MNA_VERSION;
  extent: MnaExtent;
  completion: MnaCompletion;
  result: MnaResult;
}
export interface MnaAssessmentDto extends MnaHistoryItem {
  answers: MnaAnswers;
  finalSnapshot: MnaSnapshot | null;
  snapshotSha256: string | null;
}
export interface Gds15HistoryItem extends Omit<
  PainadHistoryItem,
  'type' | 'formVersion' | 'result'
> {
  type: 'gds15';
  formVersion: typeof GDS15_VERSION;
  completion: AssessmentCompletion;
  result: Gds15Result | null;
}
export interface Gds15AssessmentDto extends Gds15HistoryItem {
  answers: Gds15Answers;
  finalSnapshot: Gds15Snapshot | null;
  snapshotSha256: string | null;
}
export type AssessmentHistoryItem =
  PainadHistoryItem | TransfersHistoryItem | TinettiHistoryItem | MnaHistoryItem | Gds15HistoryItem;
export type AssessmentDto =
  | PainadAssessmentDto
  | TransfersAssessmentDto
  | TinettiAssessmentDto
  | MnaAssessmentDto
  | Gds15AssessmentDto;
export interface AssessmentDocumentMeta {
  id: string;
  type: AssessmentType;
  formVersion: string;
  assessedAt: string;
}
export class AssessmentError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'assessment_invalid_input',
    public details?: {
      missingItems?: PainadItemId[];
      missingPaths?: string[];
      currentVersion?: number;
    },
  ) {
    super(message);
  }
}
export const ATTESTATION_KINDS = [
  'physiotherapist_confirmation',
  'operator_acknowledgement',
] as const;
export type AttestationKind = (typeof ATTESTATION_KINDS)[number];
export interface AssessmentAttestationDto {
  id: string;
  assessmentId: string;
  snapshotSha256: string;
  kind: AttestationKind;
  actor: { operatorId: string; name: string; registeredQualification: string | null };
  createdAt: string;
}
export interface AssessmentAttestationPage {
  assessmentId: string;
  snapshotSha256: string;
  correctedById: string | null;
  items: AssessmentAttestationDto[];
  counts: Record<AttestationKind, number>;
  me: {
    registeredQualification: string | null;
    allowedKinds: AttestationKind[];
    attestedKinds: AttestationKind[];
  };
  pageInfo: { loadedCount: number; hasMore: boolean; nextCursor: string | null };
}
