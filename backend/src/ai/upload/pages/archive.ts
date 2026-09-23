import { createHash } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import { canAccessOwnedResource } from '../../ownership-policy.js';
import {
  ImportSessionError,
  hash,
  jsonInput,
  manifest,
  object,
  orderPages,
  type Json,
  type Tx,
} from './model.js';
import { groupPdf, verifiedBytes } from './pdf.js';
import { assertCurrentReview, assertDraftSource, importSource } from './review.js';

type Actor = { id: string; role: string };
type File = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  dataBase64: string;
  sortOrder: number;
  sourceManifest: Json;
};
export type PreparedPageArchive = {
  jobId: string;
  manifestHash: string;
  source: Json;
  files: File[];
};

/** PDF preparation happens before transaction locks; the exact source is rechecked at commit. */
export async function preparePageArchive(
  target: { draftId?: string; jobId?: string },
  actor: Actor,
): Promise<PreparedPageArchive | null> {
  let jobId = target.jobId;
  if (target.draftId) {
    const draft = await prisma.patientIntakeDraft.findUnique({
      where: { id: target.draftId },
      select: { importJobId: true, createdById: true, data: true },
    });
    if (!draft || !canAccessOwnedResource(actor, draft.createdById))
      throw new ImportSessionError(404, 'not_found', 'Bozza non trovata');
    // Legacy/manual drafts need no page preparation. Their existing confirmation
    // transaction remains the authority for job linkage and archive persistence.
    if (!object(draft.data)._importSource) return null;
    jobId = draft.importJobId ?? undefined;
  }
  if (!jobId) return null;
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job || !canAccessOwnedResource(actor, job.createdById))
    throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
  if (object(job.manifest).version !== 1 || job.createdPatientId) return null;
  const result = assertCurrentReview(job);
  const m = manifest(job.manifest),
    source = importSource(result);
  const documents = await prisma.importDocument.findMany({
    where: { jobId, id: { in: [...new Set(m.pages.map((p) => p.documentId))] } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  const byId = new Map(documents.map((d) => [d.id, d]));
  if (byId.size !== new Set(m.pages.map((p) => p.documentId)).size)
    throw new ImportSessionError(422, 'source_missing', 'Un documento originale non è disponibile');
  const files: File[] = [];
  for (const doc of documents) {
    const bytes = await verifiedBytes(doc);
    files.push({
      id: `import-${doc.id}`,
      originalName: doc.filename,
      mimeType: doc.mimeType,
      sizeBytes: bytes.length,
      sha256: doc.sha256,
      dataBase64: bytes.toString('base64'),
      sortOrder: files.length,
      sourceManifest: { version: 1, kind: 'original', documentId: doc.id, ...source },
    });
  }
  for (const group of [...m.groups].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const bytes = await groupPdf(m, group.id, async (id) => {
      const document = byId.get(id);
      if (!document)
        throw new ImportSessionError(
          422,
          'source_missing',
          'Un documento originale non è disponibile',
        );
      return document;
    });
    files.push({
      id: `import-group-${jobId}-${group.id}`,
      originalName: `${group.label}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      dataBase64: bytes.toString('base64'),
      sortOrder: files.length,
      sourceManifest: {
        version: 1,
        kind: 'group',
        groupId: group.id,
        label: group.label,
        pages: orderPages(m, group.id),
        ...source,
      },
    });
  }
  return { jobId, manifestHash: hash(m), source, files };
}

export function assertPreparedPageArchive(
  job: {
    id: string;
    manifest: unknown;
    status: string;
    manifestRevision: number;
    resultData: unknown;
  },
  draftData: Json | undefined,
  prepared: PreparedPageArchive | null,
  pair?: unknown,
) {
  const result = assertCurrentReview(job, pair);
  if (
    !prepared ||
    prepared.jobId !== job.id ||
    prepared.manifestHash !== hash(job.manifest) ||
    hash(prepared.source) !== hash(importSource(result))
  )
    throw new ImportSessionError(
      409,
      'import_review_outdated',
      'Le pagine sono cambiate durante la preparazione. Rivedi la sessione.',
    );
  if (!draftData)
    throw new ImportSessionError(
      409,
      'draft_required',
      'Apri la revisione della bozza prima di confermare',
    );
  assertDraftSource(draftData, result);
}

export async function persistPageArchive(
  tx: Tx,
  patientId: string,
  prepared: PreparedPageArchive,
  createdById: string,
) {
  const ids = prepared.files.map((f) => f.id);
  await tx.patientDocument.createMany({
    skipDuplicates: true,
    data: prepared.files.map((file) => ({
      ...file,
      patientId,
      importJobId: prepared.jobId,
      createdById,
      sourceManifest: jsonInput(file.sourceManifest),
      documentType: 'discharge_import',
    })),
  });
  const saved = await tx.patientDocument.findMany({
    where: { id: { in: ids } },
    select: { id: true, patientId: true, sha256: true, sizeBytes: true },
  });
  if (
    saved.length !== ids.length ||
    saved.some(
      (row) =>
        row.patientId !== patientId ||
        row.sha256 !== prepared.files.find((f) => f.id === row.id)?.sha256 ||
        row.sizeBytes !== prepared.files.find((f) => f.id === row.id)?.sizeBytes,
    )
  )
    throw new ImportSessionError(
      409,
      'archive_conflict',
      'Non è stato possibile archiviare tutti i documenti; la conferma non è stata salvata',
    );
}
