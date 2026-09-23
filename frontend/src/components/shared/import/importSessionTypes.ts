import type { NarrativeDraft } from '../sections/deriveSections';
import type { SectionsResult } from '../sections/types';

export type ImportActor = { operatorId?: string; operatorRole?: string };
export type UnitStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface ImportPage {
  id: string;
  documentId: string;
  sourcePageNumber: number;
  groupId: string;
  sortOrder: number;
  status: UnitStatus;
  canRetry: boolean;
  errorCode: string | null;
  error: string | null;
}
export interface ImportGroup {
  id: string;
  label: string;
  sortOrder: number;
  status: UnitStatus;
  pageCount: number;
  completedPages: number;
  error: string | null;
  pdfUrl: string | null;
}
export interface ImportDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  contentUrl: string;
}
export interface ImportManifest {
  version: 1;
  revision: number;
  groups: ImportGroup[];
  pages: ImportPage[];
}
export interface ImportJob {
  id: string;
  status: string;
  error?: string | null;
  canRetry?: boolean;
  expiresAt?: string;
  totalBytes: number;
  documents: ImportDocument[];
  capabilities: { sessionVersion: 1; pageEditing: boolean; atomicReplacement: boolean };
  manifest: ImportManifest;
  limits: {
    maxPages: number;
    maxSourceFiles: number;
    maxGroups: number;
    maxTotalBytes: number;
    maxFileBytes: number;
    maxFilesPerRequest: number;
    maxRequestBytes: number;
    acceptedMimeTypes: string[];
  };
  progress: {
    phase: 'documents' | 'ocr' | 'extraction' | 'review' | 'error';
    totalPages: number;
    completedPages: number;
    failedPages: number;
    totalGroups: number;
    completedGroups: number;
    currentPageId: string | null;
    currentGroupId: string | null;
  };
  review: {
    manifestRevision: number | null;
    resultHash: string | null;
    unresolvedConflicts: number;
    canProceed: boolean;
    draftId: string | null;
    draftSourceIsCurrent: boolean;
  };
}
export interface ImportOutcome {
  filename: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  documentId?: string;
  clientFileId: string;
  pageIds: string[];
  message?: string;
  reason?: string;
}
export interface ImportSource {
  manifestRevision: number;
  resultHash: string;
}
export type ConflictDecision =
  | { conflictId: string; action: 'select'; candidateId: string }
  | { conflictId: string; action: 'defer' };
export interface ImportConflict {
  id: string;
  field: string;
  label: string;
  itemKey?: string;
  candidates: {
    id: string;
    value: unknown;
    displayValue: string;
    sources: {
      groupId: string;
      label: string;
      model: string;
      pages: { pageId: string; documentId: string; sourcePageNumber: number }[];
      snippet?: string;
    }[];
  }[];
}
export interface ImportResult {
  _source: ImportSource;
  _groups: {
    groupId: string;
    label: string;
    pageIds: string[];
    inputHash: string;
    rawText: string;
    _narrative?: NarrativeDraft;
    _sections?: SectionsResult;
  }[];
  _conflicts: ImportConflict[];
  _review: { decisions: ConflictDecision[]; unresolvedConflictIds: string[] };
  _narrative?: NarrativeDraft;
  _sections?: SectionsResult;
  rawText?: string;
  _target?: { mode?: string; patientId?: string };
}
export interface ManifestEdit {
  groups: { id: string; label: string; sortOrder: number }[];
  pages: { id: string; groupId: string; sortOrder: number }[];
}
export const opaqueKey = () => crypto.randomUUID();
export const activeImport = (job: ImportJob) =>
  [
    'queued',
    'processing',
    'uploading_to_google',
    'waiting_for_model',
    'validating_response',
    'repairing_response',
  ].includes(job.status);
export function manifestEdit(manifest: ImportManifest): ManifestEdit {
  return {
    groups: manifest.groups.map(({ id, label, sortOrder }) => ({ id, label, sortOrder })),
    pages: manifest.pages.map(({ id, groupId, sortOrder }) => ({ id, groupId, sortOrder })),
  };
}
export function orderedPages(manifest: ImportManifest, groupId: string) {
  return manifest.pages
    .filter((page) => page.groupId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
export function movePage(
  manifest: ImportManifest,
  pageId: string,
  groupId: string,
  position: number,
): ManifestEdit {
  const edit = manifestEdit(manifest);
  const page = edit.pages.find((item) => item.id === pageId);
  if (!page || !edit.groups.some((group) => group.id === groupId))
    throw new Error('Pagina o lettera non disponibile.');
  const oldGroup = page.groupId;
  const target = edit.pages
    .filter((item) => item.groupId === groupId && item.id !== pageId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  page.groupId = groupId;
  target.splice(Math.max(0, Math.min(position, target.length)), 0, page);
  target.forEach((item, index) => {
    item.sortOrder = index;
  });
  if (oldGroup !== groupId)
    edit.pages
      .filter((item) => item.groupId === oldGroup)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => {
        item.sortOrder = index;
      });
  return edit;
}
