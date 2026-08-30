export const PATIENT_DOCUMENT_PAGE_DEFAULT = 50;
export const PATIENT_DOCUMENT_PAGE_MAX = 100;

const MAX_CURSOR_LENGTH = 1024;
const MAX_POSITION_LENGTH = 200;
const MAX_PRISMA_INT = 2_147_483_647;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

interface PatientDocumentCursor {
  version: 1;
  patientId: string;
  sortOrder: number;
  id: string;
}

export type DecodedPatientDocumentCursor = Pick<PatientDocumentCursor, 'sortOrder' | 'id'>;

export function encodePatientDocumentCursor(
  patientId: string,
  document: DecodedPatientDocumentCursor,
): string {
  const cursor: PatientDocumentCursor = {
    version: 1,
    patientId,
    sortOrder: document.sortOrder,
    id: document.id,
  };
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodePatientDocumentCursor(
  raw: string,
  patientId: string,
): DecodedPatientDocumentCursor | null {
  if (!raw || raw.length > MAX_CURSOR_LENGTH || !BASE64URL.test(raw)) return null;

  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    if (Buffer.from(json, 'utf8').toString('base64url') !== raw) return null;

    const decoded = JSON.parse(json) as Partial<PatientDocumentCursor>;
    if (
      decoded.version !== 1 ||
      decoded.patientId !== patientId ||
      !Number.isSafeInteger(decoded.sortOrder) ||
      (decoded.sortOrder ?? -1) < 0 ||
      (decoded.sortOrder ?? MAX_PRISMA_INT + 1) > MAX_PRISMA_INT ||
      typeof decoded.id !== 'string' ||
      decoded.id.length === 0 ||
      decoded.id.length > MAX_POSITION_LENGTH
    ) {
      return null;
    }
    return { sortOrder: decoded.sortOrder, id: decoded.id } as DecodedPatientDocumentCursor;
  } catch {
    return null;
  }
}
