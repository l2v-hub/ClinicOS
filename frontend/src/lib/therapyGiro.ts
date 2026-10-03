// Giro terapia: regole delle fasce (conteggi, fascia iniziale) e dei motivi di non somministrazione.
import type {
  MotivoNonErogazione,
  TherapyAdministration,
  TherapySlot,
  TherapySlotPatient,
} from '../types';

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

// ── Giro per ora reale e per paziente ─────────────────────────────────────────────────────
// Le fasce del server (mattina 08, pranzo 12, …) raccolgono orari diversi: una terapia delle 07:00
// sta nella "mattina", una delle 18:00 nella "sera". Il giro si mostra per ora reale della
// prescrizione (scheduledTime) e, dentro ogni ora, per paziente con tutti i suoi farmaci. Ogni
// farmaco conserva la fascia del server, che resta la chiave per registrare la somministrazione.

export interface GiroItem {
  a: TherapyAdministration;
  /** Fascia del server della somministrazione (chiave di registrazione). */
  fascia: TherapySlot['fascia'];
}
export interface GiroPatient {
  patient: TherapySlotPatient;
  items: GiroItem[];
}
export interface GiroTime {
  ora: string;
  patients: GiroPatient[];
  total: number;
  administered: number;
  notAdministered: number;
  pending: number;
}

export function giroTimes(slots: TherapySlot[]): GiroTime[] {
  const byTime = new Map<string, GiroTime>();
  for (const slot of sortedSlots(slots)) {
    for (const patient of slot.patients) {
      for (const a of patient.administrations) {
        const ora = a.scheduledTime || slot.ora;
        let time = byTime.get(ora);
        if (!time) {
          time = { ora, patients: [], total: 0, administered: 0, notAdministered: 0, pending: 0 };
          byTime.set(ora, time);
        }
        // l'ordine dei pazienti è quello del giro (server); un paziente compare una volta per ora
        let group = time.patients.find((g) => g.patient.patientId === patient.patientId);
        if (!group) {
          group = { patient, items: [] };
          time.patients.push(group);
        }
        group.items.push({ a, fascia: slot.fascia });
        time.total += 1;
        if (a.status === 'administered') time.administered += 1;
        else if (a.status === 'not_administered') time.notAdministered += 1;
        else time.pending += 1;
      }
    }
  }
  return [...byTime.values()].sort((x, y) => x.ora.localeCompare(y.ora));
}

/** Fatte = erogate + non erogate (sulle somministrazioni caricate). */
export function giroTimeDone(time: GiroTime): number {
  return time.administered + time.notAdministered;
}

/** Ora iniziale: la prima con somministrazioni da fare, altrimenti la prima della giornata. */
export function initialGiroTime(times: GiroTime[]): string | null {
  return (times.find((t) => t.pending > 0) ?? times[0])?.ora ?? null;
}

/** Le somministrazioni di UN paziente a un'ora reale, dal giro del giorno (calendario in cartella). */
export function patientGiroTime(
  slots: TherapySlot[],
  patientId: string,
  ora: string,
): GiroTime | null {
  const own = slots.map((slot) => ({
    ...slot,
    patients: (slot.patients ?? []).filter((p) => p.patientId === patientId),
  }));
  return giroTimes(own).find((t) => t.ora === ora) ?? null;
}
