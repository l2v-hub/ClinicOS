// Registrazione di una somministrazione dalla cartella del paziente: gli stessi endpoint del giro
// terapia (POST /therapy-slots/confirm e /not-administered) più la dose «al bisogno»
// (POST /therapy-slots/prn). Operatore, farmaco, dose e ora sono risolti dal server sulla
// prescrizione: il client manda solo la chiave dello slot (paziente, terapia, giorno, fascia) e,
// per la mancata somministrazione, motivo e nota; per la dose al bisogno l'indicazione.
// `confirmed` dice al server che l'operatore ha confermato esplicitamente (ruoli «con conferma»).
import type { MotivoNonErogazione, TherapyActionInfo } from '../types';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { invalidateCachedGet } from './cachedFetch';

export type AdministrationOutcome =
  | { kind: 'administered' }
  | { kind: 'not_administered'; motivo: MotivoNonErogazione; note: string };

export type AdministrationWriteResult = { ok: true } | { ok: false; message: string };

export interface AdministrationWriteOptions {
  /** L'operatore ha confermato nel dialogo (richiesto dal server per i ruoli «con conferma»). */
  confirmed?: boolean;
}

/** Messaggio del server quando c'è, altrimenti uno specifico per lo stato (mai solo «Errore»). */
export async function administrationErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  } catch {
    // corpo assente o non JSON: si usa il messaggio per stato
  }
  if (res.status === 403) return 'Il tuo ruolo non può registrare somministrazioni.';
  if (res.status === 404) return 'Terapia non trovata: ricarica il calendario.';
  if (res.status === 409) return 'Lo stato della somministrazione è cambiato: ricarica e riprova.';
  if (res.status === 428) return 'Serve una conferma esplicita prima di registrare.';
  return `Registrazione non riuscita (errore ${res.status}). Riprova.`;
}

type SlotKey = Pick<
  TherapyActionInfo,
  'patientId' | 'therapyId' | 'date' | 'fascia' | 'scheduledTime' | 'measuredGlucose'
>;

/** Corpo della richiesta: solo la chiave dello slot (nessun farmaco/dose/ora dal client). */
export function administrationBody(
  info: SlotKey,
  outcome: AdministrationOutcome,
  options: AdministrationWriteOptions = {},
): Record<string, unknown> {
  return {
    patientId: info.patientId,
    therapyId: info.therapyId,
    date: info.date,
    fascia: info.fascia,
    ...(info.scheduledTime !== undefined ? { scheduledTime: info.scheduledTime } : {}),
    ...(outcome.kind === 'administered' && info.measuredGlucose !== undefined
      ? { measuredGlucose: info.measuredGlucose }
      : {}),
    ...(outcome.kind === 'not_administered'
      ? { motivo: outcome.motivo, ...(outcome.note.trim() ? { note: outcome.note } : {}) }
      : {}),
    ...(options.confirmed ? { confirmed: true } : {}),
  };
}

export async function recordAdministration(
  info: SlotKey,
  outcome: AdministrationOutcome,
  options: AdministrationWriteOptions = {},
): Promise<AdministrationWriteResult> {
  const path = outcome.kind === 'administered' ? 'confirm' : 'not-administered';
  try {
    const res = await fetch(`${API_URL}/therapy-slots/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
      body: JSON.stringify(administrationBody(info, outcome, options)),
    });
    if (!res.ok) return { ok: false, message: await administrationErrorMessage(res) };
    return { ok: true };
  } catch {
    return { ok: false, message: 'Errore di rete: la somministrazione non è stata registrata.' };
  } finally {
    invalidateCachedGet(`${API_URL}/therapy-slots`);
  }
}

// ── Al bisogno (PRN) ─────────────────────────────────────────────────────────────────────────

export interface PrnAdministration {
  id: string;
  therapyId: string | null;
  patientId: string;
  drugName: string;
  dosage: string;
  route: string;
  date: string;
  administeredAt: string;
  administeredBy: string;
  indication: string;
  note: string | null;
}

export interface PrnRequest {
  patientId: string;
  therapyId: string;
  indicazione: string;
  note?: string;
  /** Chiave di idempotenza: lo stesso tocco ripetuto non registra una seconda dose. */
  requestId: string;
}

export type PrnWriteResult =
  { ok: true; record: PrnAdministration } | { ok: false; message: string };

export function prnBody(
  request: PrnRequest,
  options: AdministrationWriteOptions = {},
): Record<string, unknown> {
  return {
    patientId: request.patientId,
    therapyId: request.therapyId,
    indicazione: request.indicazione,
    ...(request.note?.trim() ? { note: request.note } : {}),
    requestId: request.requestId,
    ...(options.confirmed ? { confirmed: true } : {}),
  };
}

export async function recordPrnAdministration(
  request: PrnRequest,
  options: AdministrationWriteOptions = {},
): Promise<PrnWriteResult> {
  try {
    const res = await fetch(`${API_URL}/therapy-slots/prn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
      body: JSON.stringify(prnBody(request, options)),
    });
    if (!res.ok) return { ok: false, message: await administrationErrorMessage(res) };
    return { ok: true, record: (await res.json()) as PrnAdministration };
  } catch {
    return { ok: false, message: 'Errore di rete: la somministrazione non è stata registrata.' };
  }
}

/** Dosi al bisogno del paziente nel giorno (default: oggi della struttura), più recenti prima. */
export async function loadPrnAdministrations(
  patientId: string,
  date?: string,
  signal?: AbortSignal,
): Promise<PrnAdministration[]> {
  const query = new URLSearchParams({ patientId, ...(date ? { date } : {}) });
  const res = await fetch(`${API_URL}/therapy-slots/prn?${query}`, {
    headers: operatorHeaders(),
    cache: 'no-store',
    signal,
  });
  if (!res.ok) throw new Error(await administrationErrorMessage(res));
  const body = (await res.json()) as { items?: unknown };
  return Array.isArray(body.items) ? (body.items as PrnAdministration[]) : [];
}
