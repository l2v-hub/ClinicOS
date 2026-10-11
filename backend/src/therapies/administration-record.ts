// Authoritative administration record for one therapy slot (therapyId/date/fascia/ora).
//
// Moved VERBATIM from the POST /therapy-slots/confirm and /therapy-slots/not-administered
// handlers (routes/therapy.ts) so the route and the Tool Layer share one implementation.
// The routes keep their own HTTP status mapping; nothing here changed behaviour.
//
// Actor identity always comes from the authenticated operator; client-supplied actor fields are
// ignored. `therapyId` is mandatory; drug/dose/route/time are resolved from the prescription
// server-side, and only reason/note are accepted as clinical input for "non erogata".

import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { parseTherapyAdministrationBody, resolveAuthoritativeTherapy } from './therapy-write.js';

/** The slot already holds an `erogata` record: it can be neither re-confirmed nor downgraded. */
export class TherapyAlreadyAdministeredError extends Error {}

/**
 * The record that already represents this dose. A band with ONE prescribed dose has one record
 * for the day whatever its hour: moving 08:00 to 09:00 after the dose was given must not reopen
 * it (a second `erogata` would be a double dose). Several doses in a band match by exact hour.
 */
async function existingSlotRecord(
  tx: Prisma.TransactionClient,
  slot: { therapyId: string; date: string; fascia: string; ora: string; singleBandDose: boolean },
) {
  const { therapyId, date, fascia, ora } = slot;
  if (!slot.singleBandDose)
    return tx.medicationAdministration.findUnique({
      where: { therapyId_date_fascia_ora: { therapyId, date, fascia, ora } },
      select: { id: true, stato: true },
    });
  const records = await tx.medicationAdministration.findMany({
    where: { therapyId, date, fascia },
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
  return Boolean(
    error && typeof error === 'object' && (error as { code?: string }).code === 'P2034',
  );
}

/** Records the slot as `erogata` (POST /therapy-slots/confirm). */
export async function confirmTherapyAdministration(body: unknown, actor: Operator) {
  const input = parseTherapyAdministrationBody(body, false);
  const record = await prisma.$transaction(
    async (tx) => {
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
        doseContext,
      } = authoritative;
      const existing = await existingSlotRecord(tx, {
        therapyId,
        date,
        fascia,
        ora,
        singleBandDose,
      });
      if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return record;
}

/** Records the slot as `non_erogata` with motivo/note (POST /therapy-slots/not-administered). */
export async function recordTherapyNotAdministered(body: unknown, actor: Operator) {
  const input = parseTherapyAdministrationBody(body, true);
  const record = await prisma.$transaction(
    async (tx) => {
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
        motivo = '',
        note: noteText,
      } = authoritative;
      const existing = await existingSlotRecord(tx, {
        therapyId,
        date,
        fascia,
        ora,
        singleBandDose,
      });
      if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return record;
}

/** Single entry point: `erogata` by default, `non_erogata` when `notAdministered` is true. */
export function recordTherapyAdministration(
  body: unknown,
  actor: Operator,
  options: { notAdministered: boolean },
) {
  return options.notAdministered
    ? recordTherapyNotAdministered(body, actor)
    : confirmTherapyAdministration(body, actor);
}
