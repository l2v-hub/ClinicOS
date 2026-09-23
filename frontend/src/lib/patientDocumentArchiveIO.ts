import { API_URL } from '../config';
import type { DocumentoConsegnato } from '../types';
import type { PatientDocumentMeta } from './patientDocumentsPage';
import { PAINAD_VERSION } from './assessments/assessmentTypes';
import { TRANSFERS_VERSION } from './assessments/transfersTypes';

export const DOCUMENT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const DOCUMENT_ACCEPT = '.pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png';
const DOCUMENT_UPLOAD_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const STORED_DOCUMENT_TYPES = new Set([
  ...DOCUMENT_UPLOAD_TYPES,
  'image/webp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const STORED_DOCUMENT_MAX_BYTES = 100 * 1024 * 1024;
export interface DocumentRequestScope {
  patientId: string;
  signal: AbortSignal;
  getHeaders: () => Promise<Record<string, string>>;
}
export function assertArchiveDocument(value: unknown): asserts value is PatientDocumentMeta {
  const row = value as Partial<PatientDocumentMeta> | null;
  if (
    !row ||
    typeof row.id !== 'string' ||
    !row.id ||
    typeof row.originalName !== 'string' ||
    !row.originalName ||
    typeof row.documentType !== 'string' ||
    typeof row.mimeType !== 'string' ||
    !Number.isSafeInteger(row.sizeBytes) ||
    row.sizeBytes! < 0 ||
    typeof row.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(row.createdAt))
  )
    throw new Error('Metadati documento non validi');
  if (
    (row.documentType === 'patient_assessment' && !row.assessment) ||
    (row.assessment !== undefined &&
      row.assessment !== null &&
      (typeof row.assessment !== 'object' ||
        row.documentType !== 'patient_assessment' ||
        typeof row.assessment.id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(row.assessment.id) ||
        !['painad', 'postural_transfers'].includes(row.assessment.type) ||
        row.assessment.formVersion !==
          (row.assessment.type === 'painad' ? PAINAD_VERSION : TRANSFERS_VERSION) ||
        typeof row.assessment.assessedAt !== 'string' ||
        !Number.isFinite(Date.parse(row.assessment.assessedAt))))
  )
    throw new Error('Associazione della valutazione non valida');
}
export function validateArchiveFile(file: File): string | null {
  if (!DOCUMENT_UPLOAD_TYPES.has(file.type)) return 'Seleziona un file PDF, JPEG, JPG o PNG.';
  if (!file.size || file.size > DOCUMENT_UPLOAD_MAX_BYTES)
    return 'Il file deve essere non vuoto e non superare 15 MB.';
  return null;
}
function documentUrl(patientId: string): string {
  return `${API_URL}/patients/${encodeURIComponent(patientId)}/documents`;
}

async function request(
  scope: DocumentRequestScope,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const signal = AbortSignal.any([scope.signal, AbortSignal.timeout(30_000)]);
  signal.throwIfAborted();
  const headers = await new Promise<Record<string, string>>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(scope.getHeaders)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
  signal.throwIfAborted();
  const response = await fetch(url, {
    ...init,
    headers: { ...headers, ...init.headers },
    signal,
    cache: 'no-store',
  });
  signal.throwIfAborted();
  if (!response.ok)
    throw new Error(
      response.status === 413
        ? 'File troppo grande: massimo 15 MB.'
        : response.status === 415
          ? 'Il file non è un’immagine o un PDF valido.'
          : 'Operazione sul documento non riuscita. Riprova.',
    );
  return response;
}

/** Read the entire bounded metadata set before filtering; file bytes remain lazy. */
export async function readDocumentArchive(
  scope: DocumentRequestScope,
  timeoutMs = 15_000,
): Promise<PatientDocumentMeta[]> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  scope.signal.addEventListener('abort', cancel, { once: true });
  if (scope.signal.aborted) cancel();
  const timer = setTimeout(cancel, timeoutMs);
  const items = new Map<string, PatientDocumentMeta>();
  const seen = new Set<string>();
  let cursor: string | null = null;
  let expected = 0;
  try {
    for (let pageIndex = 0; pageIndex < 100; pageIndex++) {
      const params = new URLSearchParams({ limit: '50' });
      if (cursor) params.set('cursor', cursor);
      const response = await request(
        { ...scope, signal: controller.signal },
        `${documentUrl(scope.patientId)}?${params}`,
      );
      const page = await response.json();
      controller.signal.throwIfAborted();
      if (
        !page ||
        !Array.isArray(page.documents) ||
        page.documents.length > 50 ||
        !page.pageInfo ||
        typeof page.pageInfo.hasMore !== 'boolean' ||
        page.pageInfo.loadedCount !== page.documents.length ||
        (page.pageInfo.hasMore
          ? typeof page.pageInfo.nextCursor !== 'string' ||
            !page.pageInfo.nextCursor ||
            !page.documents.length
          : page.pageInfo.nextCursor !== null)
      )
        throw new Error('Archivio incompleto. Riprova.');
      if (pageIndex === 0) {
        if (!Number.isSafeInteger(page.total) || page.total < 0 || page.total > 5000)
          throw new Error('Archivio oltre il limite o riepilogo non valido.');
        expected = page.total;
      }
      for (const document of page.documents) {
        assertArchiveDocument(document);
        if (items.has(document.id))
          throw new Error('Archivio modificato durante il caricamento. Riprova.');
        items.set(document.id, document);
      }
      if (!page.pageInfo.hasMore) {
        if (items.size !== expected) throw new Error('Archivio incompleto. Riprova.');
        return [...items.values()];
      }
      if (seen.has(page.pageInfo.nextCursor)) throw new Error('Paginazione archivio non valida.');
      cursor = page.pageInfo.nextCursor;
      seen.add(cursor!);
    }
    throw new Error('Archivio oltre il limite operativo.');
  } finally {
    clearTimeout(timer);
    scope.signal.removeEventListener('abort', cancel);
  }
}

export async function uploadArchiveDocument(
  scope: DocumentRequestScope,
  file: File,
  type: string,
): Promise<PatientDocumentMeta> {
  if (type === 'patient_assessment')
    throw new Error('I PDF delle valutazioni vengono generati dalla scheda del modulo.');
  const error = validateArchiveFile(file);
  if (error) throw new Error(error);
  const body = new FormData();
  body.append('file', file);
  body.append('documentType', type);
  const response = await request(scope, documentUrl(scope.patientId), { method: 'POST', body });
  const result = await response.json();
  scope.signal.throwIfAborted();
  assertArchiveDocument(result.document);
  return result.document;
}
export async function classifyArchiveDocument(
  scope: DocumentRequestScope,
  id: string,
  type: string,
): Promise<PatientDocumentMeta> {
  if (type === 'patient_assessment')
    throw new Error('Categoria riservata alle valutazioni finali.');
  const response = await request(
    scope,
    `${documentUrl(scope.patientId)}/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentType: type }),
    },
  );
  const result = await response.json();
  scope.signal.throwIfAborted();
  assertArchiveDocument(result.document);
  if (result.document.id !== id || result.document.documentType !== type)
    throw new Error('Risposta documento non valida.');
  return result.document;
}
export async function readArchiveDocumentMetadata(
  scope: DocumentRequestScope,
  id: string,
): Promise<PatientDocumentMeta> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Documento non valido.');
  const response = await request(
    scope,
    `${documentUrl(scope.patientId)}/${encodeURIComponent(id)}`,
  );
  const result = await response.json();
  scope.signal.throwIfAborted();
  assertArchiveDocument(result.document);
  if (result.document.id !== id) throw new Error('Documento non corrispondente.');
  return result.document;
}
export async function readArchiveDocumentContent(
  scope: DocumentRequestScope,
  id: string,
): Promise<Blob> {
  const response = await request(
    scope,
    `${documentUrl(scope.patientId)}/${encodeURIComponent(id)}/content`,
  );
  if (Number(response.headers.get('Content-Length')) > STORED_DOCUMENT_MAX_BYTES)
    throw new Error('Documento oltre il limite di lettura (100 MB).');
  const blob = await response.blob();
  scope.signal.throwIfAborted();
  if (
    !STORED_DOCUMENT_TYPES.has(blob.type.split(';')[0]) ||
    !blob.size ||
    blob.size > STORED_DOCUMENT_MAX_BYTES
  )
    throw new Error('Contenuto documento non valido.');
  return blob;
}

/** Retain the uploaded id before saving the record: a failed second write must not duplicate bytes. */
export async function saveArchiveEntry(
  input: {
    record: DocumentoConsegnato;
    records: DocumentoConsegnato[];
    file: File | null;
    stored: PatientDocumentMeta | null;
    signal: AbortSignal;
  },
  deps: {
    upload: (file: File, type: string) => Promise<PatientDocumentMeta>;
    classify: (id: string, type: string) => Promise<PatientDocumentMeta>;
    remember: (document: PatientDocumentMeta) => void;
    persist: (records: DocumentoConsegnato[]) => void | Promise<boolean>;
  },
): Promise<void> {
  input.signal.throwIfAborted();
  if (
    input.stored?.assessment ||
    input.stored?.documentType === 'patient_assessment' ||
    input.record.tipo === 'patient_assessment'
  )
    throw new Error('Le valutazioni finali si modificano solo attraverso una rettifica.');
  let stored = input.stored;
  if (!stored && input.file) {
    stored = await deps.upload(input.file, input.record.tipo);
    input.signal.throwIfAborted();
    deps.remember(stored);
  }
  if (stored && stored.documentType !== input.record.tipo) {
    stored = await deps.classify(stored.id, input.record.tipo);
    input.signal.throwIfAborted();
    deps.remember(stored);
  }
  const record = { ...input.record, ...(stored ? { patientDocumentId: stored.id } : {}) };
  input.signal.throwIfAborted();
  const ok = await deps.persist([record, ...input.records.filter((item) => item.id !== record.id)]);
  input.signal.throwIfAborted();
  if (ok === false)
    throw new Error(
      stored
        ? 'File conservato nell’archivio. Salvataggio dei dettagli non riuscito: riprova.'
        : 'Salvataggio non riuscito: riprova.',
    );
}
