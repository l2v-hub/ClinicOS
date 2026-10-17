import type { ClinicalOverview, Operatore, ScheduleOperatore } from '../../types';
import { GIORNI_SETTIMANA } from '../../types';
import type { UnreadDiaryEntry } from '../../lib/diaryUnreadQueue';
import type { DashboardTherapySummary } from '../../lib/dashboardTherapies';
import { doseSignal, landingOf, type PatientLanding } from '../../lib/patientTargetResolver';
import type { PatientListEntry } from '../../lib/patientListView';
import { facilityLocalMinute } from '../../lib/facilityTime';
import { takeChargeRows, unreadName } from '../../lib/turnoUnread';

export interface AdminAttention {
  id: string;
  severity: 'critical' | 'attention' | 'scheduled';
  rank: number;
  openedAt: string | null;
  patientName: string | null;
  title: string;
  detail: string;
  action: string;
  target: { patientId: string; landing: PatientLanding } | { list: PatientListEntry };
}

/** The urgency queue is the same diary + handover read model as «Ho capito».
 * Counts from the legacy handover overview cannot describe this combined queue. */
export function buildAdminAttention({
  urgencies,
  therapies,
  clinical,
  anomalies = [],
}: {
  urgencies: readonly UnreadDiaryEntry[];
  therapies: DashboardTherapySummary | null;
  clinical: ClinicalOverview | null;
  anomalies?: Array<{ patientId: string; nome: string; farmacoNome: string; therapyId?: string }>;
}): AdminAttention[] {
  const rows: AdminAttention[] = takeChargeRows(urgencies).map((row) => ({
    id: `urgency:${row.id}`,
    severity: 'critical',
    rank: 0,
    openedAt: row.entryDateTime,
    patientName: unreadName(row),
    title: row.title || (row.sourceType === 'diary' ? 'Nota urgente' : 'Consegna urgente'),
    detail: `${row.authorName} · ${row.sourceType === 'diary' ? 'Diario' : 'Consegna'}`,
    action: 'Prendi in carico',
    target: {
      patientId: row.patientId,
      landing:
        row.sourceType === 'diary'
          ? { tab: 'diario', diaryEntryId: row.sourceId }
          : { tab: 'consegne', consegnaId: row.sourceId },
    },
  }));
  if (therapies) {
    for (const dose of [...therapies.scadute, ...therapies.senzaOrario, ...therapies.prossime]) {
      if (dose.data !== therapies.data) continue;
      const late = dose.minuti !== null && dose.minuti < 0;
      rows.push({
        id: `dose:${dose.id}`,
        severity: late ? 'critical' : dose.minuti === null ? 'attention' : 'scheduled',
        rank: late ? 1 : dose.minuti === null ? 2 : 3,
        openedAt: dose.ora ? `${dose.data}T${dose.ora}` : null,
        patientName: dose.nome,
        title: `${dose.farmaco} · ${dose.dose}`,
        detail: `${late ? 'Dose non registrata · in ritardo' : dose.ora ? 'Dose di oggi da registrare' : 'Dose di oggi senza orario'} · ${dose.via}${dose.ora ? ` · ${dose.ora}` : ''}`,
        action: 'Apri giro',
        target: { patientId: dose.patientId, landing: landingOf(doseSignal(dose)) },
      });
    }
  }
  // Overview has exact totals, but no patient/source identifiers. Its actions must open the
  // corresponding filtered list rather than inventing a patient or a missing observation.
  if (clinical?.critici)
    rows.push({
      id: 'clinical:critical',
      severity: 'critical',
      rank: 0,
      openedAt: null,
      patientName: null,
      title: `${clinical.critici} pazienti con parametri critici`,
      detail: 'Verifica i valori rilevati',
      action: 'Vedi pazienti',
      target: { list: { signal: 'critici' } },
    });
  if (clinical?.rischiAlti)
    rows.push({
      id: 'clinical:risk',
      severity: 'attention',
      rank: 2,
      openedAt: null,
      patientName: null,
      title: `${clinical.rischiAlti} pazienti con rischi alti o critici`,
      detail: 'Valuta i rischi documentati',
      action: 'Vedi pazienti',
      target: { list: { signal: 'rischi' } },
    });
  for (const anomaly of anomalies)
    rows.push({
      id: `anomaly:${JSON.stringify([anomaly.patientId, anomaly.farmacoNome])}`,
      severity: 'attention',
      rank: 2,
      openedAt: null,
      patientName: anomaly.nome,
      title: anomaly.farmacoNome,
      detail: 'Prescrizione da verificare',
      action: 'Verifica terapia',
      target: {
        patientId: anomaly.patientId,
        landing: landingOf({
          kind: 'drug-anomaly',
          patientId: anomaly.patientId,
          therapyId: anomaly.therapyId,
        }),
      },
    });
  return rows.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.openedAt ?? '\uffff').localeCompare(b.openedAt ?? '\uffff') ||
      a.id.localeCompare(b.id),
  );
}

/** Runtime boundary for the existing bounded weekly-schedules endpoint. */
export function parseAttentionSchedules(value: unknown): ScheduleOperatore[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('Orari non disponibili');
  const seen = new Set<string>();
  return value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Orari non disponibili');
    const row = raw as ScheduleOperatore;
    if (
      typeof row.id !== 'string' ||
      !row.id ||
      typeof row.operatoreId !== 'string' ||
      !row.operatoreId ||
      seen.has(row.operatoreId) ||
      typeof row.note !== 'string' ||
      !Array.isArray(row.turni) ||
      row.turni.length > 7
    )
      throw new Error('Orari non disponibili');
    seen.add(row.operatoreId);
    const days = new Set<string>();
    for (const shift of row.turni) {
      if (
        !shift ||
        !GIORNI_SETTIMANA.includes(shift.giorno) ||
        days.has(shift.giorno) ||
        typeof shift.disponibile !== 'boolean' ||
        !validTime(shift.oraInizio) ||
        !validTime(shift.oraFine)
      )
        throw new Error('Orari non disponibili');
      days.add(shift.giorno);
    }
    return row;
  });
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Actual configured local shifts, never «active account» masquerading as on-duty staff.
 * Overnight shifts include the previous civil day's tail. Equal start/end is not a 24h shift. */
export function operatorsOnDuty(
  operators: Operatore[],
  schedules: ScheduleOperatore[],
  now: Date,
): Operatore[] {
  const local = facilityLocalMinute(now);
  const civilDate = new Date(`${local.slice(0, 10)}T12:00:00Z`);
  const day = (civilDate.getUTCDay() + 6) % 7;
  const time = local.slice(11, 16);
  return operators.filter(
    (operator) =>
      operator.stato === 'attivo' &&
      schedules.some(
        (schedule) =>
          schedule.operatoreId === operator.id &&
          schedule.turni.some((shift) => {
            if (!shift.disponibile || !validTime(shift.oraInizio) || !validTime(shift.oraFine))
              return false;
            if (shift.oraInizio < shift.oraFine)
              return (
                shift.giorno === GIORNI_SETTIMANA[day] &&
                time >= shift.oraInizio &&
                time < shift.oraFine
              );
            if (shift.oraInizio > shift.oraFine)
              return (
                (shift.giorno === GIORNI_SETTIMANA[day] && time >= shift.oraInizio) ||
                (shift.giorno === GIORNI_SETTIMANA[(day + 6) % 7] && time < shift.oraFine)
              );
            return false;
          }),
      ),
  );
}
