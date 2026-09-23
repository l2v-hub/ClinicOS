export const TRANSFERS_VERSION = 'transfers-it-2026-09-22-v1' as const;
export const TRANSFERS_SOURCE_SHA256 =
  '5d5c25cfc322b4f12a6eeba4ac2cf8d4476b15e95c9152cbe09889f0cc75d49f';
export type TransferMode =
  | 'independent'
  | 'one_operator'
  | 'two_operators'
  | 'one_operator_desk'
  | 'one_operator_axillary'
  | 'one_operator_rollator'
  | 'hoist_one_operator'
  | 'hoist_two_operators';
export const OWNED_AID_KEYS = [
  'wheelchair',
  'pressureReliefCushion',
  'oneForearmCrutch',
  'walkingStick',
  'quadCane',
  'twoForearmCrutches',
  'rollator',
  'axillaryWalker',
  'tableWalker',
] as const;
export const PLAIN_AID_KEYS = ['wheelchairRestraint', 'spinalBrace', 'kneeBrace'] as const;
export type OwnedAidKey = (typeof OWNED_AID_KEYS)[number];
export type PlainAidKey = (typeof PLAIN_AID_KEYS)[number];
export type AidKey = OwnedAidKey | PlainAidKey;
export interface OwnedAid {
  selected: boolean | null;
  ownership: 'personal' | 'facility' | null;
}
export interface PlainAid {
  selected: boolean | null;
}
export interface TransfersAnswers {
  context: {
    admissionDate: { status: 'known' | 'unavailable' | null; value: string | null };
    diagnosis: {
      status: 'provided' | 'unavailable' | null;
      text: string;
      unavailableReason: string;
    };
  };
  operatedLegLoad: {
    applicable: boolean | null;
    side: 'right' | 'left' | null;
    level: 'not_allowed' | 'touch_down' | 'full' | null;
  };
  walking: 'independent' | 'assisted' | 'not_possible' | null;
  transfers: {
    bedToWheelchair: TransferMode | null;
    wheelchairToBed: TransferMode | null;
    toilet: Exclude<TransferMode, 'hoist_one_operator' | 'hoist_two_operators'> | null;
  };
  hygiene: 'bed_bath' | 'shower' | null;
  painOnMovement: boolean | null;
  cognitiveDeterioration: 'none' | 'mild' | 'severe' | null;
  aids: Record<OwnedAidKey, OwnedAid> & Record<PlainAidKey, PlainAid>;
  notes: string;
}
export interface AssessmentCompletion {
  complete: boolean;
  missingPaths: string[];
}
export interface TransferSection {
  id: string;
  label: string;
  rows: Array<{ path: string; label: string; value: string }>;
}
