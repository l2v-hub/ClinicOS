import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import { DocumentPreview, type PreviewDoc } from './DocumentPreview';

// Side panel that shows the imported source document(s) for a patient (REQ-035 v2).
// Files are served by the authenticated backend content endpoint (never public URLs).

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
}

export function DocumentSourcePanel({ patientId, sourceTarget, sourceText, title, onClose }: Props) {
  const [docs, setDocs] = useState<PatientDocMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_URL}/patients/${patientId}/documents`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setDocs(Array.isArray(d.documents) ? d.documents : []); })
      .catch(() => { if (alive) setError('Impossibile caricare i documenti.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [patientId]);

  const previews: PreviewDoc[] = docs.map((d) => ({
    name: d.originalName,
    type: d.mimeType,
    url: `${API_URL}/patients/${patientId}/documents/${d.id}/content`,
  }));

  return (
    <div className="doc-source-overlay" role="dialog" aria-modal="true" aria-label="Fonte originale">
      <div className="doc-source-panel">
        <header className="doc-source-panel__head">
          <h3>{title ?? 'Fonte originale'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi">✕</button>
        </header>
        <div className="doc-source-panel__body">
          {loading ? (
            <p className="cr-empty">Caricamento documenti…</p>
          ) : error ? (
            <p className="cr-empty">{error}</p>
          ) : previews.length === 0 ? (
            <p className="cr-empty">Documento originale non disponibile.</p>
          ) : (
            <DocumentPreview documents={previews} ocrText={sourceText ?? ''} sourceTarget={sourceTarget} />
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
