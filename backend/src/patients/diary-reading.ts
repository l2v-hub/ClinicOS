import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  isAuthorAck,
  isAuthorOf,
  type AckRowLike,
  type UrgencySubject,
  type UrgencyTakenBy,
} from '../lib/urgency.js';
import { unreadDiaryIdsSql } from './diary-unread-query.js';

export interface DiaryReadReceipt {
  state: 'unread' | 'read';
  readBy: UrgencyTakenBy | null;
  isAuthor: boolean;
  canAcknowledge: boolean;
}

/** Only an explicit non-author receipt proves reading, regardless of priority or clinical status. */
export function diaryReadReceipt(
  subject: UrgencySubject,
  acks: readonly AckRowLike[],
  actor: { id: string; name?: string | null },
): DiaryReadReceipt {
  const isAuthor = isAuthorOf(subject, actor);
  const reader = acks.find((row) => !isAuthorAck(subject, row));
  return {
    state: reader ? 'read' : 'unread',
    readBy: reader
      ? {
          operatorName: reader.operatorName,
          operatorRole: reader.operatorRole,
          acknowledgedAt: reader.acknowledgedAt.toISOString(),
          byMe: reader.operatorId === actor.id,
        }
      : null,
    isAuthor,
    canAcknowledge: !reader && !isAuthor,
  };
}

/** Exact aggregate of the same two sources and predicate as the bounded unread queue. */
export async function countUnreadDiary(actor: Operator): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS count FROM (${unreadDiaryIdsSql(actor)}) unread
  `);
  const count = Number(rows[0]?.count ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid unread count');
  return count;
}
