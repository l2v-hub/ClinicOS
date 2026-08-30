import { useLayoutEffect, useRef, useState } from 'react';
import { API_URL } from '../../../config';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import { openScopedPatientDocument } from '../../../lib/patientDocumentContent';
import { usePatientDocuments } from '../../../lib/usePatientDocuments';
import { DocumentSourcePanel, type PatientDocMeta } from '../../shared/DocumentSourcePanel';

// REQ-035 v2: imported source documents permanently linked to the patient, shown in the
// Documenti tab. Files are served by the authenticated backend (not public URLs).
// #246 remediation: the backend now requires operator identity on every /documents call — list
// and "Apri" both carry X-Operator-Id/X-Operator-Role; "Apri" fetches the bytes as an
// authenticated blob (a plain <a href> cannot attach custom headers).

function fmtMB(b: number): string {
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT');
  } catch {
    return iso;
  }
}

interface Props {
  patientId: string;
  operatorId?: string;
  operatorRole?: string;
}

export function ImportedDocumentsList({ patientId, operatorId, operatorRole }: Props) {
  const {
    documents: docs,
    status,
    loadingMore,
    loadMoreError,
    pageInfo,
    reload,
    loadMore,
  } = usePatientDocuments({ patientId, operatorId, operatorRole });
  const [open, setOpen] = useState<{ fileName: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const openControllerRef = useRef<AbortController | null>(null);
  const openRequestRef = useRef(0);
  const scope = `${patientId}\u0000${operatorId ?? ''}\u0000${operatorRole ?? ''}`;
  const scopeRef = useRef(scope);

  useLayoutEffect(() => {
    scopeRef.current = scope;
    return () => {
      openRequestRef.current += 1;
      openControllerRef.current?.abort();
      openControllerRef.current = null;
    };
  }, [scope]);

  async function openDoc(d: PatientDocMeta) {
    openControllerRef.current?.abort();
    const controller = new AbortController();
    openControllerRef.current = controller;
    const request = ++openRequestRef.current;
    const requestScope = scope;
    const isCurrent = () =>
      !controller.signal.aborted &&
      request === openRequestRef.current &&
      requestScope === scopeRef.current;

    try {
      setErr(null);
      await openScopedPatientDocument({
        url: `${API_URL}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(d.id)}/content`,
        signal: controller.signal,
        getHeaders: () => documentAuthHeaders(patientId, operatorId, operatorRole),
        isCurrent,
      });
    } catch (error) {
      if (isCurrent() && !(error instanceof DOMException && error.name === 'AbortError')) {
        setErr('Apertura documento non riuscita');
      }
    } finally {
      if (request === openRequestRef.current) openControllerRef.current = null;
    }
  }

  if (status === 'ready' && docs.length === 0) return null;

  return (
    <section className="imported-docs" data-testid="imported-documents">
      <header className="srev-card__head">
        <h3>Documenti importati</h3>
        <span className="srev-area">Importazione lettera di dimissione</span>
      </header>
      {err && (
        <p role="alert" className="cr-empty">
          {err}
        </p>
      )}
      {status === 'loading' && docs.length === 0 && (
        <p role="status" className="cr-empty">
          Caricamento documenti…
        </p>
      )}
      {status === 'error' && (
        <div className="cr-empty" role="alert">
          <p>Impossibile caricare i documenti importati.</p>
          <button type="button" className="btn-secondary btn-sm" onClick={reload}>
            Riprova
          </button>
        </div>
      )}
      <ul className="imported-docs__list">
        {docs.map((d) => (
          <li key={d.id} className="imported-docs__item">
            <span className="imported-docs__icon" aria-hidden="true">
              {d.mimeType.includes('pdf') ? '📄' : '🖼️'}
            </span>
            <span className="imported-docs__name" title={d.originalName}>
              {d.originalName}
            </span>
            <span className="imported-docs__meta">
              {d.mimeType.split('/')[1]?.toUpperCase() || 'FILE'} · {fmtMB(d.sizeBytes)} ·{' '}
              {fmtDate(d.createdAt)}
            </span>
            <span className="imported-docs__actions">
              <button className="srev-chip" onClick={() => setOpen({ fileName: d.originalName })}>
                Anteprima
              </button>
              <button className="srev-chip" onClick={() => openDoc(d)}>
                Apri
              </button>
            </span>
          </li>
        ))}
      </ul>
      {loadMoreError && (
        <div className="cr-empty" role="alert">
          <p>{loadMoreError} L’elenco mostrato è parziale.</p>
          <button type="button" className="btn-secondary btn-sm" onClick={loadMore}>
            Riprova caricamento
          </button>
        </div>
      )}
      {pageInfo.hasMore && !loadMoreError && (
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Caricamento…' : 'Carica altri documenti'}
        </button>
      )}
      {open && (
        <DocumentSourcePanel
          patientId={patientId}
          sourceTarget={{ fileName: open.fileName }}
          title="Documento importato"
          onClose={() => setOpen(null)}
          operatorId={operatorId}
          operatorRole={operatorRole}
        />
      )}
    </section>
  );
}
