import { API_URL } from '../config';

export interface PatientDocumentMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  documentType: string;
  sortOrder?: number;
  importJobId: string | null;
  createdAt: string;
}

export interface PatientDocumentPageInfo {
  loadedCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PatientDocumentPage {
  documents: PatientDocumentMeta[];
  sourceMatch: PatientDocumentMeta | null;
  pageInfo: PatientDocumentPageInfo;
}

export const EMPTY_DOCUMENT_PAGE_INFO: PatientDocumentPageInfo = {
  loadedCount: 0,
  hasMore: false,
  nextCursor: null,
};

export function patientDocumentsPageUrl(
  patientId: string,
  cursor?: string | null,
  sourceFileName?: string,
): string {
  const params = new URLSearchParams({ limit: '50' });
  if (cursor) params.set('cursor', cursor);
  if (sourceFileName) params.set('sourceFileName', sourceFileName);
  return `${API_URL}/patients/${encodeURIComponent(patientId)}/documents?${params.toString()}`;
}

export function parsePatientDocumentPage(value: unknown): PatientDocumentPage {
  const page = value as Partial<PatientDocumentPage> | null;
  if (!page || !Array.isArray(page.documents) || !page.pageInfo) throw new Error('invalid_page');
  const { loadedCount, hasMore, nextCursor } = page.pageInfo;
  if (
    !Number.isInteger(loadedCount) ||
    typeof hasMore !== 'boolean' ||
    (nextCursor !== null && typeof nextCursor !== 'string') ||
    (hasMore && !nextCursor)
  ) {
    throw new Error('invalid_page_info');
  }
  return {
    documents: page.documents,
    sourceMatch: page.sourceMatch ?? null,
    pageInfo: { loadedCount, hasMore, nextCursor },
  };
}

export function mergePatientDocuments(
  existing: PatientDocumentMeta[],
  incoming: PatientDocumentMeta[],
  sourceMatch: PatientDocumentMeta | null,
): PatientDocumentMeta[] {
  const merged = new Map(existing.map((document) => [document.id, document]));
  for (const document of incoming) merged.set(document.id, document);
  if (sourceMatch) merged.set(sourceMatch.id, sourceMatch);
  return [...merged.values()].sort(
    (left, right) =>
      (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.id.localeCompare(right.id),
  );
}
