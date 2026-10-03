// Stato di una dose in parole + tono (UX 2026-10-03, «informazione senza clic»): lo stesso testo in
// calendario del paziente, calendario di reparto, giro e Agenda. Mai solo colore: il tono serve al
// CSS, il testo è sempre presente. Il ritardo usa l'ora della struttura (Europe/Rome).
import type { TherapyAdministration, TherapySlot, TherapySlotPatient } from '../types';
import { facilityLocalMinute } from './facilityTime';
import { administeredTime, motivoLabel } from './therapyGiro';
import { patientIdentityName } from './patientIdentity';

export type DoseTone = 'due' | 'late' | 'done' | 'missed' | 'future';

export interface DoseStatus {
  tone: DoseTone;
  /** Testo completo: «Da somministrare», «In ritardo di 150 min», «Somministrata 08:12 da Rossi»… */
  text: string;
  /** Minuti di ritardo (solo dosi da somministrare oggi già scadute). */
  lateMinutes: number | null;
}

type DoseLike = Pick<
  TherapyAdministration,
  'status' | 'scheduledTime' | 'administeredAt' | 'administeredBy' | 'notAdministeredReason'
>;

function minutesOf(hm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Giorno e minuto correnti nella struttura. */
export function facilityNow(now: Date = new Date()): { date: string; minute: number } {
  const local = facilityLocalMinute(now);
  return { date: local.slice(0, 10), minute: minutesOf(local.slice(11, 16)) ?? 0 };
}

/** Minuti di ritardo di una dose da somministrare il giorno `date` all'ora `time` (null = non in ritardo). */
export function lateMinutes(date: string, time: string, now: Date = new Date()): number | null {
  const current = facilityNow(now);
  const scheduled = minutesOf(time);
  if (scheduled === null || date !== current.date) return null;
  const late = current.minute - scheduled;
  return late > 0 ? late : null;
}

export function doseStatus(dose: DoseLike, date: string, now: Date = new Date()): DoseStatus {
  if (dose.status === 'administered') {
    const at = administeredTime(dose.administeredAt);
    const parts = ['Somministrata'];
    if (at) parts.push(at);
    if (dose.administeredBy) parts.push(`da ${dose.administeredBy}`);
    return { tone: 'done', text: parts.join(' '), lateMinutes: null };
  }
  if (dose.status === 'not_administered') {
    const reason = motivoLabel(dose.notAdministeredReason);
    return {
      tone: 'missed',
      text: `Non somministrata${reason ? ` · ${reason}` : ''}`,
      lateMinutes: null,
    };
  }
  const current = facilityNow(now);
  if (date < current.date) {
    return { tone: 'late', text: 'Non registrata', lateMinutes: null };
  }
  const late = lateMinutes(date, dose.scheduledTime, now);
  if (late !== null) return { tone: 'late', text: `In ritardo di ${late} min`, lateMinutes: late };
  return {
    tone: date > current.date ? 'future' : 'due',
    text: 'Da somministrare',
    lateMinutes: null,
  };
}

const TONE_ORDER: Record<DoseTone, number> = { late: 0, due: 1, future: 2, missed: 3, done: 4 };

/** Una riga «paziente · farmaco · dose · stato» di una cella del calendario di reparto / Agenda. */
export interface CellDose {
  key: string;
  patientId: string;
  patientName: string;
  therapyId: string;
  drugName: string;
  dose: string;
  route: string;
  time: string;
  status: DoseStatus;
}

function doseLabel(a: TherapyAdministration): string {
  return a.quantityLabel || a.dosage;
}

/** Tutte le dosi di una fascia, in ritardo per prime, poi da somministrare, poi le registrate. */
export function slotDoses(slot: TherapySlot, date: string, now: Date = new Date()): CellDose[] {
  const rows: CellDose[] = [];
  for (const patient of slot.patients ?? []) {
    const name = patientName(patient);
    for (const a of patient.administrations) {
      rows.push({
        key: `${patient.patientId}|${a.therapyId}|${slot.fascia}`,
        patientId: patient.patientId,
        patientName: name,
        therapyId: a.therapyId,
        drugName: a.drugName,
        dose: doseLabel(a),
        route: a.route,
        time: a.scheduledTime || slot.ora,
        status: doseStatus({ ...a, scheduledTime: a.scheduledTime || slot.ora }, date, now),
      });
    }
  }
  return rows.sort(
    (x, y) =>
      TONE_ORDER[x.status.tone] - TONE_ORDER[y.status.tone] ||
      (y.status.lateMinutes ?? 0) - (x.status.lateMinutes ?? 0) ||
      x.time.localeCompare(y.time) ||
      x.patientName.localeCompare(y.patientName, 'it') ||
      x.drugName.localeCompare(y.drugName, 'it'),
  );
}

function patientName(p: TherapySlotPatient): string {
  return patientIdentityName({ ...p, id: p.patientId });
}
