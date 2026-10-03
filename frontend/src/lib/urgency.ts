// UX2 W8 (owner 2026-10-03): un solo modello di urgenza per diario e consegne.
// Qualcuno scrive velocemente; se segna «Urgente» la nota è segnalata finché il primo operatore
// diverso dall'autore dice «Ho capito». Da lì resta la traccia di lettura con autore e orario,
// ma non è più contata né segnalata come urgente da nessuna parte.
// Regole pure (testabili). Il backend è la fonte di verità (lib/urgency.ts lato server).
import { facilityLocalMinute } from './facilityTime';
import type { UrgencyView } from '../types';
export const URGENCY_ACKNOWLEDGED_EVENT = 'clinicos:urgency-acknowledged';

/** Runtime boundary shared by overview and acknowledgement responses. */
export function isUrgencyView(value: unknown): value is UrgencyView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const u = value as Record<string, unknown>;
  if (!['active', 'taken', 'none'].includes(String(u.state)) ||
      typeof u.isAuthor !== 'boolean' || typeof u.canAcknowledge !== 'boolean') return false;
  if (u.state !== 'active' && u.canAcknowledge) return false;
  if (u.state !== 'taken' && u.takenBy !== null) return false;
  if (u.takenBy === null) return true;
  if (!u.takenBy || typeof u.takenBy !== 'object' || Array.isArray(u.takenBy)) return false;
  const reader = u.takenBy as Record<string, unknown>;
  return ['operatorName', 'operatorRole', 'acknowledgedAt'].every((key) =>
    typeof reader[key] === 'string' && Boolean((reader[key] as string).trim())) &&
    typeof reader.byMe === 'boolean' && Number.isFinite(Date.parse(reader.acknowledgedAt as string));
}

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
 * - attiva: «Urgente» (per l'autore: in attesa della conferma di un collega)
 * - confermata: lettore, ruolo, orario e priorità originale
 * - chiusa col modello precedente: conferma di lettura non disponibile
 */
export function urgencyTraceText(
  u: UrgencyView | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!u || u.state === 'none') return null;
  if (u.state === 'active')
    return u.isAuthor ? 'Urgente · in attesa che un collega confermi la lettura' : 'Urgente';
  if (!u.takenBy) return 'Urgenza storica · conferma di lettura non disponibile';
  const who = u.takenBy.operatorName;
  const role = ROLE_LABEL[u.takenBy.operatorRole] ?? u.takenBy.operatorRole;
  const time = urgencyTime(u.takenBy.acknowledgedAt, now);
  return `Letta e compresa da ${who}${role ? ` (${role})` : ''}${time ? ` alle ${time}` : ''} · priorità originale: urgente`;
}

/** Older servers recorded personal reads; show their real history without turning
 * those records into a shared confirmation or removing an active alert. */
export function legacyReadTraces(records: unknown): string[] {
  if (!Array.isArray(records)) return [];
  return records.flatMap((record: unknown) => {
    if (!record || typeof record !== 'object') return [];
    const row = record as Record<string, unknown>;
    if (typeof row.operatorName !== 'string' || !row.operatorName.trim() ||
        typeof row.operatorRole !== 'string' ||
        typeof row.acknowledgedAt !== 'string' || !Number.isFinite(Date.parse(row.acknowledgedAt))) return [];
    const role = ROLE_LABEL[row.operatorRole] ?? row.operatorRole;
    return [`Letta da ${row.operatorName}${role ? ` (${role})` : ''} alle ${urgencyTime(row.acknowledgedAt)} · registrazione personale`];
  });
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
    let message = 'Conferma di lettura non registrata. Riprova.';
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) message = body.error.trim();
    } catch {
      /* corpo non JSON */
    }
    throw new Error(message);
  }
  const body: unknown = await res.json();
  if (!body || typeof body !== 'object' || !('urgency' in body) ||
      !isUrgencyView(body.urgency) || body.urgency.state !== 'taken' || !body.urgency.takenBy ||
      !('created' in body) || typeof body.created !== 'boolean') {
    throw new Error('Il server non ha restituito una conferma di lettura condivisa. Aggiorna la pagina.');
  }
  return body as UrgencyAckResponse;
}
