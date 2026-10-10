import { ARCHIVE_CATEGORIES, DOCUMENT_TYPE_LABELS } from '../../../lib/patientDocumentArchive';
import { DOCUMENT_UPLOAD_MAX_BYTES } from '../../../lib/patientDocumentArchiveIO';
import './ArchiveEmptyState.css';

export function isEmptyArchive(status: 'loading' | 'ready' | 'error', total: number): boolean {
  return status === 'ready' && total === 0;
}

export function ArchiveEmptyState({ canAdd, onAdd }: { canAdd: boolean; onAdd: () => void }) {
  return (
    <section className="archive-empty" aria-label="Archivio senza documenti">
      <div className="archive-empty__next">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 14h8M8 18h5" />
        </svg>
        <h3>Nessun documento</h3>
        {canAdd ? (
          <>
            <p>Aggiungi il primo documento alla cartella del paziente.</p>
            <button type="button" className="btn-primary no-print" onClick={onAdd}>
              Aggiungi documento
            </button>
            <p className="archive-empty__guide">
              Scegli il tipo, carica un file o scatta una foto, poi premi «Salva documento».
              <br />
              PDF, JPEG, JPG o PNG · massimo {DOCUMENT_UPLOAD_MAX_BYTES / 1024 / 1024} MB.
            </p>
          </>
        ) : (
          <p>
            Il tuo ruolo non può aggiungere documenti in questa cartella. Per il primo caricamento
            rivolgiti al coordinatore o all’amministrazione della struttura.
          </p>
        )}
      </div>
      <details className="archive-empty__categories no-print">
        <summary>Categorie disponibili ({ARCHIVE_CATEGORIES.length})</summary>
        <p>La categoria si sceglie nel campo «Tipo documento» durante il caricamento.</p>
        <ul>
          {ARCHIVE_CATEGORIES.map((category) => (
            <li key={category.id}>
              <strong>{category.label}</strong>
              <span>
                {category.id === 'valutazioni'
                  ? 'PDF generati dalla sezione Moduli, non caricati manualmente.'
                  : category.types.map((type) => DOCUMENT_TYPE_LABELS[type]).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
