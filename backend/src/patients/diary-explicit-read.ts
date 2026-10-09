import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { AckRowLike } from '../lib/urgency.js';

type ReadDb = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;
export type DiaryReadSource = 'diary' | 'consegna';

/** Read receipts are separate append-only facts, never urgency acknowledgements. */
export async function loadExplicitDiaryReads(
  source: DiaryReadSource,
  ids: readonly string[],
  db: ReadDb = prisma,
): Promise<Map<string, AckRowLike[]>> {
  const result = new Map<string, AckRowLike[]>();
  if (!ids.length) return result;
  const rows = await db.$queryRaw<Array<AckRowLike & { subjectId: string }>>(
    source === 'diary'
      ? Prisma.sql`SELECT "entryId" AS "subjectId", "operatorId", "operatorName", "operatorRole", "acknowledgedAt"
        FROM "DiaryEntryReadReceipt" WHERE "entryId" IN (${Prisma.join([...new Set(ids)])}) ORDER BY "acknowledgedAt", "id"`
      : Prisma.sql`SELECT "consegnaId" AS "subjectId", "operatorId", "operatorName", "operatorRole", "acknowledgedAt"
        FROM "ConsegnaReadReceipt" WHERE "consegnaId" IN (${Prisma.join([...new Set(ids)])}) ORDER BY "acknowledgedAt", "id"`,
  );
  for (const row of rows) result.set(row.subjectId, [...(result.get(row.subjectId) ?? []), row]);
  return result;
}

/** Caller holds the same subject lock as the legacy urgency action and has checked scope/author. */
export async function insertExplicitDiaryRead(
  source: DiaryReadSource,
  subjectId: string,
  patientId: string,
  actor: { id: string; name: string; role: string },
  db: ReadDb,
) {
  const id = randomUUID();
  await db.$executeRaw(
    source === 'diary'
      ? Prisma.sql`INSERT INTO "DiaryEntryReadReceipt" ("id", "entryId", "patientId", "operatorId", "operatorName", "operatorRole")
        VALUES (${id}, ${subjectId}, ${patientId}, ${actor.id}, ${actor.name}, ${actor.role})`
      : Prisma.sql`INSERT INTO "ConsegnaReadReceipt" ("id", "consegnaId", "patientId", "operatorId", "operatorName", "operatorRole")
        VALUES (${id}, ${subjectId}, ${patientId}, ${actor.id}, ${actor.name}, ${actor.role})`,
  );
}

/** Urgency takeover also proves reading; old facts remain untouched and win by original time. */
export function mergedDiaryReads(urgency: readonly AckRowLike[], reads: readonly AckRowLike[]) {
  return [...urgency, ...reads].sort(
    (a, b) => a.acknowledgedAt.getTime() - b.acknowledgedAt.getTime(),
  );
}
