export const TRANSFERS_VERSION = 'transfers-it-2026-09-22-v1' as const;
export const TRANSFERS_SOURCE_SHA256 =
  '5d5c25cfc322b4f12a6eeba4ac2cf8d4476b15e95c9152cbe09889f0cc75d49f';
export const TRANSFER_MODES = [
  'independent',
  'one_operator',
  'two_operators',
  'one_operator_desk',
  'one_operator_axillary',
  'one_operator_rollator',
  'hoist_one_operator',
  'hoist_two_operators',
] as const;
export type TransferMode = (typeof TRANSFER_MODES)[number];
export type ToiletTransferMode = Exclude<
  TransferMode,
  'hoist_one_operator' | 'hoist_two_operators'
>;
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
export const AID_KEYS = [
  'wheelchair',
  'pressureReliefCushion',
  'wheelchairRestraint',
  'oneForearmCrutch',
  'walkingStick',
  'quadCane',
  'twoForearmCrutches',
  'rollator',
  'axillaryWalker',
  'tableWalker',
  'spinalBrace',
  'kneeBrace',
] as const;
export type OwnedAid = { selected: boolean | null; ownership: 'personal' | 'facility' | null };
export type PlainAid = { selected: boolean | null };
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
    toilet: ToiletTransferMode | null;
  };
  hygiene: 'bed_bath' | 'shower' | null;
  painOnMovement: boolean | null;
  cognitiveDeterioration: 'none' | 'mild' | 'severe' | null;
  aids: Record<(typeof OWNED_AID_KEYS)[number], OwnedAid> &
    Record<(typeof PLAIN_AID_KEYS)[number], PlainAid>;
  notes: string;
}
export interface AssessmentCompletion {
  complete: boolean;
  missingPaths: string[];
}
export interface TransferSnapshotSection {
  id: 'context' | 'mobilization' | 'assistance' | 'aids' | 'notes';
  label: string;
  rows: Array<{ path: string; label: string; value: string }>;
}
