// Authoritative administration record for one therapy slot (therapyId/date/fascia/ora).
//
// The HTTP routes and Tool Layer share this writer. Keyed requests atomically save the
// clinical record and first response; replays check current patient access and never rewrite it.
// An expected pending state rejects a stale action after another operator records an outcome.
//
// Actor identity always comes from the authenticated operator; client-supplied actor fields are
// ignored. `therapyId` is mandatory; drug/dose/route/time are resolved from the prescription
// server-side, and only reason/note are accepted as clinical input for "non erogata".

import { Prisma, type MedicationAdministration } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  parseTherapyAdministrationBody,
  resolveAuthoritativeTherapy,
  TherapyWriteInputError,
  TherapyNotFoundError,
} from './therapy-write.js';
import { patientIsInOperatorScope } from '../patients/patient-scope.js';
import {
  serializeTemporaryPsPatient,
  assertTemporaryPsAdministrationAllowed,
} from '../patients/temporary-ps-exits.js';

/** The slot already holds an `erogata` record: it can be neither re-confirmed nor downgraded. */
export class TherapyAlreadyAdministeredError extends Error {}

/**
 * The record that already represents this dose. A band with ONE prescribed dose has one record
 * for the day whatever its hour: moving 08:00 to 09:00 after the dose was given must not reopen
 * it (a second `erogata` would be a double dose). Several doses in a band match by exact hour.
 */
async function existingSlotRecord(
  tx: Prisma.TransactionClient,
  slot: {
    therapyId: string;
    date: string;
    fascia: string;
    ora: string;
    singleBandDose: boolean;
    singleDayDose: boolean;
  },
) {
  const { therapyId, date, fascia, ora } = slot;
  if (!slot.singleBandDose && !slot.singleDayDose)
    return tx.medicationAdministration.findUnique({
      where: { therapyId_date_fascia_ora: { therapyId, date, fascia, ora } },
      select: { id: true, stato: true },
    });
  const records = await tx.medicationAdministration.findMany({
    where: { therapyId, date, ...(!slot.singleDayDose && { fascia }) },
    select: { id: true, stato: true, ora: true },
    orderBy: { id: 'asc' },
  });
  return (
    records.find((r) => r.stato === 'erogata') ??
    records.find((r) => r.ora === ora) ??
    records[0] ??
    null
  );
}

export function isConcurrentWriteConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    code?: string;
    meta?: {
      driverAdapterError?: {
        cause?: { originalCode?: string; kind?: string };
      };
    };
  };
  if (candidate.code === 'P2034') return true;
  // Prisma7 reports serialization failures of raw row-lock writes as P2010 plus the
  // PostgreSQL adapter's original SQLSTATE, rather than the ORM write's P2034.
  const cause = candidate.meta?.driverAdapterError?.cause;
  return (
    candidate.code === 'P2010' &&
    cause?.kind === 'TransactionWriteConflict' &&
    ['40001', '40P01'].includes(cause.originalCode ?? '')
  );
}

/** Records the slot as `erogata` (POST /therapy-slots/confirm). */
export async function confirmTherapyAdministration(
  body: unknown,
  actor: Operator,
  transaction?: Prisma.TransactionClient,
): Promise<MedicationAdministration> {
  const input = parseTherapyAdministrationBody(body, false);
  if (!transaction && input.requestId)
    return (await recordTherapyAdministrationResult(body, actor, { notAdministered: false }))
      .record;
  const write = async (tx: Prisma.TransactionClient) => {
    await serializeTemporaryPsPatient(tx, input.patientId, actor);
    const authoritative = await resolveAuthoritativeTherapy(tx, input, actor);
    const {
      therapyId,
      patientId,
      farmacoNome,
      farmacoDose,
      farmacoVia,
      date,
      fascia,
      ora,
      singleBandDose,
      singleDayDose,
      doseContext,
    } = authoritative;
    const existing = await existingSlotRecord(tx, {
      therapyId,
      date,
      fascia,
      ora,
      singleBandDose,
      singleDayDose,
    });
    if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
    await assertTemporaryPsAdministrationAllowed(tx, input.patientId);
    if (input.expectedStato === 'non_erogata' && existing?.stato !== 'non_erogata')
      throw new TherapyWriteInputError(
        'La dose rifiutata non è più disponibile: rileggi il registro.',
        409,
      );
    if (input.expectedStato && existing && existing.stato !== input.expectedStato)
      throw new TherapyWriteInputError(
        'La dose non è più da erogare: rileggi il giro prima di registrare.',
        409,
      );
    if (existing)
      return tx.medicationAdministration.update({
        where: { id: existing.id },
        data: {
          patientId,
          farmacoNome,
          farmacoDose,
          farmacoVia,
          ora,
          stato: 'erogata',
          operatoreId: actor.id,
          operatoreNome: actor.name || actor.id,
          confirmedAt: new Date(),
          motivo: null,
          note: null,
          doseContext: doseContext ?? Prisma.DbNull,
        },
      });
    return tx.medicationAdministration.create({
      data: {
        therapyId,
        patientId,
        farmacoNome,
        farmacoDose: farmacoDose || '',
        farmacoVia: farmacoVia || 'orale',
        date,
        fascia,
        ora: ora || '',
        stato: 'erogata',
        operatoreId: actor.id,
        operatoreNome: actor.name || actor.id,
        confirmedAt: new Date(),
        doseContext,
      },
    });
  };
  return transaction
    ? write(transaction)
    : prisma.$transaction(write, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Records the slot as `non_erogata` with motivo/note (POST /therapy-slots/not-administered). */
export async function recordTherapyNotAdministered(
  body: unknown,
  actor: Operator,
  transaction?: Prisma.TransactionClient,
): Promise<MedicationAdministration> {
  const input = parseTherapyAdministrationBody(body, true);
  if (!transaction && input.requestId)
    return (await recordTherapyAdministrationResult(body, actor, { notAdministered: true })).record;
  const write = async (tx: Prisma.TransactionClient) => {
    await serializeTemporaryPsPatient(tx, input.patientId, actor);
    const authoritative = await resolveAuthoritativeTherapy(tx, input, actor, {
      requireDoseMeasurement: false,
    });
    const {
      therapyId,
      patientId,
      farmacoNome,
      farmacoDose,
      farmacoVia,
      date,
      fascia,
      ora,
      singleBandDose,
      singleDayDose,
      motivo = '',
      note: noteText,
    } = authoritative;
    const existing = await existingSlotRecord(tx, {
      therapyId,
      date,
      fascia,
      ora,
      singleBandDose,
      singleDayDose,
    });
    if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
    if (input.expectedStato && existing && existing.stato !== input.expectedStato)
      throw new TherapyWriteInputError(
        'La dose non è più da erogare: rileggi il giro prima di registrare.',
        409,
      );
    if (existing)
      return tx.medicationAdministration.update({
        where: { id: existing.id },
        data: {
          patientId,
          farmacoNome,
          farmacoDose,
          farmacoVia,
          ora,
          stato: 'non_erogata',
          motivo,
          note: noteText || null,
          operatoreId: actor.id,
          operatoreNome: actor.name || actor.id,
          confirmedAt: null,
        },
      });
    return tx.medicationAdministration.create({
      data: {
        therapyId,
        patientId,
        farmacoNome,
        farmacoDose: farmacoDose || '',
        farmacoVia: farmacoVia || 'orale',
        date,
        fascia,
        ora: ora || '',
        stato: 'non_erogata',
        operatoreId: actor.id,
        operatoreNome: actor.name || actor.id,
        motivo,
        note: noteText || null,
      },
    });
  };
  return transaction
    ? write(transaction)
    : prisma.$transaction(write, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Immutable first result, atomic with the clinical write; current resident access is rechecked. */
export async function recordTherapyAdministrationResult(
  body: unknown,
  actor: Operator,
  options: { notAdministered: boolean },
): Promise<{ record: MedicationAdministration; replayed: boolean }> {
  const input = parseTherapyAdministrationBody(body, options.notAdministered);
  const write = (tx?: Prisma.TransactionClient) =>
    options.notAdministered
      ? recordTherapyNotAdministered(body, actor, tx)
      : confirmTherapyAdministration(body, actor, tx);
  if (!input.requestId) return { record: await write(), replayed: false };
  const requestId = input.requestId;
  const requestHash = createHash('sha256')
    .update(
      JSON.stringify({ ...input, requestId: undefined, notAdministered: options.notAdministered }),
    )
    .digest('hex');
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const receipt = await tx.therapyAdministrationReceipt.findUnique({
            where: { actorId_requestId: { actorId: actor.id, requestId } },
          });
          if (receipt) {
            if (receipt.requestHash !== requestHash)
              throw new TherapyWriteInputError(
                'requestId già usato per una richiesta diversa',
                409,
              );
            if (!(await patientIsInOperatorScope(input.patientId, actor, tx)))
              throw new TherapyNotFoundError();
            const stored = receipt.result as unknown as MedicationAdministration;
            const record = {
              ...stored,
              createdAt: new Date(stored.createdAt),
              updatedAt: new Date(stored.updatedAt),
              confirmedAt: stored.confirmedAt ? new Date(stored.confirmedAt) : null,
            };
            return { record, replayed: true };
          }
          const record = await write(tx);
          await tx.therapyAdministrationReceipt.create({
            data: {
              actorId: actor.id,
              requestId,
              requestHash,
              patientId: input.patientId,
              result: JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue,
            },
          });
          return { record, replayed: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const code =
        error && typeof error === 'object' ? (error as { code?: string }).code : undefined;
      if (attempt >= 2 || (!isConcurrentWriteConflict(error) && code !== 'P2002')) throw error;
    }
  }
}

/** Single entry point: `erogata` by default, `non_erogata` when `notAdministered` is true. */
export async function recordTherapyAdministration(
  body: unknown,
  actor: Operator,
  options: { notAdministered: boolean },
) {
  return (await recordTherapyAdministrationResult(body, actor, options)).record;
}
