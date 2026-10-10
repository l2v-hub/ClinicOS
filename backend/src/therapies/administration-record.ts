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
        doseContext,
      } = authoritative;
      const existing = await tx.medicationAdministration.findUnique({
        where: { therapyId_date_fascia_ora: { therapyId, date, fascia, ora } },
      });
      if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
      return tx.medicationAdministration.upsert({
        where: { therapyId_date_fascia_ora: { therapyId, date, fascia, ora } },
        create: {
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
        update: {
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
        motivo = '',
        note: noteText,
      } = authoritative;
      const existing = await tx.medicationAdministration.findUnique({
        where: { therapyId_date_fascia_ora: { therapyId, date, fascia, ora } },
        select: { stato: true },
      });
      if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
      return tx.medicationAdministration.upsert({
        where: { therapyId_date_fascia_ora: { therapyId, date, fascia, ora } },
        create: {
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
        update: {
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
