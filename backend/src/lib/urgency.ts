// UX2 W8 — one urgency model for the diary and the handovers (owner decision 2026-10-03).
//
// Someone writes a note quickly; if they mark it URGENT it is signalled until the FIRST operator
// other than the author says «Ho capito». From then on it is «urgenza presa in carico» for
// everyone: the trace (who, role, when) stays on the item, but it is no longer counted or flagged
// as urgent anywhere (badges, Turno, KPI, notification centre, proactive signals, assistant).
//
// - The author never takes charge of their own urgency (server 409 + button hidden).
// - Legacy rows: a handover whose stored stato is 'completata' (or a diary entry whose stored
//   status is 'completata') was already closed under the old model → not an active urgency (shown
//   as «Urgenza chiusa», no trace). Stored stato/status values are never rewritten.
// - Only 'urgente' is urgent; the legacy intermediate level (alta / importante) is not.

import { Prisma } from '@prisma/client';

export const URGENT_PRIORITY = 'urgente';

export type UrgencyState = 'none' | 'active' | 'taken';

export interface UrgencyTakenBy {
  operatorName: string;
  operatorRole: string;
  acknowledgedAt: string;
  /** true when the caller is the one who took charge. Operator ids are never disclosed. */
  byMe: boolean;
}

export interface UrgencyView {
  state: UrgencyState;
  /** null when not urgent, still active, or closed under the old model (legacy, no trace). */
  takenBy: UrgencyTakenBy | null;
  /** The caller wrote the item (the author cannot take charge of their own urgency). */
  isAuthor: boolean;
  /** The caller may say «Ho capito» now (active urgency, not the author). */
  canAcknowledge: boolean;
}

export const SELF_ACK_MESSAGE =
  'Hai scritto tu questa urgenza: la presa in carico spetta a un altro operatore.';
export const NOT_URGENT_MESSAGE = 'La presa in carico si registra solo sulle voci urgenti.';

export class UrgencyAckError extends Error {
  constructor(
    readonly status: 404 | 409,
    readonly code:
      'not_found' | 'entry_not_found' | 'not_acknowledgeable' | 'author_cannot_acknowledge',
    message: string,
  ) {
    super(message);
    this.name = 'UrgencyAckError';
  }
}

export interface AckRowLike {
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  acknowledgedAt: Date;
}

export interface UrgencySubject {
  priority: string;
  /** Stored legacy closure ('completata'): closed under the old model. */
  legacyClosed: boolean;
  /** Author operator id when known (null on legacy rows). */
  authorId: string | null;
  /** Author display name (fallback identity for legacy rows without authorId). */
  authorName: string;
}

/** An ack row written by the author (legacy rows: by name). Never ends the urgency. */
export function isAuthorAck(
  subject: UrgencySubject,
  ack: Pick<AckRowLike, 'operatorId' | 'operatorName'>,
) {
  return subject.authorId
    ? ack.operatorId === subject.authorId
    : ack.operatorName.trim() === subject.authorName.trim();
}

export function isAuthorOf(
  subject: UrgencySubject,
  actor: { id: string; name?: string | null },
): boolean {
  if (subject.authorId) return subject.authorId === actor.id;
  const name = actor.name?.trim();
  return Boolean(name) && name === subject.authorName.trim();
}

/** Pure projection: acks MUST be sorted by acknowledgedAt asc (first non-author ack wins). */
export function urgencyView(
  subject: UrgencySubject,
  acks: readonly AckRowLike[],
  actor: { id: string; name?: string | null },
): UrgencyView {
  const isAuthor = isAuthorOf(subject, actor);
  if (subject.priority !== URGENT_PRIORITY)
    return { state: 'none', takenBy: null, isAuthor, canAcknowledge: false };
  const taker = acks.find((a) => !isAuthorAck(subject, a));
  if (taker)
    return {
      state: 'taken',
      takenBy: {
        operatorName: taker.operatorName,
        operatorRole: taker.operatorRole,
        acknowledgedAt: taker.acknowledgedAt.toISOString(),
        byMe: taker.operatorId === actor.id,
      },
      isAuthor,
      canAcknowledge: false,
    };
  if (subject.legacyClosed)
    return { state: 'taken', takenBy: null, isAuthor, canAcknowledge: false };
  return { state: 'active', takenBy: null, isAuthor, canAcknowledge: !isAuthor };
}

/** SQL predicate: handover (alias `c`) is an ACTIVE urgency. Same rule as urgencyView. */
export const consegnaUrgencyActiveSql = Prisma.sql`(
  c."priorita" = 'urgente' AND c."stato" <> 'completata' AND NOT EXISTS (
    SELECT 1 FROM "ConsegnaAcknowledgement" ua
    WHERE ua."consegnaId" = c."id"
      AND (c."creatoDaId" IS NULL OR ua."operatorId" <> c."creatoDaId")
  )
)`;

/** SQL predicate: handover (alias `c`) is an urgency already taken in charge (or legacy-closed). */
export const consegnaUrgencyTakenSql = Prisma.sql`(
  c."priorita" = 'urgente' AND NOT ${consegnaUrgencyActiveSql}
)`;

/** SQL predicate: diary entry (alias `d`) is an ACTIVE urgency. Same rule as urgencyView. */
export const diaryUrgencyActiveSql = Prisma.sql`(
  d."priority" = 'urgente' AND d."status" <> 'completata' AND NOT EXISTS (
    SELECT 1 FROM "DiaryEntryAcknowledgement" ua
    WHERE ua."entryId" = d."id"
      AND CASE WHEN d."authorId" IS NOT NULL THEN ua."operatorId" <> d."authorId"
               ELSE trim(ua."operatorName") <> trim(d."authorName") END
  )
)`;
