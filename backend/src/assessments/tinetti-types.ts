export const TINETTI_VERSION = 'tinetti-it-2026-09-22-v1' as const;
export const TINETTI_SOURCE_SHA256 =
  '7785059cceedc3ff85f051a60ff1cbdaa48145f03fb7f93ab7d53696ca6c8b09';
export const TINETTI_REFERENCE_SHA256 =
  'feca88c71bc7b6c9b53a812979f222e0769d688380673995277e8490db8c3ff6';
export const TINETTI_MAX_SCORE = {
  equilibrioSeduto: 1,
  alzarsi: 2,
  tentativiAlzarsi: 2,
  equilibrioImmediato: 2,
  equilibrioProlungato: 2,
  rombergSpinta: 2,
  occhiChiusi: 1,
  girarsi360Passi: 1,
  girarsi360Stabilita: 1,
  sedersi: 2,
  iniziazione: 1,
  lunghezzaPassoDx: 1,
  altezzaPassoDx: 1,
  lunghezzaPassoSx: 1,
  altezzaPassoSx: 1,
  simmetria: 1,
  continuita: 1,
  traiettoria: 2,
  tronco: 2,
  cammino: 1,
} as const;
export type TinettiItemId = keyof typeof TINETTI_MAX_SCORE;
export const TINETTI_KEYS = Object.keys(TINETTI_MAX_SCORE) as TinettiItemId[];
export type TinettiAnswers = {
  [K in TinettiItemId]: (typeof TINETTI_MAX_SCORE)[K] extends 1 ? 0 | 1 | null : 0 | 1 | 2 | null;
} & { notes: string };
export interface TinettiResult {
  balance: number;
  gait: number;
  total: number;
  riskBand: 'high' | 'moderate' | 'low';
  label: string;
}
export interface TinettiSnapshotItem {
  id: TinettiItemId;
  group: 'balance' | 'gait';
  label: string;
  score: 0 | 1 | 2;
  description: string;
}
