import { prisma } from '../../../lib/prisma.js';
import {
  ImportSessionError,
  hash,
  jsonInput,
  object,
  renewedExpiry,
  sourcePair,
  type Json,
} from './model.js';
import { getPageJob, lockJob } from './repository.js';
import type { Conflict, Decision, GroupResult } from './results.js';
export function assertCurrentReview(
  job: { status: string; manifestRevision: number; resultData: unknown },
  pair?: unknown,
  requireComplete = true,
) {
  const data = object(job.resultData);
  const source = sourcePair(data);
  const requested = pair ? object(pair) : source;
  if (
    job.status !== 'review_ready' ||
    source.manifestRevision !== job.manifestRevision ||
    requested.manifestRevision !== source.manifestRevision ||
    requested.resultHash !== source.resultHash
  )
    throw new ImportSessionError(
      409,
      'import_review_outdated',
      'La revisione delle pagine è cambiata. Rivedi i documenti.',
      { manifestRevision: job.manifestRevision },
    );
  const unresolved = object(data._review).unresolvedConflictIds;
  if (requireComplete && (!Array.isArray(unresolved) || unresolved.length))
    throw new ImportSessionError(
      409,
      'unresolved_conflicts',
      'Scegli come gestire ogni informazione discordante prima di continuare',
    );
  return data;
}
export function reviewHash(data: unknown) {
  return hash(object(object(data)._review).decisions ?? []);
}
export function importSource(data: unknown) {
  const d = object(data);
  const groups = (d._groups ?? []) as GroupResult[];
  const pair = sourcePair(d);
  return {
    manifestRevision: Number(pair.manifestRevision),
    resultHash: String(pair.resultHash),
    reviewHash: reviewHash(d),
    groupHashes: Object.fromEntries(groups.map((g) => [g.groupId, g.inputHash])),
  };
}
export async function saveReview(jobId: string, body: unknown) {
  const b = object(body);
  await prisma.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    const data = assertCurrentReview(job, b, false);
    const conflicts = (data._conflicts ?? []) as Conflict[];
    if (!Array.isArray(b.decisions) || b.decisions.length > conflicts.length)
      throw new ImportSessionError(400, 'invalid_decisions', 'Decisioni non valide');
    const seen = new Set<string>();
    const decisions: Decision[] = b.decisions.map((raw) => {
      const d = object(raw);
      const c = conflicts.find((x) => x.id === d.conflictId);
      if (!c || seen.has(c.id) || !['select', 'defer'].includes(String(d.action)))
        throw new ImportSessionError(
          400,
          'invalid_decisions',
          'Decisione non appartenente alla revisione',
        );
      seen.add(c.id);
      if (d.action === 'defer') return { conflictId: c.id, action: 'defer' };
      if (!c.candidates.some((x) => x.id === d.candidateId))
        throw new ImportSessionError(
          400,
          'invalid_decisions',
          'Candidato non appartenente al conflitto',
        );
      return { conflictId: c.id, action: 'select', candidateId: String(d.candidateId) };
    });
    data._review = {
      decisions,
      unresolvedConflictIds: conflicts.filter((c) => !seen.has(c.id)).map((c) => c.id),
    };
    const summary = {
      ...object(job.resultSummary),
      unresolvedConflicts: conflicts.length - seen.size,
      reviewHash: reviewHash(data),
    };
    await tx.importJob.update({
      where: { id: jobId },
      data: {
        resultData: jsonInput(data),
        resultSummary: jsonInput(summary),
        expiresAt: renewedExpiry(),
      },
    });
  });
  const job = await getPageJob(jobId);
  const row = await prisma.importJob.findUniqueOrThrow({
    where: { id: jobId },
    select: { resultData: true },
  });
  return { job, review: object(row.resultData)._review };
}
export function assertDraftSource(data: Json, result: Json) {
  const current = importSource(result);
  const previous = object(data._importSource);
  if (
    previous.manifestRevision !== current.manifestRevision ||
    previous.resultHash !== current.resultHash ||
    previous.reviewHash !== current.reviewHash
  )
    throw new ImportSessionError(
      409,
      'import_review_outdated',
      'Rivedi le nuove pagine prima di confermare',
    );
}
