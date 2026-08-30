import { useCallback, useEffect, useRef, useState } from 'react';
import { documentAuthHeaders } from './entraAuth';
import {
  EMPTY_DOCUMENT_PAGE_INFO,
  mergePatientDocuments,
  parsePatientDocumentPage,
  patientDocumentsPageUrl,
  type PatientDocumentMeta,
  type PatientDocumentPageInfo,
} from './patientDocumentsPage';

export type { PatientDocumentMeta } from './patientDocumentsPage';

interface DocumentState {
  scope: string;
  documents: PatientDocumentMeta[];
  status: 'loading' | 'ready' | 'error';
  loadingMore: boolean;
  loadMoreError: string | null;
  pageInfo: PatientDocumentPageInfo;
}

export function usePatientDocuments({
  patientId,
  operatorId,
  operatorRole,
  sourceFileName,
}: {
  patientId: string;
  operatorId?: string;
  operatorRole?: string;
  sourceFileName?: string;
}) {
  const scope = `${patientId}\u0000${operatorId ?? ''}\u0000${operatorRole ?? ''}\u0000${sourceFileName ?? ''}`;
  const [state, setState] = useState<DocumentState>({
    scope: '',
    documents: [],
    status: 'loading',
    loadingMore: false,
    loadMoreError: null,
    pageInfo: EMPTY_DOCUMENT_PAGE_INFO,
  });
  const stateRef = useRef(state);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const updateState = useCallback((updater: (current: DocumentState) => DocumentState) => {
    setState((current) => {
      const next = updater(current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const load = useCallback(
    async (append = false) => {
      const current = stateRef.current;
      const currentPage = current.scope === scope ? current.pageInfo : EMPTY_DOCUMENT_PAGE_INFO;
      const cursor = append ? currentPage.nextCursor : null;
      if (append && !cursor) return;
      const request = ++requestRef.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      updateState((previous) => ({
        scope,
        documents: previous.scope === scope ? previous.documents : [],
        status: append ? previous.status : 'loading',
        loadingMore: append,
        loadMoreError: null,
        pageInfo: previous.scope === scope ? previous.pageInfo : EMPTY_DOCUMENT_PAGE_INFO,
      }));
      try {
        const headers = await documentAuthHeaders(patientId, operatorId, operatorRole);
        if (controller.signal.aborted) return;
        const response = await fetch(
          patientDocumentsPageUrl(patientId, cursor, append ? undefined : sourceFileName),
          {
            headers,
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error(`document_page_${response.status}`);
        const page = parsePatientDocumentPage(await response.json());
        if (controller.signal.aborted || request !== requestRef.current) return;
        updateState((previous) => ({
          scope,
          documents: mergePatientDocuments(
            append && previous.scope === scope ? previous.documents : [],
            page.documents,
            page.sourceMatch,
          ),
          status: 'ready',
          loadingMore: false,
          loadMoreError: null,
          pageInfo: page.pageInfo,
        }));
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        if (request !== requestRef.current) return;
        updateState((previous) => ({
          scope,
          documents: previous.scope === scope ? previous.documents : [],
          status: append ? previous.status : 'error',
          loadingMore: false,
          loadMoreError: append ? 'Impossibile caricare altri documenti.' : null,
          pageInfo: previous.scope === scope ? previous.pageInfo : EMPTY_DOCUMENT_PAGE_INFO,
        }));
      } finally {
        if (request === requestRef.current) controllerRef.current = null;
      }
    },
    [operatorId, operatorRole, patientId, scope, sourceFileName, updateState],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [load]);

  const upsertDocument = useCallback(
    (document: PatientDocumentMeta) => {
      updateState((previous) =>
        previous.scope === scope
          ? {
              ...previous,
              documents: mergePatientDocuments(previous.documents, [document], null),
              status: previous.status === 'error' ? 'error' : 'ready',
            }
          : previous,
      );
    },
    [scope, updateState],
  );

  const current =
    state.scope === scope ? state : { ...state, documents: [], status: 'loading' as const };
  return {
    ...current,
    reload: () => void load(false),
    loadMore: () => void load(true),
    upsertDocument,
  };
}
