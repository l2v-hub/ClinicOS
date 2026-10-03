import type { PatientIdentityData } from '../../patientIdentity';
import { PAPER_SCALES, type PaperScale } from './definitions';
import type {
  PaperAnswers,
  PaperCompletion,
  PaperMeasurements,
  PaperResult,
  PaperSnapshotItem,
} from './engine';

/** Types whose current formVersion uses the shared paper-form engine (mirror of the backend). */
export type PaperType = 'tinetti' | 'gds15' | 'mna' | 'barthel' | 'ucla_npi_sleep';
export const PAPER_TYPES = ['tinetti', 'gds15', 'mna', 'barthel', 'ucla_npi_sleep'] as const;
export const TINETTI_V2_VERSION = 'tinetti-it-2026-10-03-v2' as const;
export const GDS15_V2_VERSION = 'gds15-it-2026-10-03-v2' as const;
export const MNA_SF_VERSION = 'mna-sf-it-2026-10-03-v2' as const;
export const BARTHEL_VERSION = 'barthel-it-2026-10-03-v1' as const;
export const UCLA_NPI_SLEEP_VERSION = 'ucla-npi-sleep-it-2026-10-03-v1' as const;
export const PAPER_VERSIONS = {
  tinetti: TINETTI_V2_VERSION,
  gds15: GDS15_V2_VERSION,
  mna: MNA_SF_VERSION,
  barthel: BARTHEL_VERSION,
  ucla_npi_sleep: UCLA_NPI_SLEEP_VERSION,
} as const satisfies Record<PaperType, string>;
export type PaperVersion = (typeof PAPER_VERSIONS)[PaperType];

export const isPaperType = (type: unknown): type is PaperType =>
  (PAPER_TYPES as readonly unknown[]).includes(type);
/** The paper scale of a current paper version, or null for a legacy (v1) version. */
export function paperScaleFor(type: string, formVersion: string | undefined): PaperScale | null {
  if (!isPaperType(type) || PAPER_VERSIONS[type] !== formVersion) return null;
  return PAPER_SCALES.find((scale) => scale.type === type && scale.version === formVersion) ?? null;
}
export function currentPaperScale(type: PaperType): PaperScale {
  return paperScaleFor(type, PAPER_VERSIONS[type])!;
}

export interface PaperSnapshot {
  snapshotVersion: 1;
  layout: 'paper';
  patient: PatientIdentityData;
  author: { operatorId: string; name: string };
  form: { type: PaperType; version: PaperVersion; sourceSha256: string };
  assessedAt: string;
  createdAt: string;
  finalizedAt: string;
  items: PaperSnapshotItem[];
  measurements: PaperMeasurements | null;
  result: PaperResult;
  notes: string;
  predecessorId: string | null;
  predecessor: { id: string; assessedAt: string; authorName: string } | null;
  correctionReason: string | null;
}
export interface PaperHistoryItem {
  id: string;
  patientId: string;
  type: PaperType;
  formVersion: PaperVersion;
  layout: 'paper';
  status: 'draft' | 'final';
  version: number;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  author: { operatorId: string; name: string };
  answeredCount: number;
  completion: PaperCompletion;
  result: PaperResult | null;
  predecessorId: string | null;
  correctionReason: string | null;
  correctedById: string | null;
  pdf: {
    status: 'pending' | 'ready' | 'failed';
    documentId: string | null;
    errorCode: string | null;
    retryAvailable: boolean;
  } | null;
}
export type PaperAssessmentDto = PaperHistoryItem & {
  answers: PaperAnswers;
  finalSnapshot: PaperSnapshot | null;
  snapshotSha256: string | null;
};
export const isPaperRecord = <T extends { type: string; formVersion: string }>(
  record: T,
): record is Extract<T, { layout: 'paper' }> =>
  paperScaleFor(record.type, record.formVersion) !== null;
