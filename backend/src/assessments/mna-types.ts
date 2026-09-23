import type { PainadSnapshot } from './types.js';

export const MNA_VERSION = 'mna-it-2026-09-22-q-corrected-v1' as const;
export const MNA_SOURCE_SHA256 = '67964491d0ceb5c221e776079c3af2bc7c1ddbf834428997f1b5531e469c6ffa';
export const MNA_KEYS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
] as const;
export const MNA_MEASUREMENT_KEYS = [
  'weightKg',
  'heightCm',
  'armCircumferenceCm',
  'calfCircumferenceCm',
] as const;
export const MNA_K_KEYS = ['dairyDaily', 'eggsOrLegumesWeekly', 'meatFishOrPoultryDaily'] as const;
export type MnaItemId = (typeof MNA_KEYS)[number];
export type MnaMeasurementKey = (typeof MNA_MEASUREMENT_KEYS)[number];
export type MnaExtent = 'screening' | 'full';
export type AnthropometricAnswer<C extends string> =
  { method: 'category'; category: C | null } | { method: 'measured' };
export interface MnaAnswers {
  extent: MnaExtent;
  A: 'severe_reduction' | 'moderate_reduction' | 'no_reduction' | null;
  B: 'loss_over_3kg' | 'unknown' | 'loss_1_to_3kg' | 'no_loss' | null;
  C: 'bed_or_chair' | 'independent_at_home' | 'goes_out' | null;
  D: boolean | null;
  E: 'severe_dementia_or_depression' | 'moderate_dementia' | 'no_psychological_problems' | null;
  F: AnthropometricAnswer<'lt19' | 'gte19_lt21' | 'gte21_lt23' | 'gte23'>;
  G: boolean | null;
  H: boolean | null;
  I: boolean | null;
  J: 'one_meal' | 'two_meals' | 'three_meals' | null;
  K: {
    dairyDaily: boolean | null;
    eggsOrLegumesWeekly: boolean | null;
    meatFishOrPoultryDaily: boolean | null;
  };
  L: boolean | null;
  M: 'lt3_glasses' | '3_to_5_glasses' | 'gt5_glasses' | null;
  N: 'needs_assistance' | 'independent_with_difficulty' | 'independent_without_difficulty' | null;
  O: 'severe_malnutrition' | 'moderate_or_unknown' | 'no_nutritional_problems' | null;
  P: 'worse' | 'unknown' | 'same' | 'better' | null;
  Q: AnthropometricAnswer<'lt21' | '21_to_22' | 'gt22'>;
  R: AnthropometricAnswer<'lt31' | 'gte31'>;
  measurements: Record<MnaMeasurementKey, number | null>;
  measurementDates: Record<MnaMeasurementKey, string | null>;
  notes: string;
}
export interface MnaSectionCompletion {
  answeredCount: number;
  requiredCount: 6 | 12;
  complete: boolean;
  missingPaths: string[];
}
export interface MnaCompletion {
  complete: boolean;
  missingPaths: string[];
  screening: MnaSectionCompletion;
  global: MnaSectionCompletion;
}
export type MnaBand = 'malnourished' | 'at_risk' | 'normal';
export interface MnaResult {
  screening: { score: number; maximum: 14; band: MnaBand; label: string } | null;
  global: { score: number; maximum: 16 } | null;
  total: { score: number; maximum: 30; band: MnaBand; label: string } | null;
}
export interface MnaSnapshotItem {
  id: MnaItemId;
  group: 'screening' | 'global';
  label: string;
  answer: MnaAnswers[MnaItemId];
  score: number | null;
  description: string | null;
  subitems?: Array<{ id: (typeof MNA_K_KEYS)[number]; label: string; answer: boolean | null }>;
}
export interface MnaSnapshot extends Omit<
  PainadSnapshot,
  'form' | 'items' | 'result' | 'interpretation'
> {
  form: { type: 'mna'; version: typeof MNA_VERSION; sourceSha256: string };
  extent: MnaExtent;
  title: string;
  demographics: {
    sex: string | null;
    ageAtAssessment: number | null;
    ageOnDate: string;
    timeZone: 'Europe/Rome';
  };
  answers: MnaAnswers;
  completion: MnaCompletion;
  items: MnaSnapshotItem[];
  measurements: Array<{
    id: MnaMeasurementKey;
    label: string;
    value: number | null;
    unit: 'kg' | 'cm';
    measuredOn: string | null;
    source: 'manual_assessment';
  }>;
  bmi: number | null;
  result: MnaResult;
  notes: string;
  provenance: string;
  references: string[];
  copyright: string;
}
