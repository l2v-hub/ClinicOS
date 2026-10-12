// «Da leggere» del Turno (#446): helper della coda unica di note e consegne senza conferma.
import type { PatientLanding } from './patientTargetResolver';
import { landingOf } from './patientTargetResolver';
import type { UnreadDiaryEntry, UnreadDiaryPage } from './diaryUnreadQueue';
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

/** Urgenze che CHI legge può prendere in carico, dalla stessa coda del badge. `atLeast` quando la
 *  coda ha altre pagine: il numero è un minimo e si dice. */
export function urgentToTakeCharge(page: UnreadDiaryPage | null) {
  const rows = (page?.entries ?? []).filter(
    (row) => row.priority === 'urgente' && canTakeCharge(row.urgency),
  );
  return { rows, atLeast: page?.hasMore === true };
}
