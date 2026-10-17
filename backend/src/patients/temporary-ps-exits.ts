import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { facilityClock } from '../lib/facility-time.js';
import { hasFacilityPatientScope } from './patient-scope.js';
import { TherapyWriteInputError } from '../therapies/therapy-write.js';

export class TemporaryPsExitError extends TherapyWriteInputError {
  constructor(
    message: string,
    status = 409,
    public code = 'temporary_ps_exit_conflict',
  ) {
    super(message, status);
  }
}
type JsonObject = Record<string, unknown>;
const object = (v: unknown): v is JsonObject => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!object(a) || !object(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => same(v, b[i]))
    );
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => Object.hasOwn(b, key) && same(a[key], b[key]))
  );
};
export interface TemporaryPsExit {
  exitId: string;
  decision: 'pause' | 'continue';
  departedAt: string;
}
export type TemporaryPsExitCommand =
  | {
      action: 'depart';
      decision: 'pause' | 'continue';
      reason: string;
      requestId: string;
      confirmed: true;
    }
  | { action: 'return'; exitId: string; requestId: string; confirmed: true };

export function parseTemporaryPsExitCommand(value: unknown): TemporaryPsExitCommand {
  const invalid = () =>
    new TemporaryPsExitError('Decisione di uscita PS non valida.', 400, 'temporary_ps_exit_input');
  if (!object(value) || JSON.stringify(value).length > 4096) throw invalid();
  const fields =
    value.action === 'depart'
      ? ['action', 'decision', 'reason', 'requestId', 'confirmed']
      : ['action', 'exitId', 'requestId', 'confirmed'];
  if (
    Object.keys(value).some((key) => !fields.includes(key)) ||
    value.confirmed !== true ||
    typeof value.requestId !== 'string' ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(value.requestId)
  )
    throw invalid();
  if (value.action === 'depart') {
    if (
      !['pause', 'continue'].includes(String(value.decision)) ||
      typeof value.reason !== 'string' ||
      !value.reason.trim() ||
      value.reason.length > 2000
    )
      throw invalid();
    return {
      action: 'depart',
      decision: value.decision as 'pause' | 'continue',
      reason: value.reason,
      requestId: value.requestId,
      confirmed: true,
    };
  }
  if (
    value.action !== 'return' ||
    typeof value.exitId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(value.exitId)
  )
    throw invalid();
  return { action: 'return', exitId: value.exitId, requestId: value.requestId, confirmed: true };
}

/** A row-version write, not just a lock: stale SERIALIZABLE snapshots must fail after an exit.
 * Preserve demographic updatedAt. All departure/return and dose writers use this same protocol.
 */
export async function serializeTemporaryPsPatient(
  tx: Prisma.TransactionClient,
  patientId: string,
  actor: Operator,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "Patient" p SET "updatedAt" = p."updatedAt" WHERE p.id = ${patientId}
    ${hasFacilityPatientScope(actor.role) ? Prisma.empty : Prisma.sql`AND p."registeredById" = ${actor.id}`}
    RETURNING p.id`);
  if (!rows.length)
    throw new TemporaryPsExitError('Paziente non trovato.', 404, 'patient_not_found');
}

export function currentTemporaryPsExit(data: unknown): TemporaryPsExit | null {
  const lib = object(data) && object(data.liberatoria) ? data.liberatoria : null;
  if (!lib || lib.temporaryPsExit === undefined || lib.temporaryPsExit === null) return null;
  const active = lib.temporaryPsExit;
  if (
    !object(active) ||
    typeof active.exitId !== 'string' ||
    !['pause', 'continue'].includes(String(active.decision)) ||
    typeof active.departedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      active.departedAt,
    ) ||
    !Number.isFinite(Date.parse(active.departedAt))
  )
    throw new TemporaryPsExitError('Stato uscita PS non verificabile. Ricarica la cartella.');
  const entry =
    Array.isArray(lib.usciteLog) &&
    lib.usciteLog.find((row) => object(row) && row.id === active.exitId);
  if (
    !object(entry) ||
    !object(entry.psExit) ||
    entry.psExit.returnedAt ||
    entry.psExit.decision !== active.decision ||
    entry.psExit.departedAt !== active.departedAt
  )
    throw new TemporaryPsExitError('Storico uscita PS non verificabile. Ricarica la cartella.');
  return {
    exitId: active.exitId,
    decision: active.decision as 'pause' | 'continue',
    departedAt: active.departedAt,
  };
}
export async function readTemporaryPsExit(tx: Prisma.TransactionClient, patientId: string) {
  const row = await tx.cartella.findUnique({ where: { patientId }, select: { data: true } });
  return currentTemporaryPsExit(row?.data);
}
export async function assertTemporaryPsAdministrationAllowed(
  tx: Prisma.TransactionClient,
  patientId: string,
) {
  if ((await readTemporaryPsExit(tx, patientId))?.decision === 'pause')
    throw new TemporaryPsExitError(
      'Somministrazioni in pausa durante l’uscita PS. Registra il rientro prima di erogare.',
      409,
      'temporary_ps_exit_paused',
    );
}

/** Omitted managed data is preserved; an explicit alteration/forgery is refused. */
export function preserveTemporaryPsExits(current: unknown, incoming: JsonObject): JsonObject {
  const before = object(current) && object(current.liberatoria) ? current.liberatoria : {};
  const after = object(incoming.liberatoria) ? incoming.liberatoria : {};
  const managed = Array.isArray(before.usciteLog)
    ? before.usciteLog.filter((row) => object(row) && Object.hasOwn(row, 'psExit'))
    : [];
  const rawRows = Array.isArray(after.usciteLog) ? after.usciteLog : [];
  const managedIds = new Set(managed.map((row) => (row as JsonObject).id));
  if (
    (managed.length || Object.hasOwn(before, 'temporaryPsExit')) &&
    Object.hasOwn(incoming, 'liberatoria') &&
    !object(incoming.liberatoria)
  )
    throw new TemporaryPsExitError('Il registro delle uscite PS non può essere cancellato.');
  if (
    Object.hasOwn(after, 'temporaryPsExit') &&
    !same(after.temporaryPsExit, before.temporaryPsExit)
  )
    throw new TemporaryPsExitError('Lo stato di uscita PS è gestito dal comando autorizzato.');
  for (const row of rawRows) {
    if (!object(row)) continue;
    if (Object.hasOwn(row, 'psExit') || managedIds.has(row.id)) {
      const stored = managed.find((item) => object(item) && item.id === row.id);
      if (!stored || !same(stored, row))
        throw new TemporaryPsExitError('Lo storico di uscita PS è di sola lettura.');
    }
  }
  if (!managed.length && !Object.hasOwn(before, 'temporaryPsExit')) return incoming;
  return {
    ...incoming,
    liberatoria: {
      ...(Object.hasOwn(incoming, 'liberatoria') ? after : before),
      ...(Object.hasOwn(before, 'temporaryPsExit')
        ? { temporaryPsExit: before.temporaryPsExit }
        : {}),
      usciteLog: [...rawRows.filter((row) => !object(row) || !managedIds.has(row.id)), ...managed],
    },
  };
}

export async function executeTemporaryPsExit(patientId: string, value: unknown, actor: Operator) {
  const command = parseTemporaryPsExitCommand(value);
  const requestHash = createHash('sha256').update(JSON.stringify(command)).digest('hex');
  return prisma.$transaction(async (tx) => {
    await serializeTemporaryPsPatient(tx, patientId, actor);
    const stored = await tx.cartella.findUnique({ where: { patientId } });
    const data: JsonObject = object(stored?.data) ? stored.data : {};
    const lib: JsonObject = object(data.liberatoria) ? data.liberatoria : {};
    if (
      lib.usciteLog !== undefined &&
      (!Array.isArray(lib.usciteLog) || lib.usciteLog.some((entry) => !object(entry)))
    )
      throw new TemporaryPsExitError(
        'Registro uscite non verificabile. Ricarica e verifica lo storico.',
      );
    const rows: JsonObject[] = Array.isArray(lib.usciteLog) ? lib.usciteLog.filter(object) : [];
    for (const row of rows) {
      if (!object(row.psExit)) continue;
      const metadata = row.psExit;
      const replay =
        metadata.actorId === actor.id && metadata.requestId === command.requestId
          ? metadata.requestHash
          : metadata.returnActorId === actor.id && metadata.returnRequestId === command.requestId
            ? metadata.returnRequestHash
            : null;
      if (replay) {
        if (replay !== requestHash)
          throw new TemporaryPsExitError('requestId già utilizzato per una decisione diversa.');
        return { patientId, data, replayed: true };
      }
    }
    const active = currentTemporaryPsExit(data);
    const now = new Date();
    const clock = facilityClock(now);
    const time = `${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:${String(clock.minutes % 60).padStart(2, '0')}`;
    if (command.action === 'depart') {
      if (active) throw new TemporaryPsExitError('È già registrata un’uscita PS aperta.');
      const exitId = randomUUID();
      const departedAt = now.toISOString();
      const psExit = {
        decision: command.decision,
        departedAt,
        actorId: actor.id,
        requestId: command.requestId,
        requestHash,
      };
      rows.push({
        id: exitId,
        data: clock.date,
        ora: time,
        operatore: actor.name || actor.id,
        note: command.reason,
        psExit,
      });
      data.liberatoria = {
        ...lib,
        usciteLog: rows,
        temporaryPsExit: { exitId, decision: command.decision, departedAt },
      };
    } else {
      if (!active || active.exitId !== command.exitId)
        throw new TemporaryPsExitError('Uscita PS non più aperta: ricarica la cartella.');
      const index = rows.findIndex((row) => row.id === command.exitId);
      rows[index] = {
        ...rows[index],
        oraRientro: time,
        psExit: {
          ...(rows[index].psExit as JsonObject),
          returnedAt: now.toISOString(),
          returnActorId: actor.id,
          returnActorName: actor.name || actor.id,
          returnRequestId: command.requestId,
          returnRequestHash: requestHash,
        },
      };
      data.liberatoria = { ...lib, usciteLog: rows, temporaryPsExit: null };
    }
    const saved = await tx.cartella.upsert({
      where: { patientId },
      create: { patientId, data: data as Prisma.InputJsonObject },
      update: { data: data as Prisma.InputJsonObject },
    });
    return { patientId, data: saved.data, replayed: false };
  });
}
