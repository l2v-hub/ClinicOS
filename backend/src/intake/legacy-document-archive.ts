import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { sniffMime } from '../ai/upload/mime-sniff.js';

export class LegacyDocumentArchiveError extends Error {
  constructor() {
    super('Originale non disponibile o non valido: il documento non è stato collegato.');
    this.name = 'LegacyDocumentArchiveError';
  }
}

export const LEGACY_ARCHIVE_SELECT = {
  id: true,
  fileName: true,
  fileType: true,
  fileData: true,
  createdAt: true,
} as const;
export type LegacyArchiveSource = Prisma.PatientIntakeDocumentGetPayload<{
  select: typeof LEGACY_ARCHIVE_SELECT;
}>;
export interface LegacyArchiveClient {
  patientDocument: {
    upsert(input: {
      where: { id: string };
      create: Prisma.PatientDocumentUncheckedCreateInput;
      update: Record<string, never>;
      select: { patientId: true };
    }): Promise<{ patientId: string }>;
  };
}

/** Copy once; retain the legacy source and original timestamp for historical retrieval. */
export async function persistLegacyIntakeDocument(
  client: LegacyArchiveClient,
  source: LegacyArchiveSource,
  patientId: string,
): Promise<void> {
  const bytes = Buffer.from(source.fileData, 'base64');
  const mimeType = sniffMime(bytes);
  if (
    !bytes.length ||
    bytes.length > 5 * 1024 * 1024 ||
    bytes.toString('base64') !== source.fileData.replace(/\s/g, '') ||
    !['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType) ||
    mimeType !== source.fileType
  )
    throw new LegacyDocumentArchiveError();
  const id = `legacy-intake-${source.id}`;
  const archived = await client.patientDocument.upsert({
    where: { id },
    create: {
      id,
      patientId,
      originalName: source.fileName.slice(0, 200) || 'documento',
      mimeType,
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      dataBase64: bytes.toString('base64'),
      documentType: 'lettera_dimissione',
      createdAt: source.createdAt,
    },
    update: {},
    select: { patientId: true },
  });
  if (archived.patientId !== patientId) throw new LegacyDocumentArchiveError();
}
