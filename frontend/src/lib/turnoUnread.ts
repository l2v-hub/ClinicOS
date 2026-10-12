// «Da leggere» del Turno (#446): helper della coda unica di note e consegne senza conferma.
import type { PatientLanding } from './patientTargetResolver';
import { landingOf } from './patientTargetResolver';
import type { UnreadDiaryEntry } from './diaryUnreadQueue';
import { patientIdentityName } from './patientIdentity';
import { canTakeCharge } from './urgency';

export const TURNO_DA_LEGGERE_LIMIT = 5;

/** Dove «Apri» atterra: la consegna esatta, oppure il diario del paziente. */
export function unreadLanding(row: UnreadDiaryEntry): PatientLanding {
  return row.sourceType === 'consegna'
    ? landingOf({ kind: 'handover', patientId: row.patientId, consegnaId: row.sourceId })
    : { tab: 'diario' };
}

export const unreadName = (row: UnreadDiaryEntry) =>
  row.identity ? patientIdentityName(row.identity) : 'Identità non disponibile';

/** Urgenze che CHI legge può prendere in carico (mai le proprie: aspettano un collega). */
export function takeChargeRows(entries: readonly UnreadDiaryEntry[]): UnreadDiaryEntry[] {
  return entries.filter((row) => row.priority === 'urgente' && canTakeCharge(row.urgency));
}
