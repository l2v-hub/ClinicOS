import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { ConsegnaCreateInput } from './write-validation.js';

export class ConsegnaCreationError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: 'consegna_request_conflict' | 'consegna_creation_deleted',
    public ids:
      { requestId: string; consegnaId: string; pazienteId: string } | undefined = undefined,
  ) {
    super(message);
    this.name = 'ConsegnaCreationError';
  }
}

/** Hash the normalized original intent, never a mutable record or current defaults. */
export function consegnaPayloadHash(input: ConsegnaCreateInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        v: 1,
        pazienteId: input.pazienteId,
        priorita: input.priorita,
        tipo: input.tipo,
        note: input.note,
        scadenza: input.scadenza ?? null,
        oraScadenza: input.oraScadenza,
        operatoreAssegnatoId: input.operatoreAssegnatoId,
      }),
    )
    .digest('hex');
}

/** Runs in the new row's transaction. Unique arbitration survives process loss. */
export async function claimConsegnaCreation(
  tx: Prisma.TransactionClient,
  actorId: string,
  input: ConsegnaCreateInput,
): Promise<{ consegnaId: string; replayed: boolean }> {
  const consegnaId = randomUUID();
  if (!input.requestId) return { consegnaId, replayed: false };
  const payloadHash = consegnaPayloadHash(input);
  const inserted = await tx.$queryRaw<Array<{ consegnaId: string }>>(Prisma.sql`
    INSERT INTO "ConsegnaCreationReceipt" ("actorId", "requestId", "payloadHash", "patientId", "consegnaId")
    VALUES (${actorId}, ${input.requestId}, ${payloadHash}, ${input.pazienteId}, ${consegnaId})
    ON CONFLICT ("actorId", "requestId") DO NOTHING RETURNING "consegnaId"
  `);
  if (inserted.length) return { consegnaId, replayed: false };
  const receipt = await tx.consegnaCreationReceipt.findUniqueOrThrow({
    where: { actorId_requestId: { actorId, requestId: input.requestId } },
  });
  if (receipt.payloadHash !== payloadHash || receipt.patientId !== input.pazienteId)
    throw new ConsegnaCreationError(
      'Questa richiesta corrisponde a una consegna diversa. Controlla il salvataggio.',
      409,
      'consegna_request_conflict',
    );
  return { consegnaId: receipt.consegnaId, replayed: true };
}
