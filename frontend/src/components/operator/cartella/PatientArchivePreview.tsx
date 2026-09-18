import { useEffect, useId, useState } from 'react';
import { documentAuthHeaders } from '../../../lib/entraAuth';
import { readArchiveDocumentContent } from '../../../lib/patientDocumentArchiveIO';
import type { PatientDocumentMeta } from '../../../lib/patientDocumentsPage';
import { AccessibleDialogSurface } from '../../shared/AccessibleDialogSurface';
import { DocumentPreview } from '../../shared/DocumentPreview';
import { ArchivePdfPreview } from './ArchivePdfPreview';

export function PatientArchivePreview({
  patientId,
  operatorId,
  operatorRole,
  document,
  file,
  title,
  unavailable,
  onClose,
}: {
  patientId: string;
  operatorId?: string;
  operatorRole?: string;
  document?: Pick<PatientDocumentMeta, 'id' | 'originalName'>;
  file?: File | null;
  title: string;
  unavailable?: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ url: string; type: string; error: boolean; blob?: Blob }>({
    url: '',
    type: '',
    error: false,
  });
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let url = '';
    setState({ url: '', type: '', error: false });
    setUnsupported(false);
    const source = file
      ? Promise.resolve(file)
      : document
        ? readArchiveDocumentContent(
            {
              patientId,
              signal: controller.signal,
              getHeaders: () => documentAuthHeaders(patientId, operatorId, operatorRole),
            },
            document.id,
          )
        : null;
    if (source)
      void source
        .then((blob) => {
          if (controller.signal.aborted) return;
          url = URL.createObjectURL(blob);
          setState({ url, type: blob.type, error: false, blob });
          if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(blob.type))
            setUnsupported(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ url: '', type: '', error: true });
        });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [patientId, operatorId, operatorRole, document?.id, file, revision]);
  const name = file?.name ?? document?.originalName ?? title;
  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      onClose={onClose}
      className="patient-archive-preview"
    >
      <header className="patient-archive-preview__header">
        <div>
          <h3 id={titleId}>{title}</h3>
          <p>{name !== title ? name : 'Documento del paziente'}</p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Chiudi anteprima"
          data-dialog-initial-focus
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div
        className="patient-archive-preview__body"
        onErrorCapture={(event) => {
          if (event.target instanceof HTMLImageElement) setUnsupported(true);
        }}
      >
        {!file && !document ? (
          <p role="status">
            {unavailable
              ? 'Allegato non disponibile. Verifica la scheda del documento.'
              : 'Nessun file allegato a questa scheda. Puoi aggiungerlo da Modifica dettagli.'}
          </p>
        ) : state.error ? (
          <div role="alert">
            <p>Impossibile aprire il documento.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRevision((value) => value + 1)}
            >
              Riprova anteprima
            </button>
          </div>
        ) : !state.url ? (
          <p role="status">Caricamento documento…</p>
        ) : unsupported ? (
          <p role="status">
            Il browser non può mostrare questo formato. Il file originale è disponibile per il
            download.
          </p>
        ) : state.type === 'application/pdf' && state.blob ? (
          <ArchivePdfPreview file={state.blob} name={name} />
        ) : (
          <DocumentPreview
            key={`${document?.id ?? 'local'}:${revision}`}
            showOcr={false}
            documents={[{ id: document?.id, name, type: state.type, url: state.url }]}
          />
        )}
      </div>
      <footer className="patient-archive-preview__footer">
        {state.url && (
          <a className="btn-secondary btn-sm" href={state.url} download={name}>
            Scarica originale
          </a>
        )}
        <button type="button" className="btn-primary btn-sm" onClick={onClose}>
          Chiudi anteprima
        </button>
      </footer>
    </AccessibleDialogSurface>
  );
}
