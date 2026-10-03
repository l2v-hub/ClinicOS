// UX2 W8 (owner 2026-10-03): un solo modello di urgenza per diario e consegne.
// Qualcuno scrive velocemente; se segna «Urgente» la nota è segnalata finché il primo operatore
// diverso dall'autore dice «Ho capito». Da lì resta la traccia («Urgenza presa in carico da …
// alle hh:mm») ma non è più contata né segnalata come urgente da nessuna parte.
// Regole pure (testabili). Il backend è la fonte di verità (lib/urgency.ts lato server).
import { facilityLocalMinute } from './facilityTime';
import type { UrgencyView } from '../types';

/** Urgenza ancora da prendere in carico (conta in badge, Turno, KPI, notifiche). */
export function isActiveUrgency(u: UrgencyView | null | undefined): boolean {
  return u?.state === 'active';
}

/** Chi legge può dire «Ho capito» adesso (mai l'autore). */
export function canTakeCharge(u: UrgencyView | null | undefined): boolean {
  return u?.state === 'active' && u.canAcknowledge === true && u.isAuthor !== true;
}

export function countActiveUrgencies(items: ReadonlyArray<{ urgency?: UrgencyView }>): number {
  return items.filter((item) => isActiveUrgency(item.urgency)).length;
}

/** Urgenze che CHI legge può prendere in carico (escluse le proprie). */
export function countToTakeCharge(items: ReadonlyArray<{ urgency?: UrgencyView }>): number {
  return items.filter((item) => canTakeCharge(item.urgency)).length;
}

/** "08:12" se di oggi, altrimenti "02/10 08:12" (fuso della struttura). */
export function urgencyTime(iso: string, now: Date = new Date()): string {
  try {
    const local = facilityLocalMinute(new Date(iso));
    const today = facilityLocalMinute(now).slice(0, 10);
    const hm = local.slice(11, 16);
    return local.slice(0, 10) === today ? hm : `${local.slice(8, 10)}/${local.slice(5, 7)} ${hm}`;
  } catch {
    return '';
  }
}

const ROLE_LABEL: Record<string, string> = {
  medico: 'medico',
  infermiere: 'infermiere',
  oss: 'OSS',
  fisioterapista: 'fisioterapista',
  operatore: 'operatore',
  altro: 'operatore',
};

/**
 * Testo sempre visibile (mai solo tooltip) dello stato dell'urgenza, o null se non urgente.
 * - attiva: «Urgente» (+ per l'autore: in attesa che un collega la prenda in carico)
 * - presa in carico: «Urgenza presa in carico da Medico 1 (medico) alle 08:12»
 * - chiusa col modello precedente: «Urgenza chiusa»
 */
export function urgencyTraceText(
  u: UrgencyView | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!u || u.state === 'none') return null;
  if (u.state === 'active')
    return u.isAuthor ? 'Urgente · in attesa che un collega la prenda in carico' : 'Urgente';
  if (!u.takenBy) return 'Urgenza chiusa';
  const who = u.takenBy.byMe ? 'te' : u.takenBy.operatorName;
  const role = u.takenBy.byMe ? '' : (ROLE_LABEL[u.takenBy.operatorRole] ?? u.takenBy.operatorRole);
  const time = urgencyTime(u.takenBy.acknowledgedAt, now);
  return `Urgenza presa in carico da ${who}${role ? ` (${role})` : ''}${time ? ` alle ${time}` : ''}`;
}

export interface UrgencyAckResponse {
  created: boolean;
  urgency: UrgencyView;
}

/** POST «Ho capito»: 201 presa in carico, 200 era già presa in carico; errori → messaggio chiaro. */
export async function postUrgencyAck(
  url: string,
  headers: HeadersInit,
  fetcher: typeof fetch = fetch,
): Promise<UrgencyAckResponse> {
  const res = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
  });
  if (!res.ok) {
    let message = 'Presa in carico non registrata. Riprova.';
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) message = body.error.trim();
    } catch {
      /* corpo non JSON */
    }
    throw new Error(message);
  }
  return (await res.json()) as UrgencyAckResponse;
}
