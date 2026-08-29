import type {
  TherapyAdministration,
  TherapySlot,
  TherapySlotPageResponse,
  TherapySlotPatient,
} from '../types';

const FASCE = new Set(['mattina', 'pranzo', 'pomeriggio', 'sera', 'notte']);

export function buildTherapySlotPageUrl(
  apiUrl: string,
  date: string,
  cursor?: string | null,
): string {
  const query = new URLSearchParams({ date, limit: '100' });
  if (cursor) query.set('cursor', cursor);
  return `${apiUrl}/therapy-slots/page?${query.toString()}`;
}

function finiteCount(value: unknown): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) throw new Error('invalid therapy summary');
  return count;
}

function parseAdministration(value: unknown): TherapyAdministration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid therapy administration');
  }
  const row = value as Record<string, unknown>;
  if (typeof row.therapyId !== 'string' || typeof row.drugName !== 'string') {
    throw new Error('invalid therapy administration identity');
  }
  if (!['pending', 'administered', 'not_administered'].includes(String(row.status))) {
    throw new Error('invalid therapy administration status');
  }
  return row as unknown as TherapyAdministration;
}

function parsePatient(value: unknown): TherapySlotPatient {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid therapy patient');
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.patientId !== 'string' ||
    typeof row.firstName !== 'string' ||
    typeof row.lastName !== 'string' ||
    !Array.isArray(row.administrations)
  ) {
    throw new Error('invalid therapy patient fields');
  }
  return {
    patientId: row.patientId,
    firstName: row.firstName,
    lastName: row.lastName,
    room: typeof row.room === 'string' ? row.room : 'Non assegnato',
    bed: typeof row.bed === 'string' ? row.bed : 'Non assegnato',
    administrations: row.administrations.map(parseAdministration),
  };
}

function parseSlot(value: unknown): TherapySlot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid therapy slot');
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.fascia !== 'string' ||
    !FASCE.has(row.fascia) ||
    typeof row.label !== 'string' ||
    typeof row.ora !== 'string' ||
    !row.summary ||
    typeof row.summary !== 'object' ||
    !Array.isArray(row.patients)
  ) {
    throw new Error('invalid therapy slot fields');
  }
  const summary = row.summary as Record<string, unknown>;
  return {
    id: row.id,
    fascia: row.fascia as TherapySlot['fascia'],
    label: row.label,
    ora: row.ora,
    summary: {
      total: finiteCount(summary.total),
      administered: finiteCount(summary.administered),
      notAdministered: finiteCount(summary.notAdministered),
      pending: finiteCount(summary.pending),
    },
    patients: row.patients.map(parsePatient),
  };
}

export function parseTherapySlotPage(value: unknown): TherapySlotPageResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid therapy page');
  }
  const page = value as Record<string, unknown>;
  const info = page.pageInfo as Record<string, unknown> | undefined;
  if (
    !Array.isArray(page.slots) ||
    !info ||
    typeof info.hasMore !== 'boolean' ||
    typeof info.summaryExact !== 'boolean' ||
    (info.nextCursor !== null && typeof info.nextCursor !== 'string') ||
    !['partial', 'complete'].includes(String(info.completeness))
  ) {
    throw new Error('invalid therapy page contract');
  }
  const loadedTherapies = finiteCount(info.loadedTherapies);
  if (info.hasMore && !info.nextCursor) throw new Error('missing therapy page cursor');
  return {
    slots: page.slots.map(parseSlot),
    pageInfo: {
      hasMore: info.hasMore,
      nextCursor: info.nextCursor as string | null,
      loadedTherapies,
      completeness: info.completeness as 'partial' | 'complete',
      summaryExact: info.summaryExact,
    },
  };
}

export function mergeTherapySlotPages(
  current: TherapySlot[],
  incoming: TherapySlot[],
  replaceSummary = false,
): TherapySlot[] {
  const slots = new Map(current.map((slot) => [slot.id, slot]));
  for (const next of incoming) {
    const previous = slots.get(next.id);
    if (!previous) {
      slots.set(next.id, next);
      continue;
    }
    const patients = new Map(previous.patients.map((patient) => [patient.patientId, patient]));
    for (const nextPatient of next.patients) {
      const previousPatient = patients.get(nextPatient.patientId);
      if (!previousPatient) {
        patients.set(nextPatient.patientId, nextPatient);
        continue;
      }
      const administrations = new Map(
        previousPatient.administrations.map((row) => [row.therapyId, row]),
      );
      for (const administration of nextPatient.administrations) {
        administrations.set(administration.therapyId, administration);
      }
      patients.set(nextPatient.patientId, {
        ...nextPatient,
        administrations: [...administrations.values()],
      });
    }
    const previousHasDetails = previous.patients.some((patient) => patient.administrations.length);
    const nextHasDetails = next.patients.some((patient) => patient.administrations.length);
    slots.set(next.id, {
      ...next,
      summary: replaceSummary ? next.summary : previous.summary,
      ora:
        previousHasDetails && nextHasDetails
          ? [previous.ora, next.ora].sort()[0]!
          : nextHasDetails
            ? next.ora
            : previous.ora,
      patients: [...patients.values()],
    });
  }
  return [...slots.values()];
}
