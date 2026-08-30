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

interface LegacyIntakeApplyClient {
  patient: {
    findUnique(input: {
      where: { id: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  patientIntakeDocument: {
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
  return result.count === 1 ? 'applied' : 'unavailable';
}
