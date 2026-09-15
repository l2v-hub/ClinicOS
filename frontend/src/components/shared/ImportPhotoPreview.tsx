import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { IcoImage } from '../../icons';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import type { PreviewDoc } from './DocumentPreview';
import './ImportPhotoPreview.css';

const PdfCanvasPreview = lazy(() =>
  import('./PdfCanvasPreview').then((module) => ({ default: module.PdfCanvasPreview })),
);

interface Props {
  name: string;
  document?: PreviewDoc;
  onClose: () => void;
  onRetake: () => void;
}

export function ImportPhotoPreview({ name, document, onClose, onRetake }: Props) {
  const titleId = useId();
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const isPdf = document?.type === 'application/pdf';
  const available = !!document?.url && !failed;
  useEffect(() => {
    if (!isPdf || !document?.url) return;
    const controller = new AbortController();
    setPdfFile(null);
    setFailed(false);
    void fetch(document.url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('PDF unavailable');
        const blob = await response.blob();
        if (!controller.signal.aborted) setPdfFile(blob);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [isPdf, document?.url]);
  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      onClose={onClose}
      className="import-photo-preview"
    >
      <header className="import-photo-preview__header">
        <span className="import-photo-preview__icon" aria-hidden="true">
          <IcoImage />
        </span>
        <div>
          <h3 id={titleId}>{isPdf ? 'Documento PDF' : 'Foto caricata'}</h3>
          <p title={name}>{name}</p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Chiudi anteprima"
          onClick={onClose}
          data-dialog-initial-focus
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </header>
      <div
        className={`import-photo-preview__stage${isPdf ? ' import-photo-preview__stage--pdf' : ''}`}
        tabIndex={!isPdf && available && zoomed ? 0 : undefined}
        aria-label={isPdf ? 'PDF caricato' : 'Immagine caricata'}
      >
        {available && isPdf ? (
          <Suspense fallback={<p role="status">Preparazione anteprima PDF…</p>}>
            {pdfFile ? (
              <PdfCanvasPreview file={pdfFile} name={name} />
            ) : (
              <p role="status">Caricamento PDF…</p>
            )}
          </Suspense>
        ) : available ? (
          <div
            className="import-photo-preview__canvas"
            style={{ width: zoomed ? '200%' : '100%', height: zoomed ? '200%' : '100%' }}
          >
            <img
              src={document.url}
              alt={`Foto caricata: ${name}`}
              onError={() => setFailed(true)}
              draggable={false}
            />
          </div>
        ) : (
          <p role="status">
            {failed
              ? 'Questo documento non è visualizzabile nel browser. Il file caricato è conservato.'
              : 'Anteprima non disponibile per questo file nella sessione corrente. Il file caricato è conservato.'}
          </p>
        )}
      </div>
      <footer className="import-photo-preview__footer">
        {!isPdf && (
          <button
            type="button"
            className="btn-secondary"
            disabled={!available}
            aria-pressed={zoomed}
            onClick={() => setZoomed((value) => !value)}
          >
            {zoomed ? 'Adatta alla finestra' : 'Ingrandisci'}
          </button>
        )}
        {isPdf && document?.url && (
          <a className="btn-secondary" href={document.url} download={name}>
            Scarica PDF
          </a>
        )}
        <button type="button" className="btn-secondary" onClick={onRetake}>
          {isPdf ? 'Ripeti scansione' : 'Rifai foto'}
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Chiudi anteprima
        </button>
      </footer>
    </AccessibleDialogSurface>
  );
}
