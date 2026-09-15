import { useId, useState } from 'react';
import { IcoImage } from '../../icons';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import type { PreviewDoc } from './DocumentPreview';
import './ImportPhotoPreview.css';

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
  const available = !!document?.url && !failed;
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
          <h3 id={titleId}>Foto caricata</h3>
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
        className="import-photo-preview__stage"
        tabIndex={available && zoomed ? 0 : undefined}
        aria-label="Immagine caricata"
      >
        {available ? (
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
              ? 'Questa immagine non è visualizzabile nel browser. Il file caricato è conservato.'
              : 'Anteprima non disponibile per questo file nella sessione corrente. Il file caricato è conservato.'}
          </p>
        )}
      </div>
      <footer className="import-photo-preview__footer">
        <button
          type="button"
          className="btn-secondary"
          disabled={!available}
          aria-pressed={zoomed}
          onClick={() => setZoomed((value) => !value)}
        >
          {zoomed ? 'Adatta alla finestra' : 'Ingrandisci'}
        </button>
        <button type="button" className="btn-secondary" onClick={onRetake}>
          Rifai foto
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Chiudi anteprima
        </button>
      </footer>
    </AccessibleDialogSurface>
  );
}
