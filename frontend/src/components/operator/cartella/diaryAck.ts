// «Presa visione» per lettore delle voci URGENTI del diario (UX direct-access, owner 2026-10-03).
// Regole pure (testabili): chi deve ancora vedere, testo «Visto da», conteggio «da vedere».
import { API_URL } from '../../../config';
import { facilityLocalMinute } from '../../../lib/facilityTime';
import { operatorHeaders } from '../../../lib/operatorSession';
import type { DiaryAcknowledgement, DiarioPazienteEntry } from '../../../types';

type AckEntry = Pick<
  DiarioPazienteEntry,
  'priority' | 'acknowledgeable' | 'acknowledgedByMe' | 'acknowledgements'
>;

/** Urgente e non ancora vista da CHI legge: mostra «Da vedere» + «Presa visione». */
export function needsMyAck(entry: AckEntry): boolean {
  return entry.acknowledgeable === true && entry.acknowledgedByMe !== true;
}

export function countToSee(entries: readonly AckEntry[]): number {
  return entries.filter(needsMyAck).length;
}

/** "08:12" se di oggi, altrimenti "02/10 08:12" (fuso della struttura). */
export function ackTime(iso: string, now: Date = new Date()): string {
  try {
    const local = facilityLocalMinute(new Date(iso));
    const today = facilityLocalMinute(now).slice(0, 10);
    const hm = local.slice(11, 16);
    return local.slice(0, 10) === today ? hm : `${local.slice(8, 10)}/${local.slice(5, 7)} ${hm}`;
  } catch {
    return '';
  }
}

/** "Visto da: Infermiere 1 08:12, tu 08:30" — sempre testo visibile, mai solo tooltip. */
export function seenByText(
  acks: readonly DiaryAcknowledgement[] | undefined,
  now: Date = new Date(),
): string | null {
  if (!acks || acks.length === 0) return null;
  return `Visto da: ${acks
    .map((a) => `${a.byMe ? 'te' : a.operatorName} ${ackTime(a.acknowledgedAt, now)}`.trim())
    .join(', ')}`;
}

export interface DiaryAckResponse {
  created: boolean;
  acknowledgeable: boolean;
  acknowledgedByMe: boolean;
  acknowledgements: DiaryAcknowledgement[];
}

export async function postDiaryAck(patientId: string, entryId: string): Promise<DiaryAckResponse> {
  const res = await fetch(
    `${API_URL}/patients/${encodeURIComponent(patientId)}/diary/${encodeURIComponent(entryId)}/ack`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', ...operatorHeaders() } },
  );
  if (!res.ok) {
    let message = 'Presa visione non registrata. Riprova.';
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim())
        message = `Presa visione non registrata: ${body.error.trim()}`;
    } catch {
      /* corpo non JSON */
    }
    throw new Error(message);
  }
  return (await res.json()) as DiaryAckResponse;
}
