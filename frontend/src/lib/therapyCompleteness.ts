import type { TherapyListSnapshot } from './patientTabSnapshots';
import type {
  CalendarOccurrence,
  PatientTherapyDay,
  UnscheduledMedication,
} from './patientTherapyCalendar';
import type { GiroTime } from './therapyGiro';

/** Old prefetch snapshots can contain only page one. Never display them as the complete plan. */
export function completeTherapySnapshot(
  snapshot: TherapyListSnapshot | undefined,
  patientId: string,
): TherapyListSnapshot | undefined {
  if (
    !snapshot?.summary ||
    snapshot.nextCursor !== null ||
    snapshot.therapies.length !== snapshot.summary.total ||
    snapshot.therapies.some((item) => item.patientId !== patientId) ||
    new Set(snapshot.therapies.map((item) => item.id)).size !== snapshot.therapies.length
  )
    return;
  const active = snapshot.therapies.filter((item) => item.stato === 'attiva').length;
  if (
    active !== snapshot.summary.active ||
    snapshot.therapies.length - active !== snapshot.summary.inactive
  )
    return;
  return snapshot;
}

/** Missing prescribed occurrences are read-only; never fabricate a server administration ID. */
export function uncoveredPrescriptions(
  events: CalendarOccurrence[],
  time: GiroTime | null,
  patientId: string,
): CalendarOccurrence[] {
  const represented = new Set(
    time?.patients
      .filter((group) => group.patient.patientId === patientId)
      .flatMap((group) =>
        group.items.map((item) => `${item.a.therapyId}|${item.a.scheduledTime || time.ora}`),
      ) ?? [],
  );
  return events.filter((event) => !represented.has(`${event.therapyId}|${event.time}`));
}

/** One PRN prescription per visible period, even when it applies to several days. */
export function asNeededForPeriod(days: PatientTherapyDay[]): UnscheduledMedication[] {
  return [
    ...new Map(
      days
        .flatMap((day) => day.unscheduled)
        .filter((item) => item.kind === 'as_needed')
        .map((item) => [item.therapyId, item]),
    ).values(),
  ];
}
