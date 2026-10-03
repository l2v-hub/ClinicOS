// «Presa visione» per lettore delle voci URGENTI del diario (UX direct-access, owner 2026-10-03).
//
// - One append-only row per (entry, operator) in DiaryEntryAcknowledgement: a second ack by the
//   same reader is an idempotent no-op (the first time stays the time of record).
// - Independent per reader: one operator's ack never changes what another operator sees as «da
//   vedere»; the entry itself (text, status, history) is never modified.
// - Name and role are server-authoritative snapshots (patients/diary-author.ts), never the client's.
// - Audited like the proactive ack: an append-only AiAuditEvent row (ids only, no clinical text).
// - Scope: the route runs behind requirePatientScope; the service re-checks the resident scope.

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import { prisma } from '../lib/prisma.js';
import { authoritativeDiaryAuthor } from './diary-author.js';
import { patientScopeWhere } from './patient-scope.js';

/** Only urgent entries carry a per-reader acknowledgement. */
export const ACKNOWLEDGEABLE_PRIORITY = 'urgente';
export const DIARY_ACK_AUDIT_ACTION = 'diary:ack';

export interface DiaryAcknowledgementView {
  operatorName: string;
  operatorRole: string;
  acknowledgedAt: string;
  /** true for the caller's own acknowledgement. Other readers' operator ids are not disclosed. */
  byMe: boolean;
}

export interface DiaryAckFields {
  acknowledgeable: boolean;
  acknowledgedByMe: boolean;
  acknowledgements: DiaryAcknowledgementView[];
}

export class DiaryAckError extends Error {
  constructor(
    readonly status: 404 | 409,
    readonly code: 'entry_not_found' | 'not_acknowledgeable',
    message: string,
  ) {
    super(message);
    this.name = 'DiaryAckError';
  }
}

interface AckRow {
  entryId: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  acknowledgedAt: Date;
}

function view(row: AckRow, actorId: string): DiaryAcknowledgementView {
  return {
    operatorName: row.operatorName,
    operatorRole: row.operatorRole,
    acknowledgedAt: row.acknowledgedAt.toISOString(),
    byMe: row.operatorId === actorId,
  };
}

/** Per-entry ack fields for a diary page (one query for the whole page). */
export async function loadDiaryAckFields(
  entries: ReadonlyArray<{ id: string; priority: string; sourceType?: string }>,
  actor: Operator,
): Promise<Map<string, DiaryAckFields>> {
  const urgentIds = entries
    .filter((e) => e.sourceType !== 'consegna' && e.priority === ACKNOWLEDGEABLE_PRIORITY)
    .map((e) => e.id);
  const rows = urgentIds.length
    ? await prisma.diaryEntryAcknowledgement.findMany({
        where: { entryId: { in: urgentIds } },
        orderBy: [{ acknowledgedAt: 'asc' }, { id: 'asc' }],
        select: {
          entryId: true,
          operatorId: true,
          operatorName: true,
          operatorRole: true,
          acknowledgedAt: true,
        },
      })
    : [];
  const byEntry = new Map<string, AckRow[]>();
  for (const row of rows) byEntry.set(row.entryId, [...(byEntry.get(row.entryId) ?? []), row]);
  const result = new Map<string, DiaryAckFields>();
  for (const entry of entries) {
    const acknowledgeable =
      entry.sourceType !== 'consegna' && entry.priority === ACKNOWLEDGEABLE_PRIORITY;
    const acks = acknowledgeable ? (byEntry.get(entry.id) ?? []) : [];
    result.set(entry.id, {
      acknowledgeable,
      acknowledgedByMe: acks.some((a) => a.operatorId === actor.id),
      acknowledgements: acks.map((a) => view(a, actor.id)),
    });
  }
  return result;
}

/**
 * Records the caller's «Presa visione» of an urgent entry. Idempotent per reader: returns
 * `created: false` (and the original time) when the caller had already acknowledged it.
 */
export async function acknowledgeDiaryEntry(patientId: string, entryId: string, actor: Operator) {
  const entry = await prisma.patientDiaryEntry.findFirst({
    where: { id: entryId, patientId, patient: patientScopeWhere(actor) },
    select: { id: true, patientId: true, priority: true },
  });
  if (!entry) throw new DiaryAckError(404, 'entry_not_found', 'Voce non trovata');
  if (entry.priority !== ACKNOWLEDGEABLE_PRIORITY)
    throw new DiaryAckError(
      409,
      'not_acknowledgeable',
      'La presa visione si registra solo sulle voci urgenti',
    );

  let created = false;
  let row = await prisma.diaryEntryAcknowledgement.findUnique({
    where: { entryId_operatorId: { entryId, operatorId: actor.id } },
  });
  if (!row) {
    const author = await authoritativeDiaryAuthor(actor);
    try {
      row = await prisma.diaryEntryAcknowledgement.create({
        data: {
          entryId,
          patientId: entry.patientId,
          operatorId: actor.id,
          operatorName: author.authorName,
          operatorRole: author.authorType,
        },
      });
      created = true;
    } catch (error) {
      // Concurrent double tap: the unique (entryId, operatorId) keeps the first one.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        row = await prisma.diaryEntryAcknowledgement.findUniqueOrThrow({
          where: { entryId_operatorId: { entryId, operatorId: actor.id } },
        });
      } else throw error;
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

  const fields = (await loadDiaryAckFields([{ id: entryId, priority: entry.priority }], actor)).get(
    entryId,
  )!;
  return {
    created,
    acknowledgement: view(row, actor.id),
    ...fields,
  };
}

/**
 * Proactive bridge: which of these diary entries has the operator acknowledged? Used by the
 * proactive inbox so that a diary signal whose entries were ALL acknowledged in the diary is
 * shown as «preso visione» for that operator too (same fact, same reader).
 */
export async function diaryEntriesAcknowledgedBy(
  operatorId: string,
  entryIds: string[],
): Promise<Set<string>> {
  if (entryIds.length === 0) return new Set();
  const rows = await prisma.diaryEntryAcknowledgement.findMany({
    where: { operatorId, entryId: { in: entryIds.slice(0, 1000) } },
    select: { entryId: true },
  });
  return new Set(rows.map((r) => r.entryId));
}
