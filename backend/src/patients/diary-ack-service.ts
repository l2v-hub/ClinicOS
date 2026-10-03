// «Ho capito» on URGENT diary entries (UX2 W8, owner decision 2026-10-03; model in lib/urgency.ts).
//
// - An urgent entry is «urgente attiva» until the FIRST acknowledgement by an operator other than
//   the author; that row ends the urgency for everyone and is the trace («Urgenza presa in carico
//   da <nome, ruolo> alle hh:mm»). After it, no further acknowledgement is needed (idempotent 200).
// - The author cannot acknowledge their own entry (409 author_cannot_acknowledge).
// - Rows are append-only in DiaryEntryAcknowledgement (DB triggers); the entry itself (text,
//   status, history) is never modified. Name and role are server-authoritative snapshots.
// - Audited like the proactive ack: an append-only AiAuditEvent row (ids only, no clinical text).
// - Scope: the route runs behind requirePatientScope; the service re-checks the resident scope.

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
  diaryUrgencyActiveSql,
  isAuthorOf,
  urgencyView,
  type AckRowLike,
  type UrgencySubject,
  type UrgencyView,
} from '../lib/urgency.js';
import { loadConsegnaAckRows } from '../consegne/ack-service.js';
import { authoritativeDiaryAuthor } from './diary-author.js';
import { patientScopeWhere } from './patient-scope.js';

export const DIARY_ACK_AUDIT_ACTION = 'diary:ack';

export interface DiaryUrgencyFields {
  urgency: UrgencyView;
}

interface DiaryFeedEntryLike {
  id: string;
  priority: string;
  status: string;
  authorName: string;
  authorId: string | null;
  sourceType?: string;
  sourceId?: string;
}

function subjectOf(entry: DiaryFeedEntryLike): UrgencySubject {
  return {
    priority: entry.priority,
    legacyClosed: entry.status === 'completata',
    authorId: entry.authorId,
    authorName: entry.authorName,
  };
}

async function diaryAckRows(entryIds: string[]) {
  const byEntry = new Map<string, AckRowLike[]>();
  if (!entryIds.length) return byEntry;
  const rows = await prisma.diaryEntryAcknowledgement.findMany({
    where: { entryId: { in: entryIds } },
    orderBy: [{ acknowledgedAt: 'asc' }, { id: 'asc' }],
    select: {
      entryId: true,
      operatorId: true,
      operatorName: true,
      operatorRole: true,
      acknowledgedAt: true,
    },
  });
  for (const row of rows) byEntry.set(row.entryId, [...(byEntry.get(row.entryId) ?? []), row]);
  return byEntry;
}

/** Urgency view for every entry of a diary page (one query per source). */
export async function loadDiaryAckFields(
  entries: ReadonlyArray<DiaryFeedEntryLike>,
  actor: Operator,
): Promise<Map<string, DiaryUrgencyFields>> {
  const urgent = entries.filter((e) => e.priority === URGENT_PRIORITY);
  const diaryIds = urgent.filter((e) => e.sourceType !== 'consegna').map((e) => e.id);
  const consegnaIds = urgent
    .filter((e) => e.sourceType === 'consegna' && e.sourceId)
    .map((e) => e.sourceId!);
  const [diaryAcks, consegnaAcks] = await Promise.all([
    diaryAckRows(diaryIds),
    loadConsegnaAckRows(consegnaIds),
  ]);
  const result = new Map<string, DiaryUrgencyFields>();
  for (const entry of entries) {
    const acks =
      entry.sourceType === 'consegna'
        ? (consegnaAcks.get(entry.sourceId ?? '') ?? [])
        : (diaryAcks.get(entry.id) ?? []);
    result.set(entry.id, { urgency: urgencyView(subjectOf(entry), acks, actor) });
  }
  return result;
}

/**
 * «Ho capito» on an urgent entry. 201 when this ack takes charge of the urgency; 200 (created:
 * false) when the urgency had already been taken (by anyone) — nothing is written then.
 */
export async function acknowledgeDiaryEntry(patientId: string, entryId: string, actor: Operator) {
  const entry = await prisma.patientDiaryEntry.findFirst({
    where: { id: entryId, patientId, patient: patientScopeWhere(actor) },
    select: {
      id: true,
      patientId: true,
      priority: true,
      status: true,
      authorId: true,
      authorName: true,
    },
  });
  if (!entry) throw new UrgencyAckError(404, 'entry_not_found', 'Voce non trovata');
  if (entry.priority !== URGENT_PRIORITY)
    throw new UrgencyAckError(409, 'not_acknowledgeable', NOT_URGENT_MESSAGE);

  const me = await authoritativeDiaryAuthor(actor);
  const subject = subjectOf(entry);
  const actorRef = { id: actor.id, name: me.authorName };
  if (isAuthorOf(subject, actorRef))
    throw new UrgencyAckError(409, 'author_cannot_acknowledge', SELF_ACK_MESSAGE);

  let created = false;
  const before = urgencyView(subject, (await diaryAckRows([entryId])).get(entryId) ?? [], actorRef);
  if (before.state === 'active') {
    try {
      await prisma.diaryEntryAcknowledgement.create({
        data: {
          entryId,
          patientId: entry.patientId,
          operatorId: actor.id,
          operatorName: me.authorName,
          operatorRole: me.authorType,
        },
      });
      created = true;
    } catch (error) {
      // Concurrent double tap by the same reader: the unique (entryId, operatorId) keeps the first.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
        throw error;
    }
  }

  recordAuditEvent({
    requestId: `diary-ack-${randomUUID()}`,
    operatorId: actor.id,
    operatorRole: actor.appRole ?? actor.role,
    patientId: entry.patientId,
    actionType: DIARY_ACK_AUDIT_ACTION,
    kind: created ? 'create' : 'read',
    channel: 'gui',
    // Ids only: never the entry text.
    fields: [`entry:${entryId}`, `ack:${created ? 'new' : 'existing'}`],
    outcome: created ? 'ok' : 'deduped',
  });

  const urgency = urgencyView(
    subject,
    (await diaryAckRows([entryId])).get(entryId) ?? [],
    actorRef,
  );
  return { created, urgency };
}

/**
 * Proactive bridge: which of these diary entries are urgencies already settled — taken in charge
 * (by anyone other than the author) or closed under the old model. Settled for EVERY reader.
 */
export async function diaryEntriesUrgencySettled(entryIds: string[]): Promise<Set<string>> {
  if (entryIds.length === 0) return new Set();
  const ids = entryIds.slice(0, 1000);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT d."id" FROM "PatientDiaryEntry" d
    WHERE d."id" IN (${Prisma.join(ids)})
      AND d."priority" = 'urgente'
      AND NOT ${diaryUrgencyActiveSql}
  `);
  return new Set(rows.map((r) => r.id));
}
