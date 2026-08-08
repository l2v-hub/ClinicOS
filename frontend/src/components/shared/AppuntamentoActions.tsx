import type { Appuntamento } from '../../types';

interface Props {
  apt: Appuntamento;
  confirmDeleteId: string | null;
  onEdit: (apt: Appuntamento) => void;
  onAskDelete: (id: string | null) => void;
  onDelete?: (id: string) => void;
}

/** Azioni dell'appuntamento selezionato. La conferma di eliminazione e' a due passi dentro la
 *  card: su un tablet di reparto un dialog nativo si tocca per sbaglio troppo facilmente. */
export function AppuntamentoActions({
  apt,
  confirmDeleteId,
  onEdit,
  onAskDelete,
  onDelete,
}: Props) {
  return (
    <div className="agt-apt-card__actions" onClick={(e) => e.stopPropagation()}>
      {confirmDeleteId === apt.id ? (
        <>
          <span className="agt-apt-confirm">Eliminare l’appuntamento?</span>
          <button
            className="agt-apt-action agt-apt-action--danger"
            onClick={() => {
              onAskDelete(null);
              onDelete?.(apt.id);
            }}
          >
            Sì, elimina
          </button>
          <button className="agt-apt-action" onClick={() => onAskDelete(null)}>
            Annulla
          </button>
        </>
      ) : (
        <>
          <button className="agt-apt-action" onClick={() => onEdit(apt)}>
            Modifica
          </button>
          <button
            className="agt-apt-action agt-apt-action--danger"
            onClick={() => onAskDelete(apt.id)}
          >
            Elimina
          </button>
        </>
      )}
    </div>
  );
}
