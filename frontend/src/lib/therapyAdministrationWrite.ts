// Registrazione di una somministrazione dalla cartella del paziente: gli stessi endpoint del giro
// terapia (POST /therapy-slots/confirm e /not-administered). Operatore, farmaco, dose e ora sono
// risolti dal server sulla prescrizione; il client manda solo la chiave dello slot e, per la
// mancata somministrazione, motivo e nota.
import type { MotivoNonErogazione, TherapyActionInfo } from '../types';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { invalidateCachedGet } from './cachedFetch';

export type AdministrationOutcome =
  | { kind: 'administered' }
  | { kind: 'not_administered'; motivo: MotivoNonErogazione; note: string };

export type AdministrationWriteResult = { ok: true } | { ok: false; message: string };

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
  return `Registrazione non riuscita (errore ${res.status}). Riprova.`;
}

export async function recordAdministration(
  info: TherapyActionInfo,
  outcome: AdministrationOutcome,
): Promise<AdministrationWriteResult> {
  const path = outcome.kind === 'administered' ? 'confirm' : 'not-administered';
  try {
    const res = await fetch(`${API_URL}/therapy-slots/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...operatorHeaders() },
      body: JSON.stringify({
        patientId: info.patientId,
        therapyId: info.therapyId,
        farmacoNome: info.drugName,
        farmacoDose: info.dosage,
        farmacoVia: info.route,
        date: info.date,
        fascia: info.fascia,
        ora: info.ora,
        ...(outcome.kind === 'not_administered'
          ? { motivo: outcome.motivo, note: outcome.note }
          : {}),
      }),
    });
    if (!res.ok) return { ok: false, message: await administrationErrorMessage(res) };
    return { ok: true };
  } catch {
    return { ok: false, message: 'Errore di rete: la somministrazione non è stata registrata.' };
  } finally {
    invalidateCachedGet(`${API_URL}/therapy-slots`);
  }
}
