import type { TherapySlot } from '../types';
import { facilityLocalMinute } from './facilityTime';

export interface RitardoVoce {
  farmacoNome: string;
  scheduledTime: string;
  minutiRitardo: number;
}

export interface RitardoPaziente {
  patientId: string;
  nome: string;
  voci: RitardoVoce[];
}

export interface ScadenzaTerapia {
  id: string;
  patientId: string;
  nome: string;
  camera: string;
  letto: string;
  farmaco: string;
  dose: string;
  via: string;
  data: string;
  ora: string | null;
  /** Minuti civili rispetto all'orario di oggi; non una durata assoluta nei cambi DST. */
  minuti: number | null;
}

export function therapyCalendar(now: Date) {
  const local = facilityLocalMinute(now);
  const oggi = local.slice(0, 10);
  // Incremento del giorno civile, indipendente dal fuso del browser e dai cambi DST.
  const next = new Date(`${oggi}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    oggi,
    domani: next.toISOString().slice(0, 10),
    minuto: Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16)),
  };
}

export function therapyTime(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (!match || Number(match[1]) > 23) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const text = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value : fallback;

export function summarizeDashboardTherapies(
  today: TherapySlot[],
  tomorrow: TherapySlot[],
  now: Date,
) {
  const calendar = therapyCalendar(now);
  let totale = 0;
  let daFare = 0;
  let fatte = 0;
  let nonErogate = 0;
  const prossime: ScadenzaTerapia[] = [];
  const scadute: ScadenzaTerapia[] = [];
  const senzaOrario: ScadenzaTerapia[] = [];
  const seen = new Set<string>();

  for (const [dayOffset, slots] of [today, tomorrow].entries()) {
    const data = dayOffset === 0 ? calendar.oggi : calendar.domani;
    for (const slot of slots) {
      for (const patient of slot.patients) {
        for (const administration of patient.administrations) {
          const time = therapyTime(administration.scheduledTime);
          const id = JSON.stringify([
            data,
            patient.patientId,
            administration.therapyId,
            slot.fascia,
            time,
          ]);
          if (seen.has(id)) continue;
          seen.add(id);
          if (dayOffset === 0) {
            totale++;
            if (administration.status === 'administered') fatte++;
            else if (administration.status === 'not_administered') nonErogate++;
            else if (administration.status === 'pending') daFare++;
          }
          if (administration.status !== 'pending') continue;
          const ora =
            time === null
              ? null
              : `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
          const row: ScadenzaTerapia = {
            id,
            patientId: patient.patientId,
            nome: `${patient.lastName} ${patient.firstName}`.trim(),
            camera: patient.room,
            letto: patient.bed,
            farmaco: text(administration.drugName, 'Farmaco non indicato'),
            dose: text(
              administration.quantityLabel,
              text(administration.dosage, 'Dose non indicata'),
            ),
            via: text(administration.route, 'Via non indicata'),
            data,
            ora,
            minuti: time === null ? null : dayOffset * 1440 + time - calendar.minuto,
          };
          if (row.minuti === null) senzaOrario.push(row);
          else if (row.minuti < 0) scadute.push(row);
          else prossime.push(row);
        }
      }
    }
  }

  const order = (a: ScadenzaTerapia, b: ScadenzaTerapia) =>
    a.data.localeCompare(b.data) ||
    (a.ora ?? '').localeCompare(b.ora ?? '') ||
    a.nome.localeCompare(b.nome, 'it') ||
    a.id.localeCompare(b.id);
  prossime.sort(order);
  scadute.sort(order);
  senzaOrario.sort(order);
  const byPatient = new Map<string, RitardoPaziente>();
  for (const row of scadute) {
    const patient = byPatient.get(row.patientId) ?? {
      patientId: row.patientId,
      nome: row.nome,
      voci: [],
    };
    patient.voci.push({
      farmacoNome: row.farmaco,
      scheduledTime: row.ora!,
      minutiRitardo: -row.minuti!,
    });
    byPatient.set(row.patientId, patient);
  }
  const ritardi = [...byPatient.values()].sort(
    (a, b) => b.voci[0].minutiRitardo - a.voci[0].minutiRitardo,
  );
  return {
    totale,
    daFare,
    fatte,
    nonErogate,
    inRitardo: scadute.length,
    ritardi,
    prossime,
    scadute,
    senzaOrario,
    data: calendar.oggi,
  };
}

export type DashboardTherapySummary = ReturnType<typeof summarizeDashboardTherapies>;
