import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { jsonInput, type Tx } from './model.js';
import { lockJob } from './repository.js';

/** Explicitly ending a temporary session removes its clinical payloads, including receipts. */
export async function clearPageSession(tx: Tx, jobId: string, status: 'cancelled' | 'expired') {
  await tx.importJob.update({
    where: { id: jobId },
    data: {
      status,
      runToken: null,
      runRevision: null,
      leaseExpiresAt: null,
      totalBytes: 0,
      manifestRevision: { increment: 1 },
      manifest: jsonInput({ version: 1, groups: [], pages: [] }),
      resultData: Prisma.DbNull,
      resultSummary: Prisma.DbNull,
      currentFileName: null,
      error: null,
      errorCode: null,
      stage: null,
    },
  });
  await tx.importDocument.deleteMany({ where: { jobId } });
  await tx.importProcessingUnit.deleteMany({ where: { jobId } });
  await tx.importMutation.deleteMany({ where: { jobId } });
}

export async function expirePageSessions(now = new Date()) {
  const candidates = await prisma.importJob.findMany({
    where: {
      manifest: { path: ['version'], equals: 1 },
      expiresAt: { lt: now },
      status: { notIn: ['confirmed', 'expired', 'cancelled'] },
    },
    select: { id: true },
  });
  let count = 0;
  for (const candidate of candidates) {
    count += await prisma.$transaction(async (tx) => {
      const job = await lockJob(tx, candidate.id);
      if (
        job.expiresAt >= now ||
        ['confirmed', 'expired', 'cancelled'].includes(job.status) ||
        (job.status === 'processing_pages' && job.leaseExpiresAt && job.leaseExpiresAt > now)
      )
        return 0;
      await clearPageSession(tx, job.id, 'expired');
      return 1;
    });
  }
  return count;
}
