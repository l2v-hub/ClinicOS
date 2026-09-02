// Issue #130: shared consegne write service — the SINGLE creation path for the REST route
// (POST /consegne, used by the traditional UI) and the Agnos VoiceWriter (FR-007: the AI
// reuses the same application service as the UI, no duplicated business logic).

import { prisma } from '../lib/prisma.js';
import type { Operator } from '../ai/auth.js';
import type { ConsegnaCreateInput } from '../consegne/write-validation.js';
import { ConsegnaInputError } from '../consegne/query.js';
import { patientScopeWhere } from '../patients/patient-scope.js';

export class ConsegnaPatientNotFoundError extends Error {
  constructor() {
    super('Paziente non trovato');
    this.name = 'ConsegnaPatientNotFoundError';
  }
}

/** Shared authoritative creation path for UI and Agnos. */
export async function createConsegna(input: ConsegnaCreateInput, actor: Operator) {
  const [patient, assignee, author] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: input.pazienteId, ...patientScopeWhere(actor) },
      select: { id: true, firstName: true, lastName: true },
    }),
    input.operatoreAssegnatoId
      ? prisma.operator.findFirst({
          where: { id: input.operatoreAssegnatoId, user: { isActive: true } },
          select: { id: true, user: { select: { fullName: true } } },
        })
      : Promise.resolve(null),
    prisma.operator.findUnique({
      where: { id: actor.id },
      select: { user: { select: { fullName: true } } },
    }),
  ]);
  // Missing and out-of-scope patients intentionally share the same non-enumerating outcome.
  if (!patient) throw new ConsegnaPatientNotFoundError();
  if (input.operatoreAssegnatoId && !assignee) {
    throw new ConsegnaInputError('Operatore assegnato non disponibile');
  }
  return prisma.consegna.create({
    data: {
      pazienteId: patient.id,
      pazienteNome: `${patient.lastName}, ${patient.firstName}`,
      priorita: input.priorita,
      stato: 'aperta',
      tipo: input.tipo,
      note: input.note,
      scadenza: input.scadenza,
      oraScadenza: input.oraScadenza,
      operatoreAssegnatoId: assignee?.id ?? null,
      operatoreAssegnato: assignee?.user.fullName ?? '',
      creatoDaId: actor.id,
      creatoDA: actor.name?.trim() || author?.user.fullName || actor.id,
    },
  });
}
