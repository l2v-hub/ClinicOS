import type { PatientIdentityData } from '../patientIdentity';
export const GDS15_VERSION = 'gds15-it-2026-09-22-v1' as const;
export const GDS15_SOURCE_SHA256 =
  'f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709';
export const GDS15_KEYS = [
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
  'q9',
  'q10',
  'q11',
  'q12',
  'q13',
  'q14',
  'q15',
] as const;
export type Gds15ItemId = (typeof GDS15_KEYS)[number];
export type Gds15Answers = Record<Gds15ItemId, boolean | null> & { notes: string };
export interface Gds15Result {
  total: number;
  maximum: 15;
  band: 'none' | 'mild_moderate' | 'severe';
  label: string;
}
export interface Gds15SnapshotItem {
  id: Gds15ItemId;
  label: string;
  answer: boolean;
  score: 0 | 1;
  description: 'Sì' | 'No';
}
export interface Gds15Snapshot {
  snapshotVersion: 1;
  patient: PatientIdentityData;
  author: { operatorId: string; name: string };
  form: { type: 'gds15'; version: typeof GDS15_VERSION; sourceSha256: string };
  assessedAt: string;
  createdAt: string;
  finalizedAt: string;
  predecessor: { id: string; assessedAt: string; authorName: string } | null;
  predecessorId: string | null;
  correctionReason: string | null;
  instruction: string;
  items: Gds15SnapshotItem[];
  result: Gds15Result;
  notes: string;
  screeningNote: string;
  provenance: string;
  reference: string;
}
