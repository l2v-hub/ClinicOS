import { useEffect, useState } from 'react';
import { documentAuthHeaders } from './entraAuth';
import { readDocumentArchive } from './patientDocumentArchiveIO';
import type { PatientDocumentMeta } from './patientDocumentsPage';

export function useDocumentArchive(patientId: string, operatorId?: string, operatorRole?: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    revision: number;
    status: 'loading' | 'ready' | 'error';
    documents: PatientDocumentMeta[];
  }>({ revision: -1, status: 'loading', documents: [] });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ revision, status: 'loading', documents: [] });
    void readDocumentArchive({
      patientId,
      signal: controller.signal,
      getHeaders: () => documentAuthHeaders(patientId, operatorId, operatorRole),
    }).then(
      (documents) => {
        if (active) setState({ revision, status: 'ready', documents });
      },
      () => {
        if (active) setState({ revision, status: 'error', documents: [] });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [patientId, operatorId, operatorRole, revision]);
  return {
    status: state.revision === revision ? state.status : ('loading' as const),
    documents: state.revision === revision ? state.documents : [],
    reload: () => setRevision((value) => value + 1),
    remember: (document: PatientDocumentMeta) =>
      setState((current) => ({
        ...current,
        documents: [document, ...current.documents.filter((item) => item.id !== document.id)],
      })),
  };
}
