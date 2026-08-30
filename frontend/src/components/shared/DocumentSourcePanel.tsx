import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { documentAuthHeaders } from '../../lib/entraAuth';
import { DocumentPreview, type PreviewDoc } from './DocumentPreview';

// Side panel that shows the imported source document(s) for a patient (REQ-035 v2).
// Files are served by the authenticated backend content endpoint (never public URLs).
// #246 remediation: the backend requires operator identity on every /documents call. The list
// fetch carries X-Operator-Id/X-Operator-Role; each document's bytes are fetched as an
// authenticated blob and rendered via a local object URL — an <img>/<iframe> src cannot attach
// custom headers, so it can no longer point straight at the gated content endpoint.

export interface PatientDocMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string;
  importJobId: string | null;
  createdAt: string;
}

const MAX_PREVIEW_CACHE = 5;

interface Props {
  patientId: string;
  /** Optional: open straight to a section's source (matched by file name) + page + text. */
  sourceTarget?: { fileName?: string; page?: number } | null;
  sourceText?: string;
  title?: string;
  onClose: () => void;
  operatorId?: string;
  operatorRole?: string;
}

export function DocumentSourcePanel({
  patientId,
  sourceTarget,
  sourceText,
  title,
  onClose,
  operatorId,
  operatorRole,
}: Props) {
  const [docs, setDocs] = useState<PatientDocMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewStatus, setPreviewStatus] = useState<Record<string, 'loading' | 'error'>>({});
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(() => new Map());
  const previewCacheRef = useRef(new Map<string, string>());
  const previewControllersRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    setDocs([]);
    setPreviewStatus({});
    setPreviewUrls(new Map());
    /* eslint-enable react-hooks/set-state-in-effect */
    void (async () => {
      try {
        const headers = await documentAuthHeaders(patientId, operatorId, operatorRole);
        if (controller.signal.aborted) return;
        const response = await fetch(`${API_URL}/patients/${patientId}/documents`, {
          headers,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('document-list-failed');
        const data = await response.json();
        if (!controller.signal.aborted) {
          setDocs(Array.isArray(data.documents) ? data.documents : []);
        }
      } catch {
        if (!controller.signal.aborted) setError('Impossibile caricare i documenti.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [operatorId, operatorRole, patientId]);

  const requestDocument = useCallback(
    (documentId: string) => {
      const cache = previewCacheRef.current;
      const cached = cache.get(documentId);
      if (cached) {
        cache.delete(documentId);
        cache.set(documentId, cached);
        return;
      }
      if (previewControllersRef.current.has(documentId)) return;

      const controller = new AbortController();
      previewControllersRef.current.set(documentId, controller);
      setPreviewStatus((current) => ({ ...current, [documentId]: 'loading' }));

      void (async () => {
        try {
          const headers = await documentAuthHeaders(patientId, operatorId, operatorRole);
          if (controller.signal.aborted) return;
          const response = await fetch(
            `${API_URL}/patients/${patientId}/documents/${encodeURIComponent(documentId)}/content`,
            { headers, signal: controller.signal },
          );
          if (!response.ok) throw new Error('document-content-failed');
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          cache.set(documentId, url);
          while (cache.size > MAX_PREVIEW_CACHE) {
            const oldestId = cache.keys().next().value as string | undefined;
            if (!oldestId) break;
            const oldestUrl = cache.get(oldestId);
            cache.delete(oldestId);
            if (oldestUrl) URL.revokeObjectURL(oldestUrl);
          }
          setPreviewStatus((current) => {
            const next = { ...current };
            delete next[documentId];
            return next;
          });
          setPreviewUrls(new Map(cache));
        } catch {
          if (!controller.signal.aborted) {
            setPreviewStatus((current) => ({ ...current, [documentId]: 'error' }));
          }
        } finally {
          previewControllersRef.current.delete(documentId);
        }
      })();
    },
    [operatorId, operatorRole, patientId],
  );

  // Abort in-flight content reads and release every local blob when the panel scope changes.
  useEffect(() => {
    const controllers = previewControllersRef.current;
    const cache = previewCacheRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, [patientId, operatorId, operatorRole]);

  useEffect(() => {
    if (docs.length === 0) return;
    const selected =
      docs.find((document) => document.originalName === sourceTarget?.fileName) ?? docs[0];
    requestDocument(selected.id);
  }, [docs, requestDocument, sourceTarget?.fileName]);

  const previews = useMemo<PreviewDoc[]>(
    () =>
      docs.map((document) => ({
        id: document.id,
        name: document.originalName,
        type: document.mimeType,
        url: previewUrls.get(document.id) ?? '',
        loading: previewStatus[document.id] === 'loading',
        error:
          previewStatus[document.id] === 'error'
            ? 'Impossibile caricare questo documento.'
            : undefined,
      })),
    [docs, previewStatus, previewUrls],
  );

  return (
    <div
      className="doc-source-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Fonte originale"
    >
      <div className="doc-source-panel">
        <header className="doc-source-panel__head">
          <h3>{title ?? 'Fonte originale'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>
        <div className="doc-source-panel__body">
          {loading ? (
            <p className="cr-empty">Caricamento documenti…</p>
          ) : error ? (
            <p className="cr-empty">{error}</p>
          ) : previews.length === 0 ? (
            <p className="cr-empty">Documento originale non disponibile.</p>
          ) : (
            <DocumentPreview
              key={patientId}
              documents={previews}
              ocrText={sourceText ?? ''}
              sourceTarget={sourceTarget}
              onRequestDocument={requestDocument}
            />
          )}
        </div>
        {sourceText && (
          <div className="doc-source-panel__text">
            <p className="srev-source">Testo rilevato</p>
            <pre className="doc-preview__ocrtext">{sourceText}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
