// Giro terapia: regole delle fasce (conteggi, fascia iniziale) e dei motivi di non somministrazione.
import type { MotivoNonErogazione, TherapySlot } from '../types';

export const MOTIVI: { value: MotivoNonErogazione; label: string }[] = [
  { value: 'rifiutata_paziente', label: 'Rifiutata dal paziente' },
  { value: 'paziente_assente', label: 'Paziente assente' },
  { value: 'sospesa_medico', label: 'Sospesa dal medico' },
  { value: 'farmaco_non_disponibile', label: 'Farmaco non disponibile' },
  { value: 'impossibilita_clinica', label: 'Impossibilità clinica' },
  { value: 'altro', label: 'Altro' },
];

/** Etichetta del motivo salvato; un testo libero o sconosciuto resta com'è. */
export function motivoLabel(reason: string | null): string | null {
  if (!reason) return null;
  return MOTIVI.find((m) => m.value === reason)?.label ?? reason;
}

/** Fatte = erogate + non erogate, dai totali esatti del server (non dai soli dettagli caricati). */
export function slotDone(slot: TherapySlot): number {
  return slot.summary.administered + slot.summary.notAdministered;
}

export function sortedSlots(slots: TherapySlot[]): TherapySlot[] {
  return [...slots].sort((a, b) => a.ora.localeCompare(b.ora));
}

/** Fascia iniziale: la prima con somministrazioni da fare, altrimenti la prima della giornata. */
export function initialSlotId(slots: TherapySlot[]): string | null {
  const ordered = sortedSlots(slots);
  return (ordered.find((s) => s.summary.pending > 0) ?? ordered[0])?.id ?? null;
}

/** Ora della somministrazione nell'orario della struttura (Roma). */
export function administeredTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  });
}
