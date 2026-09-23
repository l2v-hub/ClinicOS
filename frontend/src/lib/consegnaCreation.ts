import type { Consegna, NewConsegnaInput } from '../types';
import { isCalendarDate } from './patientTherapyCalendar';

export type ConsegnaCreateRequest = NewConsegnaInput & { requestId: string };
export type ConsegnaCreateResult =
  | { kind: 'saved'; record: Consegna; requestId: string; replayed: boolean }
  | { kind: 'failed'; message: string; uncertain: boolean; code: string };
export type ConsegnaCreate = (request: ConsegnaCreateRequest) => Promise<ConsegnaCreateResult>;
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function createConsegnaRequest(input: NewConsegnaInput): ConsegnaCreateRequest {
  if (!validId(input.pazienteId)) throw new Error('Seleziona un paziente disponibile.');
  if (!input.note.trim() || input.note.trim().length > 4000)
    throw new Error('Inserisci una nota, massimo 4000 caratteri.');
  if (!input.tipo.trim() || input.tipo.trim().length > 100) throw new Error('Tipo non valido.');
  if (!['normale', 'alta', 'urgente'].includes(input.priorita))
    throw new Error('Priorità non valida.');
  if (!isCalendarDate(input.scadenza)) throw new Error('Data scadenza non valida.');
  if (input.oraScadenza && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.oraScadenza))
    throw new Error('Ora scadenza non valida.');
  if (input.operatoreAssegnatoId && !validId(input.operatoreAssegnatoId))
    throw new Error('Assegnatario non valido.');
  return Object.freeze({
    requestId: crypto.randomUUID(),
    pazienteId: input.pazienteId,
    priorita: input.priorita,
    tipo: input.tipo.trim(),
    note: input.note.trim(),
    scadenza: input.scadenza,
    ...(input.oraScadenza ? { oraScadenza: input.oraScadenza } : {}),
    operatoreAssegnatoId: input.operatoreAssegnatoId || null,
  });
}
const uncertain = (): ConsegnaCreateResult => ({
  kind: 'failed',
  uncertain: true,
  code: 'unverified',
  message: 'Esito non verificato. Riprova lo stesso salvataggio; la bozza è conservata.',
});

export async function createConsegna(
  apiUrl: string,
  request: ConsegnaCreateRequest,
  options: { headers: HeadersInit; fetcher?: typeof fetch },
): Promise<ConsegnaCreateResult> {
  try {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    const response = await (options.fetcher ?? fetch)(`${apiUrl}/consegne`, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify(request),
    });
    const value = (await response.json()) as Record<string, unknown>;
    if (response.ok) {
      if (
        !validId(value.id) ||
        value.requestId !== request.requestId ||
        value.pazienteId !== request.pazienteId ||
        typeof value.replayed !== 'boolean' ||
        !['aperta', 'in_corso', 'completata'].includes(String(value.stato)) ||
        typeof value.note !== 'string' ||
        typeof value.tipo !== 'string' ||
        (!value.replayed && value.stato !== 'aperta')
      )
        return uncertain();
      return {
        kind: 'saved',
        record: value as unknown as Consegna,
        requestId: request.requestId,
        replayed: value.replayed,
      };
    }
    const code = typeof value.code === 'string' ? value.code : '';
    if (response.status === 410 && code === 'consegna_creation_deleted') {
      if (
        value.requestId !== request.requestId ||
        value.pazienteId !== request.pazienteId ||
        !validId(value.consegnaId)
      )
        return uncertain();
      return {
        kind: 'failed',
        uncertain: false,
        code,
        message:
          'Questa consegna era stata salvata ed è stata eliminata. Bozza conservata; nessuna nuova consegna creata.',
      };
    }
    if (response.status === 409 && code === 'consegna_request_conflict')
      return {
        kind: 'failed',
        uncertain: false,
        code,
        message:
          'Richiesta già usata per dati diversi. Bozza conservata: verifica le consegne prima di creare una nuova richiesta.',
      };
    if (response.status === 404 || response.status === 403)
      return {
        kind: 'failed',
        uncertain: false,
        code: code || 'not_available',
        message: 'Paziente o consegna non disponibile nel tuo perimetro. Bozza conservata.',
      };
    if (response.status === 400)
      return {
        kind: 'failed',
        uncertain: false,
        code: 'validation',
        message: typeof value.error === 'string' ? value.error : 'Verifica i dati della consegna.',
      };
    return uncertain();
  } catch {
    return uncertain();
  }
}
