// Card Documenti in cima alla scheda d'ingresso (HMI 1, artifacts/hmi-parity/proto/ingresso-docs.png):
// conteggio delle pagine lette, "Scatta pagina" / "Carica file", barra di lettura e frase AI.
// Tutta la logica è in useIntakeDocuments / intakeDocuments.ts: qui solo la presentazione.
import { useRef, useState } from 'react';
import { IcoAI, IcoCamera, IcoImage, IcoUpload } from '../../../icons';
import { ConfirmDialog } from '../ConfirmDialog';
import type { useIntakeDocuments } from './useIntakeDocuments';

type Documents = ReturnType<typeof useIntakeDocuments>;
const DEFAULT_ACCEPT = 'application/pdf,image/jpeg,image/png';

export function IntakeDocumentsCard({
  docs,
  disabled,
  onShowDocuments,
}: {
  docs: Documents;
  disabled: boolean;
  /** "Vedi documenti": apre il documento a fianco (ciclo 3a); `opener` riceve il focus alla chiusura. */
  onShowDocuments?: (opener: HTMLElement) => void;
}) {
  const files = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const { job, progress } = docs;
  const locked = disabled || docs.busy;
  const accept = docs.limits?.acceptedMimeTypes.join(',') || DEFAULT_ACCEPT;
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    void docs.addFiles(selected);
  };

  return (
    <section
      className="ds-card intake-section intake-docs"
      data-testid="intake-documents-card"
      aria-labelledby="intake-docs-title"
      aria-busy={docs.busy}
    >
      <header className="intake-docs__head">
        <h3 id="intake-docs-title" className="intake-section__title">
          Documenti
        </h3>
        <span className="intake-docs__count" data-testid="intake-documents-count">
          {progress.label}
        </span>
      </header>
      <div className="intake-docs__actions">
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          data-testid="intake-documents-camera"
          disabled={locked}
          onClick={() => camera.current?.click()}
        >
          <IcoCamera /> Scatta pagina
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--secondary"
          data-testid="intake-documents-upload"
          disabled={locked}
          onClick={() => files.current?.click()}
        >
          <IcoUpload /> Carica file
        </button>
        {onShowDocuments && job && job.manifest.pages.length > 0 && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            data-testid="intake-documents-view"
            onClick={(event) => onShowDocuments(event.currentTarget)}
          >
            <IcoImage /> Vedi documenti
          </button>
        )}
        <input
          ref={camera}
          type="file"
          hidden
          accept="image/jpeg,image/png"
          capture="environment"
          data-testid="intake-documents-camera-input"
          onChange={pick}
        />
        <input
          ref={files}
          type="file"
          hidden
          multiple
          accept={accept}
          data-testid="intake-documents-file-input"
          onChange={pick}
        />
      </div>
      {job && (
        <div
          className="intake-docs__bar"
          role="progressbar"
          aria-label="Avanzamento della lettura dei documenti"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          data-testid="intake-documents-progress"
        >
          <span className="intake-docs__bar-fill" style={{ width: `${progress.percent}%` }} />
        </div>
      )}
      <p
        className={`intake-docs__status${job ? ' intake-docs__status--ai' : ''}`}
        role="status"
        aria-live="polite"
        data-testid="intake-documents-status"
      >
        {job && (
          <span className="intake-docs__status-icon" aria-hidden="true">
            <IcoAI />
          </span>
        )}
        <span>{docs.busy && docs.uploading ? 'Salvataggio delle pagine…' : progress.status}</span>
      </p>
      {docs.problems.map((problem) => (
        <p key={problem} className="import-modal__error" role="alert">
          {problem}
        </p>
      ))}
      {docs.error && (
        <p className="import-modal__error" role="alert" data-testid="intake-documents-error">
          {docs.error}
        </p>
      )}
      {(docs.pendingUploads > 0 || docs.retryable || docs.canUnlink) && (
        <div className="intake-docs__actions">
          {docs.pendingUploads > 0 && !docs.uploading && (
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              data-testid="intake-documents-retry-upload"
              disabled={locked}
              onClick={() => void docs.retryUpload()}
            >
              Riprova caricamento
            </button>
          )}
          {docs.retryable && docs.pendingUploads === 0 && (
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              data-testid="intake-documents-retry-reading"
              disabled={locked}
              onClick={() => void docs.retryReading()}
            >
              Riprova lettura
            </button>
          )}
          {docs.canUnlink && (
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              data-testid="intake-documents-unlink"
              disabled={locked}
              onClick={() => setConfirmUnlink(true)}
            >
              Scollega i documenti
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmUnlink}
        title="Scollegare i documenti dalla scheda?"
        message="Le pagine caricate vengono eliminate e l’AI smette di leggerle. I valori già presenti nella scheda restano."
        confirmLabel="Scollega"
        busy={docs.busy}
        onCancel={() => setConfirmUnlink(false)}
        onConfirm={() => {
          void docs.unlink().then(() => setConfirmUnlink(false));
        }}
      />
    </section>
  );
}
