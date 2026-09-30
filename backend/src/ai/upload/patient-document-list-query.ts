// Query parsing of GET /patients/:patientId/documents, moved verbatim from the route handler so the
// route and the Tool Layer (`documents.list`) apply the same bounds and error codes.

import {
  decodePatientDocumentCursor,
  PATIENT_DOCUMENT_PAGE_DEFAULT,
  PATIENT_DOCUMENT_PAGE_MAX,
  type DecodedPatientDocumentCursor,
} from './patient-document-cursor.js';

export class PatientDocumentListQueryError extends Error {
  readonly status = 400;

  constructor(
    message: string,
    readonly code: 'invalid_limit' | 'invalid_cursor' | 'invalid_source_name',
  ) {
    super(message);
    this.name = 'PatientDocumentListQueryError';
  }
}

export interface PatientDocumentListQuery {
  limit: number;
  cursor?: DecodedPatientDocumentCursor;
  sourceFileName?: string;
}

export function parsePatientDocumentListQuery(
  query: Record<string, unknown>,
  patientId: string,
): PatientDocumentListQuery {
  const rawLimit = typeof query.limit === 'string' ? query.limit : undefined;
  const parsedLimit = rawLimit === undefined ? PATIENT_DOCUMENT_PAGE_DEFAULT : Number(rawLimit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throw new PatientDocumentListQueryError('Parametro limit non valido', 'invalid_limit');
  }
  const limit = Math.min(parsedLimit, PATIENT_DOCUMENT_PAGE_MAX);
  const rawCursor = typeof query.cursor === 'string' ? query.cursor : undefined;
  const decodedCursor = rawCursor ? decodePatientDocumentCursor(rawCursor, patientId) : null;
  if (rawCursor && !decodedCursor) {
    throw new PatientDocumentListQueryError('Cursore non valido', 'invalid_cursor');
  }
  const rawSourceFileName =
    typeof query.sourceFileName === 'string' ? query.sourceFileName.trim() : '';
  if (rawSourceFileName.length > 200) {
    throw new PatientDocumentListQueryError('Nome sorgente non valido', 'invalid_source_name');
  }
  return {
    limit,
    cursor: decodedCursor ?? undefined,
    sourceFileName: rawSourceFileName || undefined,
  };
}
