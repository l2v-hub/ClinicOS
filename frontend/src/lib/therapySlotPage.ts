import type {
  TherapyAdministration,
  TherapyRecordedOutcome,
  TherapyReadGroup,
  TherapyVerificationGroup,
  TherapySlot,
  TherapySlotPageResponse,
  TherapySlotPatient,
} from '../types';
import { parsePatientLocation } from './patientIdentity';
import { parseTemporaryPsExit } from './temporaryPsExit';
import { parseRosterMetadata, rosterQuery, type RosterPageOptions } from './rosterOrder';

const FASCE = new Set(['mattina', 'pranzo', 'pomeriggio', 'sera', 'notte']);

export function buildTherapySlotPageUrl(
  apiUrl: string,
  date: string,
  cursor?: string | null,
  order: RosterPageOptions = {},
): string {
  const query = new URLSearchParams({ date, limit: '100' });
  Object.entries(rosterQuery(order)).forEach(([key, value]) => query.set(key, value));
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
  if (
    row.temporaryPsExitUnverified !== undefined &&
    typeof row.temporaryPsExitUnverified !== 'boolean'
  ) {
    throw new Error('invalid temporary PS-exit verification state');
  }
  if (row.temporaryPsExitUnverified === true && row.temporaryPsExit !== null) {
    throw new Error('unverified temporary PS exit must not carry a decision');
  }
  return {
    patientId: row.patientId,
    firstName: row.firstName,
    lastName: row.lastName,
    codiceFiscale: typeof row.codiceFiscale === 'string' ? row.codiceFiscale : null,
    dateOfBirth: typeof row.dateOfBirth === 'string' ? row.dateOfBirth : null,
    location: parsePatientLocation(row.location),
    room: typeof row.room === 'string' ? row.room : 'Non assegnato',
    bed: typeof row.bed === 'string' ? row.bed : 'Non assegnato',
    administrations: row.administrations.map(parseAdministration),
    temporaryPsExit: parseTemporaryPsExit(row.temporaryPsExit),
    ...(row.temporaryPsExitUnverified === undefined
      ? {}
      : { temporaryPsExitUnverified: row.temporaryPsExitUnverified }),
  };
}

function parseSlot(value: unknown): TherapyReadGroup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid therapy slot');
  }
  const row = value as Record<string, unknown>;
  if (row.kind === 'verification') return parseVerificationGroup(row);
  if (row.kind !== undefined && row.kind !== 'scheduled')
    throw new Error('invalid therapy group kind');
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

function parseRecordedOutcome(
  value: unknown,
  therapyId: string,
  patientId: string,
  date: string,
): TherapyRecordedOutcome | null {
  // Older responses omit metadata: absence never implies an administered dose.
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid recorded outcome');
  const record = value as Record<string, unknown>;
  const keys = [
    'administrationId',
    'therapyId',
    'patientId',
    'date',
    'status',
    'recordedAt',
    'recordedBy',
    'notAdministeredReason',
  ];
  if (
    Object.keys(record).length !== keys.length ||
    Object.keys(record).some((key) => !keys.includes(key)) ||
    typeof record.administrationId !== 'string' ||
    !record.administrationId.trim() ||
    record.therapyId !== therapyId ||
    record.patientId !== patientId ||
    record.date !== date ||
    (record.status !== 'administered' && record.status !== 'not_administered') ||
    !(
      record.recordedAt === null ||
      (typeof record.recordedAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.recordedAt) &&
        Number.isFinite(Date.parse(record.recordedAt)) &&
        new Date(record.recordedAt).toISOString() === record.recordedAt)
    ) ||
    !(record.recordedBy === null || typeof record.recordedBy === 'string') ||
    !(record.notAdministeredReason === null || typeof record.notAdministeredReason === 'string') ||
    (record.status === 'administered' && record.notAdministeredReason !== null)
  )
    throw new Error('inconsistent recorded outcome');
  return record as unknown as TherapyRecordedOutcome;
}

function parseVerificationGroup(row: Record<string, unknown>): TherapyVerificationGroup {
  const summary = row.summary as Record<string, unknown> | undefined;
  if (
    row.id !== 'therapy-verification' ||
    row.label !== 'Da verificare' ||
    typeof row.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
    !Number.isFinite(Date.parse(`${row.date}T12:00:00Z`)) ||
    new Date(`${row.date}T12:00:00Z`).toISOString().slice(0, 10) !== row.date ||
    row.fascia !== null ||
    row.ora !== null ||
    !summary ||
    !Array.isArray(row.patients)
  )
    throw new Error('invalid therapy verification group');
  const total = finiteCount(summary.total);
  if (finiteCount(summary.verification) !== total || 'pending' in summary)
    throw new Error('invalid therapy verification summary');
  const outcomeSummary = ['administered', 'notAdministered', 'unrecorded'];
  const hasOutcomeSummary = outcomeSummary.some((key) => key in summary);
  if (
    hasOutcomeSummary &&
    (outcomeSummary.some(
      (key) =>
        typeof summary[key] !== 'number' ||
        !Number.isSafeInteger(summary[key]) ||
        Number(summary[key]) < 0,
    ) ||
      outcomeSummary.reduce((sum, key) => sum + Number(summary[key]), 0) !== total)
  )
    throw new Error('invalid recorded outcome summary');
  const identities = new Set<string>();
  const loaded = { administered: 0, notAdministered: 0, unrecorded: 0 };
  const patients = row.patients.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('invalid verification patient');
    const patient = value as Record<string, unknown>;
    if (
      typeof patient.patientId !== 'string' ||
      !patient.patientId.trim() ||
      !Array.isArray(patient.items) ||
      'administrations' in patient
    )
      throw new Error('invalid verification items');
    const { administrations: _ignored, ...identity } = parsePatient({
      ...patient,
      administrations: [],
    });
    const items = patient.items.map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('invalid verification item');
      const item = raw as Record<string, unknown>;
      if (
        typeof item.therapyId !== 'string' ||
        !item.therapyId ||
        typeof item.drugName !== 'string' ||
        item.status !== 'to_verify' ||
        !['missing_time', 'invalid_time', 'conflicting_schedule'].includes(String(item.reason)) ||
        item.scheduledTime !== null ||
        item.quantityLabel !== null ||
        item.dosage !== null ||
        item.canAdminister !== false ||
        ('fascia' in item && item.fascia !== null)
      )
        throw new Error('invalid verification item fields');
      const allowedKeys = [
        'therapyId',
        'drugName',
        'status',
        'reason',
        'scheduledTime',
        'quantityLabel',
        'dosage',
        'canAdminister',
        'fascia',
        'recordedOutcome',
      ];
      if (Object.keys(item).some((key) => !allowedKeys.includes(key)))
        throw new Error('unknown verification metadata');
      const recordedOutcome = parseRecordedOutcome(
        item.recordedOutcome,
        item.therapyId,
        identity.patientId,
        row.date as string,
      );
      loaded[
        recordedOutcome?.status === 'administered'
          ? 'administered'
          : recordedOutcome?.status === 'not_administered'
            ? 'notAdministered'
            : 'unrecorded'
      ]++;
      const key = item.therapyId;
      if (identities.has(key)) throw new Error('duplicate verification item');
      identities.add(key);
      return {
        ...item,
        recordedOutcome,
      } as unknown as TherapyVerificationGroup['patients'][number]['items'][number];
    });
    return { ...identity, items };
  });
  if (identities.size > total) throw new Error('invalid verification total');
  if (
    hasOutcomeSummary &&
    outcomeSummary.some((key) => loaded[key as keyof typeof loaded] > Number(summary[key]))
  )
    throw new Error('recorded outcome exceeds summary');
  return {
    kind: 'verification',
    id: 'therapy-verification',
    date: row.date,
    label: 'Da verificare',
    fascia: null,
    ora: null,
    summary: {
      total,
      verification: total,
      ...(hasOutcomeSummary
        ? {
            administered: Number(summary.administered),
            notAdministered: Number(summary.notAdministered),
            unrecorded: Number(summary.unrecorded),
          }
        : {}),
    },
    patients,
  };
}

/** Complete legacy response: malformed data must never look like an empty clinical agenda. */
export function parseTherapySlots(value: unknown): TherapyReadGroup[] {
  if (!Array.isArray(value)) throw new Error('invalid therapy slots');
  return value.map(parseSlot);
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
    roster: parseRosterMetadata(page.roster),
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
  current: TherapyReadGroup[],
  incoming: TherapyReadGroup[],
  replaceSummary = false,
): TherapyReadGroup[] {
  const slots = new Map(current.map((slot) => [slot.id, slot]));
  for (const next of incoming) {
    const previous = slots.get(next.id);
    if (!previous) {
      slots.set(next.id, next);
      continue;
    }
    if (next.kind === 'verification' || previous.kind === 'verification') {
      if (
        next.kind !== 'verification' ||
        previous.kind !== 'verification' ||
        next.date !== previous.date
      )
        throw new Error('therapy group identity changed');
      const owners = new Map(
        previous.patients.flatMap((patient) =>
          patient.items.map((item) => [item.therapyId, patient.patientId] as const),
        ),
      );
      const patients = new Map(previous.patients.map((patient) => [patient.patientId, patient]));
      for (const patient of next.patients) {
        for (const item of patient.items) {
          if (owners.has(item.therapyId) && owners.get(item.therapyId) !== patient.patientId)
            throw new Error('verification therapy patient changed');
          owners.set(item.therapyId, patient.patientId);
        }
        const items = new Map(
          (patients.get(patient.patientId)?.items ?? []).map((item) => [item.therapyId, item]),
        );
        for (const item of patient.items) items.set(item.therapyId, item);
        patients.set(patient.patientId, { ...patient, items: [...items.values()] });
      }
      slots.set(next.id, {
        ...next,
        summary: replaceSummary ? next.summary : previous.summary,
        patients: [...patients.values()],
      });
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
        previousPatient.administrations.map((row) => [
          `${row.therapyId}|${row.scheduledTime}`,
          row,
        ]),
      );
      for (const administration of nextPatient.administrations) {
        administrations.set(
          `${administration.therapyId}|${administration.scheduledTime}`,
          administration,
        );
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
