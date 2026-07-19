import type { AllergiaItem, AllergyStatus } from '../types';

// #244: a single, non-ambiguous state model for the allergy status shown across the app
// (patient summary quick-stat, riepilogo card, AllergiesEditor modal). Previously the
// summary derived its message/count solely from `cartella.allergie`, so the modal could
// say "Paziente nega allergie" while the background summary still said "Nessuna allergia
// segnalata" — two views of the same patient disagreeing about the same fact.
//
// State precedence (most concrete wins):
//   1. list has entries        -> count ("N allergie") regardless of the stored status
//      (a non-empty list is always the most concrete, trustworthy signal; also covers
//      legacy records written before `allergieStatus` existed).
//   2. status === 'assenti'      -> verified-absent, success tone.
//   3. status === 'paziente_nega' -> patient denies, info tone.
//   4. anything else (undefined status + empty list, or 'presenti' with an emptied list)
//      -> undocumented, warning tone.

export interface AllergySummary {
  label: string;
  badge: 'success' | 'info' | 'warning' | 'count';
  count: number;
}

export function deriveAllergySummary(
  list: AllergiaItem[] | undefined,
  status: AllergyStatus | undefined,
): AllergySummary {
  const items = list ?? [];

  if (items.length > 0) {
    return {
      label: `${items.length} allerg${items.length === 1 ? 'ia' : 'ie'}`,
      badge: 'count',
      count: items.length,
    };
  }

  if (status === 'assenti') {
    return { label: 'Allergie assenti (verificato)', badge: 'success', count: 0 };
  }

  if (status === 'paziente_nega') {
    return { label: 'Paziente nega allergie', badge: 'info', count: 0 };
  }

  return { label: 'Stato non documentato', badge: 'warning', count: 0 };
}

export interface CanSetStatusResult {
  ok: boolean;
  reason?: string;
}

// #244: 'assenti' and 'paziente_nega' assert there are NO allergies. Allowing either
// status while the detail list still has entries is exactly the contradictory state
// Codex flagged (modal shows "nega" while data proves otherwise). Block the transition
// at the source instead of persisting-then-warning.
export function canSetStatus(
  list: AllergiaItem[] | undefined,
  next: AllergyStatus,
): CanSetStatusResult {
  const items = list ?? [];
  if ((next === 'assenti' || next === 'paziente_nega') && items.length > 0) {
    return {
      ok: false,
      reason: 'Rimuovi prima le allergie registrate per impostare questo stato.',
    };
  }
  return { ok: true };
}
