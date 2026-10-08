import type {
  PatientTherapyAPI,
  TherapyAdministration,
  TherapyScheduleAPI,
  TherapySlot,
} from '../types';
import { computeEquivalent, formatFraction } from '../components/operator/cartella/therapyDose';
import { localIsoDate } from './appointmentRange';

export interface CalendarMedication {
  id: string;
  /** PatientTherapy id (chiave per lo stato della somministrazione e per il pannello del farmaco). */
  therapyId: string;
  drugName: string;
  dose: string;
  /** Equivalente in principio attivo della dose ("500 mg"), quando la prescrizione lo consente. */
  strength: string | null;
  route: string;
  prescriber: string | null;
  note: string | null;
  /** Ultimo giorno della prescrizione (null = senza fine). */
  endDate: string | null;
}
export interface CalendarOccurrence extends CalendarMedication {
  time: string;
  oneTime: boolean;
}
export interface UnscheduledMedication extends CalendarMedication {
  kind: 'as_needed' | 'incomplete';
  reason: string;
}
export interface PatientTherapyDay {
  events: CalendarOccurrence[];
  unscheduled: UnscheduledMedication[];
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.getUTCFullYear() >= 1900 &&
    date.toISOString().slice(0, 10) === value
  );
}

export function shiftCalendarDate(value: string, days: number): string {
  if (!isCalendarDate(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  const next = localIsoDate(new Date(year, month - 1, day + days, 12));
  return isCalendarDate(next) ? next : value;
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function scheduleDose(schedule: TherapyScheduleAPI): string {
  const { quantityNumerator: num, quantityDenominator: den, administrationUnit: unit } = schedule;
  if (
    !Number.isSafeInteger(num) ||
    !Number.isSafeInteger(den) ||
    num <= 0 ||
    den <= 0 ||
    !unit.trim()
  ) {
    return 'Dose da verificare';
  }
  return `${formatFraction(num, den)} ${unit}`;
}

function fasciaDescription(therapy: PatientTherapyAPI): string {
  const names = [
    therapy.fasceMattina && 'mattina',
    therapy.fascePranzo && 'pranzo',
    therapy.fascePomeriggio && 'pomeriggio',
    therapy.fasceSera && 'sera',
    therapy.fasceNotte && 'notte',
  ].filter(Boolean);
  return names.length
    ? `Fasce prescritte: ${names.join(', ')}. Orario non specificato.`
    : 'Orario non specificato.';
}

/** Prescription calendar only: administration records identify a fascia, not each dose. */
export function buildPatientTherapyDay(
  therapies: PatientTherapyAPI[],
  patientId: string,
  date: string,
): PatientTherapyDay {
  if (!isCalendarDate(date)) throw new Error('Data calendario non valida');
  const day: PatientTherapyDay = { events: [], unscheduled: [] };
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;

  for (const therapy of therapies) {
    if (therapy.patientId !== patientId || therapy.stato !== 'attiva') continue;
    const medication: CalendarMedication = {
      id: therapy.id,
      therapyId: therapy.id,
      drugName: therapy.farmacoNome,
      dose:
        therapy.doseMode === 'glucose_scale'
          ? 'Secondo schema glicemico'
          : therapy.dosaggio.trim() || 'Dose non indicata',
      strength: null,
      route: therapy.viaSomministrazione.trim() || 'Via non indicata',
      prescriber: therapy.prescrittore?.trim() || null,
      note: therapy.note?.trim() || null,
      endDate: therapy.tipo === 'una_tantum' ? null : therapy.dataFine,
    };
    const warn = (reason: string) =>
      day.unscheduled.push({ ...medication, kind: 'incomplete', reason });
    if (therapy.tipo === 'una_tantum') {
      if (!isCalendarDate(therapy.dataSomministrazione)) {
        warn('Data della somministrazione da verificare.');
        continue;
      }
      if (therapy.dataSomministrazione !== date) continue;
    } else {
      if (
        !isCalendarDate(therapy.dataInizio) ||
        (therapy.dataFine !== null && !isCalendarDate(therapy.dataFine)) ||
        (therapy.dataFine && therapy.dataFine < therapy.dataInizio)
      ) {
        warn('Date della prescrizione da verificare.');
        continue;
      }
      if (date < therapy.dataInizio || (therapy.dataFine && date > therapy.dataFine)) continue;
      if (therapy.tipo === 'periodica' && therapy.giorniSettimana?.trim()) {
        const weekdays = therapy.giorniSettimana.split(',').map((value) => value.trim());
        if (weekdays.some((value) => !/^[1-7]$/.test(value))) {
          warn('Giorni della prescrizione da verificare.');
          continue;
        }
        if (!weekdays.includes(String(weekday))) continue;
      }
    }
    if (therapy.tipo === 'al_bisogno') {
      day.unscheduled.push({
        ...medication,
        kind: 'as_needed',
        reason: 'Secondo le indicazioni della prescrizione, senza orario fisso.',
      });
      continue;
    }

    if (therapy.schedules?.length) {
      let invalidTime = false;
      therapy.schedules.forEach((schedule, index) => {
        if (!isTime(schedule.time)) {
          invalidTime = true;
          return;
        }
        day.events.push({
          ...medication,
          id: `${therapy.id}:schedule:${schedule.id}:${index}`,
          time: schedule.time,
          dose:
            therapy.doseMode === 'glucose_scale'
              ? 'Secondo schema glicemico'
              : scheduleDose(schedule),
          strength:
            therapy.doseMode === 'glucose_scale'
              ? null
              : computeEquivalent(
                  schedule.quantityNumerator,
                  schedule.quantityDenominator,
                  therapy.commercialStrengthValue,
                  therapy.commercialStrengthUnit,
                ),
          oneTime: therapy.tipo === 'una_tantum',
        });
      });
      if (invalidTime) warn('Uno o più orari da verificare; gli orari validi sono nel calendario.');
      continue;
    }

    const raw =
      therapy.tipo === 'una_tantum' ? therapy.orarioSomministrazione : therapy.orarioSpecifico;
    const times = raw?.trim() ? [...new Set(raw.split(',').map((time) => time.trim()))] : [];
    if (!times.length) {
      warn(fasciaDescription(therapy));
      continue;
    }
    for (const time of times.filter(isTime)) {
      day.events.push({
        ...medication,
        id: `${therapy.id}:legacy:${time}`,
        time,
        oneTime: therapy.tipo === 'una_tantum',
      });
    }
    if (times.some((time) => !isTime(time)))
      warn('Uno o più orari da verificare; gli orari validi sono nel calendario.');
  }
  day.events.sort(
    (a, b) =>
      a.time.localeCompare(b.time) ||
      a.drugName.localeCompare(b.drugName, 'it') ||
      a.id.localeCompare(b.id),
  );
  day.unscheduled.sort((a, b) => a.drugName.localeCompare(b.drugName, 'it'));
  return day;
}

// ── Stato delle dosi del paziente (join con il giro del giorno, GET /therapy-slots?date=) ──────

export interface CalendarDoseState {
  administration: TherapyAdministration;
  fascia: TherapySlot['fascia'];
}

/**
 * Indice dello stato delle dosi di un paziente in un giorno: per terapia+ora e, come ripiego per le
 * prescrizioni senza orari strutturati, per terapia quando ha una sola dose quel giorno.
 */
export function calendarDoseStates(slots: TherapySlot[], patientId: string) {
  const byTime = new Map<string, CalendarDoseState>();
  const byTherapy = new Map<string, CalendarDoseState[]>();
  for (const slot of slots) {
    for (const patient of slot.patients ?? []) {
      if (patient.patientId !== patientId) continue;
      for (const administration of patient.administrations) {
        const state = { administration, fascia: slot.fascia };
        byTime.set(
          `${administration.therapyId}|${administration.scheduledTime || slot.ora}`,
          state,
        );
        byTherapy.set(administration.therapyId, [
          ...(byTherapy.get(administration.therapyId) ?? []),
          state,
        ]);
      }
    }
  }
  return {
    get(therapyId: string, time: string): CalendarDoseState | null {
      const exact = byTime.get(`${therapyId}|${time}`);
      if (exact) return exact;
      const all = byTherapy.get(therapyId) ?? [];
      return all.length === 1 ? all[0] : null;
    },
  };
}

/** "fino al 10/10" per la riga dell'evento. */
export function formatEndDate(date: string | null): string | null {
  if (!date || !isCalendarDate(date)) return null;
  const [, month, day] = date.split('-');
  return `fino al ${day}/${month}`;
}
