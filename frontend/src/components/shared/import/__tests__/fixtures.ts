import type { ImportJob, ImportResult } from '../importSessionTypes';
export function job(revision = 1): ImportJob {
  return {
    id: 'job-one',
    status: 'collecting',
    totalBytes: 123,
    documents: [],
    capabilities: { sessionVersion: 1, pageEditing: true, atomicReplacement: true },
    manifest: {
      version: 1,
      revision,
      groups: [
        {
          id: 'letter-a',
          label: 'Lettera A',
          sortOrder: 0,
          status: 'pending',
          pageCount: 0,
          completedPages: 0,
          error: null,
          pdfUrl: null,
        },
      ],
      pages: [],
    },
    limits: {
      maxPages: 30,
      maxSourceFiles: 30,
      maxGroups: 30,
      maxTotalBytes: 26214400,
      maxFileBytes: 26214400,
      maxFilesPerRequest: 10,
      maxRequestBytes: 26476544,
      acceptedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    },
    progress: {
      phase: 'documents',
      totalPages: 0,
      completedPages: 0,
      failedPages: 0,
      totalGroups: 1,
      completedGroups: 0,
      currentPageId: null,
      currentGroupId: null,
    },
    review: {
      manifestRevision: null,
      resultHash: null,
      unresolvedConflicts: 0,
      canProceed: false,
      draftId: null,
      draftSourceIsCurrent: false,
    },
  };
}
export function result(): ImportResult {
  return {
    _source: { manifestRevision: 3, resultHash: 'hash-one' },
    _groups: [],
    _conflicts: [
      {
        id: 'conflict',
        field: 'name',
        label: 'Campo discordante',
        candidates: [
          {
            id: 'one',
            value: 'alpha',
            displayValue: 'alpha',
            sources: [
              {
                groupId: 'a',
                label: 'Lettera A',
                model: 'mock',
                pages: [{ pageId: 'page-a', documentId: 'doc-a', sourcePageNumber: 2 }],
              },
            ],
          },
          {
            id: 'two',
            value: 'beta',
            displayValue: 'beta',
            sources: [{ groupId: 'b', label: 'Lettera B', model: 'mock', pages: [] }],
          },
        ],
      },
    ],
    _review: { decisions: [], unresolvedConflictIds: ['conflict'] },
  };
}
export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
