import {
  LEGACY_ARCHIVE_SELECT,
  LegacyDocumentArchiveError,
  persistLegacyIntakeDocument,
  type LegacyArchiveClient,
  type LegacyArchiveSource,
} from './legacy-document-archive.js';

export class LegacyIntakeApplyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyIntakeApplyInputError';
  }
}

export interface LegacyIntakeApplyInput {
  documentId: string;
  patientId: string;
}

interface LegacyIntakeApplyClient extends LegacyArchiveClient {
  patient: {
    findUnique(input: {
      where: { id: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  patientIntakeDocument: {
    findFirst(input: {
      where: { id: string; status: 'applied'; patientId: string };
      select: typeof LEGACY_ARCHIVE_SELECT;
    }): Promise<LegacyArchiveSource | null>;
    updateMany(input: {
      where: { id: string; status: 'extracted'; patientId: null };
      data: { patientId: string; status: 'applied' };
    }): Promise<{ count: number }>;
  };
}

const APPLY_KEYS = new Set(['documentId', 'patientId']);
const RESOURCE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function parseLegacyIntakeApplyInput(body: unknown): LegacyIntakeApplyInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new LegacyIntakeApplyInputError('Payload non valido');
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !APPLY_KEYS.has(key))) {
    throw new LegacyIntakeApplyInputError('Payload non valido');
  }
  const documentId = typeof input.documentId === 'string' ? input.documentId.trim() : '';
  const patientId = typeof input.patientId === 'string' ? input.patientId.trim() : '';
  if (!RESOURCE_ID.test(documentId) || !RESOURCE_ID.test(patientId)) {
    throw new LegacyIntakeApplyInputError('Documento o paziente non valido');
  }
  return { documentId, patientId };
}

export async function applyLegacyIntakeDocument(
  client: LegacyIntakeApplyClient,
  input: LegacyIntakeApplyInput,
): Promise<'applied' | 'unavailable'> {
  const patient = await client.patient.findUnique({
    where: { id: input.patientId },
    select: { id: true },
  });
  if (!patient) return 'unavailable';

  const result = await client.patientIntakeDocument.updateMany({
    where: { id: input.documentId, status: 'extracted', patientId: null },
    data: { patientId: input.patientId, status: 'applied' },
  });
  if (result.count !== 1) return 'unavailable';
  const source = await client.patientIntakeDocument.findFirst({
    where: { id: input.documentId, status: 'applied', patientId: input.patientId },
    select: LEGACY_ARCHIVE_SELECT,
  });
  if (!source) throw new LegacyDocumentArchiveError();
  await persistLegacyIntakeDocument(client, source, input.patientId);
  return 'applied';
}
