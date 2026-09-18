import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Prisma } from '@prisma/client';
import { AiExtractionError } from '../types.js';

type ArchiveClient = Pick<Prisma.TransactionClient, 'importDocument' | 'patientDocument'>;
const ARCHIVE_FAILURE =
  'Impossibile archiviare tutti i documenti originali. La conferma non è stata salvata: riprova oppure carica nuovamente il file non disponibile.';

function validBytes(data: Buffer, sizeBytes: number, sha256: string): boolean {
  return (
    data.length > 0 &&
    data.length === sizeBytes &&
    createHash('sha256').update(data).digest('hex') === sha256
  );
}

/** All originals are required: a missing/corrupt file must roll back patient confirmation. */
export async function persistImportDocuments(
  tx: ArchiveClient,
  patientId: string,
  jobId: string,
  createdById?: string,
): Promise<number> {
  try {
    const docs = await tx.importDocument.findMany({
      where: { jobId, status: 'uploaded' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const existing = await tx.patientDocument.findMany({
      where: { patientId, importJobId: jobId },
      select: { sha256: true },
    });
    const archivedHashes = new Set(existing.map((document) => document.sha256));
    const pending = [];
    for (const document of docs) {
      if (archivedHashes.has(document.sha256)) continue;
      let bytes = document.dataBase64 ? Buffer.from(document.dataBase64, 'base64') : null;
      if (!bytes || !validBytes(bytes, document.sizeBytes, document.sha256)) {
        bytes = await readFile(document.storagePath);
      }
      if (!validBytes(bytes, document.sizeBytes, document.sha256))
        throw new AiExtractionError('config', ARCHIVE_FAILURE);
      pending.push({ document, dataBase64: bytes.toString('base64') });
    }

    if (pending.length) {
      // Native INSERT ON CONFLICT avoids Prisma's read-then-insert empty-update upsert race.
      await tx.patientDocument.createMany({
        skipDuplicates: true,
        data: pending.map(({ document, dataBase64 }) => ({
          id: `import-${document.id}`,
          patientId,
          importJobId: jobId,
          originalName: document.filename,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          sha256: document.sha256,
          dataBase64,
          documentType: 'discharge_import',
          sortOrder: document.sortOrder,
          ...(createdById ? { createdById } : {}),
        })),
      });
      const saved = await tx.patientDocument.findMany({
        where: { id: { in: pending.map(({ document }) => `import-${document.id}`) } },
        select: { patientId: true },
      });
      if (saved.length !== pending.length || saved.some((row) => row.patientId !== patientId))
        throw new AiExtractionError('config', ARCHIVE_FAILURE);
    }
    return docs.length;
  } catch {
    // Prisma failures may embed file bytes/clinical values in their message. Keep every
    // upstream response, logger and confirmation audit on this fixed, content-free error.
    throw new AiExtractionError('config', ARCHIVE_FAILURE);
  }
}
