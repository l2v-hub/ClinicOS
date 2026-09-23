import { GDS15_VERSION, type Gds15Answers, type Gds15Result, type Gds15Snapshot } from './gds15Types';
import type { PatientIdentityData } from '../patientIdentity';
import {
  MNA_VERSION,
  type MnaAnswers,
  type MnaCompletion,
  type MnaExtent,
  type MnaResult,
  type MnaSnapshot,
  type MnaLocalInputs,
} from './mnaTypes';
import {
  TINETTI_VERSION,
  type TinettiAnswers,
  type TinettiResult,
  type TinettiSnapshotItem,
} from './tinettiTypes';
import {
  TRANSFERS_VERSION,
  type TransfersAnswers,
  type AssessmentCompletion,
  type TransferSection,
} from './transfersTypes';
export type AssessmentType = 'painad' | 'postural_transfers' | 'tinetti' | 'mna' | 'gds15';
export interface AssessmentTarget {
  id: string;
  type: AssessmentType;
}
export type AssessmentAnswers = PainadAnswers | TransfersAnswers | TinettiAnswers | MnaAnswers | Gds15Answers;
export const PAINAD_VERSION = 'painad-it-2026-09-22-v1' as const;
export const ASSESSMENT_VERSIONS = {
  painad: PAINAD_VERSION,
  postural_transfers: TRANSFERS_VERSION,
  tinetti: TINETTI_VERSION,
  mna: MNA_VERSION,
  gds15: GDS15_VERSION,
} as const;
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
export type TinettiHistoryItem = AssessmentHistoryBase & {
  type: 'tinetti';
  formVersion: typeof TINETTI_VERSION;
  answeredCount: number;
  completion: AssessmentCompletion;
  result: TinettiResult | null;
};
export type MnaHistoryItem = AssessmentHistoryBase & {
  type: 'mna';
  formVersion: typeof MNA_VERSION;
  extent: MnaExtent;
  answeredCount: number;
  completion: MnaCompletion;
  result: MnaResult;
};
export type Gds15HistoryItem = AssessmentHistoryBase & {
  type: 'gds15';
  formVersion: typeof GDS15_VERSION;
  answeredCount: number;
  completion: AssessmentCompletion;
  result: Gds15Result | null;
};
export type AssessmentHistoryItem =
  PainadHistoryItem | TransfersHistoryItem | TinettiHistoryItem | MnaHistoryItem | Gds15HistoryItem;
export interface TinettiSnapshot extends Omit<
  AssessmentSnapshot,
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
export type TinettiAssessmentDto = TinettiHistoryItem & {
  answers: TinettiAnswers;
  finalSnapshot: TinettiSnapshot | null;
  snapshotSha256: string | null;
};
export type MnaAssessmentDto = MnaHistoryItem & {
  answers: MnaAnswers;
  finalSnapshot: MnaSnapshot | null;
  snapshotSha256: string | null;
};
export type Gds15AssessmentDto = Gds15HistoryItem & {
  answers: Gds15Answers;
  finalSnapshot: Gds15Snapshot | null;
  snapshotSha256: string | null;
};
export type AssessmentDto =
  PainadAssessmentDto | TransfersAssessmentDto | TinettiAssessmentDto | MnaAssessmentDto | Gds15AssessmentDto;
export interface AssessmentPage {
  items: AssessmentHistoryItem[];
  pageInfo: { loadedCount: number; hasMore: boolean; nextCursor: string | null };
}
export interface AssessmentFields {
  assessedAtLocal: string;
  instantChoice: string;
  answers: AssessmentAnswers;
  correctionReason: string;
  mnaInputs?: MnaLocalInputs;
}
export interface AssessmentEditable {
  assessedAt: string;
  answers: AssessmentAnswers;
  correctionReason?: string;
}
export interface AssessmentCreate extends AssessmentEditable {
  requestId: string;
  type: AssessmentType;
  formVersion:
    typeof PAINAD_VERSION | typeof TRANSFERS_VERSION | typeof TINETTI_VERSION | typeof MNA_VERSION | typeof GDS15_VERSION;
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
