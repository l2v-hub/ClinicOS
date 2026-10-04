import { useState } from 'react';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
export function LegacyDraftTools({
  dirty,
  error,
  onDelete,
}: {
  dirty: boolean;
  error: boolean;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      {error && (
        <p role="alert">
          La bozza non può essere conservata dopo il ricaricamento. Salva prima di uscire.
        </p>
      )}
      {dirty && (
        <div className="assessment-local">
          <span className="assessment-draft-chip">Draft · bozza sul dispositivo</span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirm(true)}>
            Elimina bozza
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Eliminare la bozza?"
        message="La compilazione non salvata verrà rimossa da questa scheda. I dati già registrati del paziente restano disponibili."
        confirmLabel="Elimina bozza"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          onDelete();
          setConfirm(false);
        }}
      />
    </>
  );
}
