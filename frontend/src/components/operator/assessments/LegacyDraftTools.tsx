import { useState } from 'react';
import { ConfirmDialog } from '../../shared/ConfirmDialog';
import { localDraftHelp } from './AssessmentDraftStatus';
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
          Il browser non consente di conservare le modifiche dopo il ricaricamento. Salva in ClinicOS e attendi la conferma prima di uscire.
        </p>
      )}
      {dirty && (
        <div className="assessment-local">
          <span className="assessment-draft-chip">Bozza da riprendere in questa finestra</span>
          <p className="assessment-hint">{localDraftHelp(error)}</p>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirm(true)}>
            Elimina bozza
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title="Eliminare la bozza?"
        message="La compilazione non salvata verrà rimossa da questa finestra. I dati già registrati del paziente restano disponibili."
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
