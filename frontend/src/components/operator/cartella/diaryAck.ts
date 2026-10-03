// UX2 W8 (owner 2026-10-03): «Ho capito» sulle voci URGENTI del diario. Il primo operatore diverso
// dall'autore prende in carico l'urgenza per tutti; resta la traccia. Regole in lib/urgency.ts.
import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import {
  canTakeCharge,
  countToTakeCharge,
  postUrgencyAck,
  type UrgencyAckResponse,
} from '../../../lib/urgency';
import type { DiarioPazienteEntry } from '../../../types';

type AckEntry = Pick<DiarioPazienteEntry, 'urgency'>;

/** Urgente attiva e CHI legge (non l'autore) può prenderla in carico: mostra «Ho capito». */
export function needsMyAck(entry: AckEntry): boolean {
  return canTakeCharge(entry.urgency);
}

export function countToSee(entries: readonly AckEntry[]): number {
  return countToTakeCharge(entries);
}

export function postDiaryAck(patientId: string, entryId: string): Promise<UrgencyAckResponse> {
  return postUrgencyAck(
    `${API_URL}/patients/${encodeURIComponent(patientId)}/diary/${encodeURIComponent(entryId)}/ack`,
    operatorHeaders(),
  );
}
