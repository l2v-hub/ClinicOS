// Issue #130: shared consegne write service — the SINGLE creation path for the REST route
// (POST /consegne, used by the traditional UI) and the Agnos VoiceWriter (FR-007: the AI
// reuses the same application service as the UI, no duplicated business logic).

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import { parseConsegnaCreateBody } from '../consegne/write-validation.js';
import { claimConsegnaCreation, ConsegnaCreationError } from '../consegne/create-receipt.js';
import { ConsegnaInputError } from '../consegne/query.js';
import { patientScopeWhere } from '../patients/patient-scope.js';

export class ConsegnaPatientNotFoundError extends Error {
  constructor() {
    super('Paziente non trovato');
    this.name = 'ConsegnaPatientNotFoundError';
  }
}

/** Shared authoritative creation path for UI and Agnos. */
export async function createConsegna(value: unknown, actor: Operator, now = new Date()) {
  const input = parseConsegnaCreateBody(value);
  const scope = patientScopeWhere(actor);
  return prisma.$transaction(async (tx) => {
    // SHARE blocks ownership changes/deletion until this authorized create/replay completes,
    // while allowing concurrent independent handovers for the same patient.
    const [patient] = await tx.$queryRaw<
      Array<{ id: string; firstName: string; lastName: string }>
    >(Prisma.sql`
      SELECT p.id, p."firstName", p."lastName" FROM "Patient" p WHERE p.id = ${input.pazienteId}
      ${scope.registeredById ? Prisma.sql`AND p."registeredById" = ${scope.registeredById}` : Prisma.empty}
      FOR SHARE OF p
    `);
    if (!patient) throw new ConsegnaPatientNotFoundError();
    const receipt = await claimConsegnaCreation(tx, actor.id, input);
    if (receipt.replayed) {
      const existing = await tx.consegna.findUnique({ where: { id: receipt.consegnaId } });
      if (!existing)
        throw new ConsegnaCreationError(
          'La consegna era stata salvata ed è stata eliminata. Nessuna nuova consegna creata.',
          410,
          'consegna_creation_deleted',
          {
            requestId: input.requestId!,
            consegnaId: receipt.consegnaId,
            pazienteId: input.pazienteId,
          },
        );
      if (existing.pazienteId !== patient.id) throw new ConsegnaPatientNotFoundError();
      return { ...existing, requestId: input.requestId!, replayed: true };
    }
    const [assignee, author] = await Promise.all([
      input.operatoreAssegnatoId
        ? tx.operator.findFirst({
            where: { id: input.operatoreAssegnatoId, user: { isActive: true } },
            select: { id: true, user: { select: { fullName: true } } },
          })
        : Promise.resolve(null),
      tx.operator.findUnique({
        where: { id: actor.id },
        select: { user: { select: { fullName: true } } },
      }),
    ]);
    if (input.operatoreAssegnatoId && !assignee)
      throw new ConsegnaInputError('Operatore assegnato non disponibile');
    const created = await tx.consegna.create({
      data: {
        id: receipt.consegnaId,
        pazienteId: patient.id,
        pazienteNome: `${patient.lastName}, ${patient.firstName}`,
        priorita: input.priorita,
        stato: 'aperta',
        tipo: input.tipo,
        note: input.note,
        scadenza: input.scadenza ?? now.toISOString().slice(0, 10),
        oraScadenza: input.oraScadenza,
        operatoreAssegnatoId: assignee?.id ?? null,
        operatoreAssegnato: assignee?.user.fullName ?? '',
        creatoDaId: actor.id,
        creatoDA: actor.name?.trim() || author?.user.fullName || actor.id,
      },
    });
    return { ...created, requestId: input.requestId ?? null, replayed: false };
  });
}
