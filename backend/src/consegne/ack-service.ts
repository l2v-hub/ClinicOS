// «Ho capito» on URGENT handovers (UX2 W8, owner decision 2026-10-03; model in lib/urgency.ts).
//
// Same rule as the diary: the first acknowledgement by an operator other than the author ends the
// urgency for everyone and stays as the trace. Append-only rows in ConsegnaAcknowledgement (DB
// triggers); the handover itself (text, stored stato, history) is never modified.
//
// Who: anyone who can READ this handover (consegne.list + the existing author/assignee visibility,
// facility for admin/manager) AND whose Resident Access Scope reaches the named resident. It never
// widens a write: no field of the handover changes. Audit: ids only.

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import { prisma } from '../lib/prisma.js';
import {
  NOT_URGENT_MESSAGE,
  SELF_ACK_MESSAGE,
  URGENT_PRIORITY,
  UrgencyAckError,
  isAuthorOf,
  urgencyView,
  type AckRowLike,
  type UrgencySubject,
  type UrgencyView,
} from '../lib/urgency.js';
import { authoritativeDiaryAuthor } from '../patients/diary-author.js';
import { patientScopeWhere } from '../patients/patient-scope.js';

import { readsAllConsegne } from './visibility.js';
export const CONSEGNA_ACK_AUDIT_ACTION = 'consegna:ack';

const PRIVILEGED_ROLES = new Set(['admin', 'manager']);

export interface ConsegnaUrgencySource {
  id: string;
  priorita: string;
  stato: string;
  creatoDaId: string | null;
  creatoDA: string;
}

export function consegnaUrgencySubject(c: ConsegnaUrgencySource): UrgencySubject {
  return {
    priority: c.priorita,
    legacyClosed: c.stato === 'completata',
    authorId: c.creatoDaId,
    authorName: c.creatoDA,
  };
}

/** Ack rows by handover id, sorted by time (first non-author ack ends the urgency). */
export async function loadConsegnaAckRows(
  consegnaIds: string[],
  db: Pick<Prisma.TransactionClient, 'consegnaAcknowledgement'> = prisma,
) {
  const byId = new Map<string, AckRowLike[]>();
  if (!consegnaIds.length) return byId;
  const rows = await db.consegnaAcknowledgement.findMany({
    where: { consegnaId: { in: [...new Set(consegnaIds)] } },
    orderBy: [{ acknowledgedAt: 'asc' }, { id: 'asc' }],
    select: {
      consegnaId: true,
      operatorId: true,
      operatorName: true,
      operatorRole: true,
      acknowledgedAt: true,
    },
  });
  for (const row of rows) byId.set(row.consegnaId, [...(byId.get(row.consegnaId) ?? []), row]);
  return byId;
}

/** Adds `urgency` to every handover row (one query for the page). */
export async function withConsegnaUrgency<T extends ConsegnaUrgencySource>(
  rows: T[],
  actor: Operator,
): Promise<Array<T & { urgency: UrgencyView }>> {
  const acks = await loadConsegnaAckRows(
    rows.filter((r) => r.priorita === URGENT_PRIORITY).map((r) => r.id),
  );
  return rows.map((row) => ({
    ...row,
    urgency: urgencyView(consegnaUrgencySubject(row), acks.get(row.id) ?? [], actor),
  }));
}

function readableWhere(id: string, actor: Operator): Prisma.ConsegnaWhereInput {
  if (readsAllConsegne(actor)) return { id };
  return {
    AND: [{ id }, { OR: [{ creatoDaId: actor.id }, { operatoreAssegnatoId: actor.id }] }],
  };
}

/**
 * «Ho capito» on an urgent handover. 201 when this ack takes charge of the urgency; 200 (created:
 * false) when it had already been taken (by anyone) — nothing is written then.
 */
export async function acknowledgeConsegna(id: string, actor: Operator) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`consegna-ack:${id}`}))`;
    const c = await tx.consegna.findFirst({
      where: readableWhere(id, actor),
      select: {
        id: true,
        pazienteId: true,
        priorita: true,
        stato: true,
        creatoDaId: true,
        creatoDA: true,
      },
    });
    if (!c) throw new UrgencyAckError(404, 'not_found', 'Consegna non trovata');
    // Resident Access Scope: a handover naming a resident outside the reader's reach is not theirs
    // to acknowledge (404, no disclosure).
    if (c.pazienteId) {
      const inScope = await tx.patient.findFirst({
        where: { id: c.pazienteId, ...patientScopeWhere(actor) },
        select: { id: true },
      });
      if (!inScope) throw new UrgencyAckError(404, 'not_found', 'Consegna non trovata');
    }
    if (c.priorita !== URGENT_PRIORITY)
      throw new UrgencyAckError(409, 'not_acknowledgeable', NOT_URGENT_MESSAGE);

    const me = await authoritativeDiaryAuthor(actor, tx);
    const actorRef = { id: actor.id, name: me.authorName };
    const subject = consegnaUrgencySubject(c);
    if (isAuthorOf(subject, actorRef))
      throw new UrgencyAckError(409, 'author_cannot_acknowledge', SELF_ACK_MESSAGE);

    let created = false;
    const before = urgencyView(
      subject,
      (await loadConsegnaAckRows([id], tx)).get(id) ?? [],
      actorRef,
    );
    if (before.state === 'active') {
      await tx.consegnaAcknowledgement.create({
        data: {
          consegnaId: id,
          patientId: c.pazienteId,
          operatorId: actor.id,
          operatorName: me.authorName,
          operatorRole: me.authorType,
        },
      });
      created = true;
    }

    const urgency = urgencyView(
      subject,
      (await loadConsegnaAckRows([id], tx)).get(id) ?? [],
      actorRef,
    );
    return { created, urgency, patientId: c.pazienteId };
  });

  recordAuditEvent({
    requestId: `consegna-ack-${randomUUID()}`,
    operatorId: actor.id,
    operatorRole: actor.appRole ?? actor.role,
    patientId: result.patientId || null,
    actionType: CONSEGNA_ACK_AUDIT_ACTION,
    kind: result.created ? 'create' : 'read',
    channel: 'gui',
    // Ids only: never the handover text.
    fields: [`consegna:${id}`, `ack:${result.created ? 'new' : 'existing'}`],
    outcome: result.created ? 'ok' : 'deduped',
  });

  return { created: result.created, urgency: result.urgency };
}
