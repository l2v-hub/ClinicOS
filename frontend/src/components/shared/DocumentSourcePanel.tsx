import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
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
  const [previews, setPreviews] = useState<PreviewDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewsLoading, setPreviewsLoading] = useState(false);

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (operatorId) h['X-Operator-Id'] = operatorId;
    if (operatorRole) h['X-Operator-Role'] = operatorRole;
    h['X-Demo-Patient-Id'] = patientId;
    return h;
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_URL}/patients/${patientId}/documents`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (alive) setDocs(Array.isArray(d.documents) ? d.documents : []);
      })
      .catch(() => {
        if (alive) setError('Impossibile caricare i documenti.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, operatorId, operatorRole]);

  // Fetch each document's bytes as an authenticated blob (never a raw URL) and build local
  // object URLs for the preview; revoke them when the doc list changes or the panel unmounts.
  useEffect(() => {
    let alive = true;
    if (docs.length === 0) {
      setPreviews([]);
      return;
    }
    setPreviewsLoading(true);
    const created: string[] = [];
    Promise.all(
      docs.map(async (d) => {
        try {
          const r = await fetch(`${API_URL}/patients/${patientId}/documents/${d.id}/content`, {
            headers: authHeaders(),
          });
          if (!r.ok) return null;
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          created.push(url);
          return { name: d.originalName, type: d.mimeType, url } as PreviewDoc;
        } catch {
          return null;
        }
      }),
    )
      .then((results) => {
        if (alive) setPreviews(results.filter((p): p is PreviewDoc => p !== null));
      })
      .finally(() => {
        if (alive) setPreviewsLoading(false);
      });
    return () => {
      alive = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, patientId, operatorId, operatorRole]);

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
          {loading || previewsLoading ? (
            <p className="cr-empty">Caricamento documenti…</p>
          ) : error ? (
            <p className="cr-empty">{error}</p>
          ) : previews.length === 0 ? (
            <p className="cr-empty">Documento originale non disponibile.</p>
          ) : (
            <DocumentPreview
              documents={previews}
              ocrText={sourceText ?? ''}
              sourceTarget={sourceTarget}
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
