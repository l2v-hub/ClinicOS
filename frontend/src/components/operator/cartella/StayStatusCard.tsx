import { ClinicalCard } from '../../shared/ClinicalCard';
import { STATO_RICOVERO_LABEL, statoRicoveroLabel } from '../../../lib/roomAssignmentModel';

interface Props {
  statoRicovero: unknown;
  /** Chiede la conferma della dimissione: il salvataggio resta alla cartella (un solo percorso).
   *  Senza le due azioni (ruolo che non modifica la cartella) lo stato è di sola lettura. */
  onDischarge?: () => void;
  /** Chiede la conferma dell'annullamento della dimissione. */
  onReadmit?: () => void;
  busy?: boolean;
}

/** Stato del ricovero nel tab «Dimissione», con l'azione che lo cambia: è il campo da cui
 *  dipendono gli elenchi di reparto («Non dimessi», Turno, giro parametri). */
export function StayStatusCard({ statoRicovero, onDischarge, onReadmit, busy = false }: Props) {
  const discharged = statoRicovero === 'dimesso';
  const action = discharged ? onReadmit : onDischarge;
  const active =
    !discharged &&
    typeof statoRicovero === 'string' &&
    Object.hasOwn(STATO_RICOVERO_LABEL, statoRicovero);
  return (
    <ClinicalCard title="Stato del ricovero">
      <div className="stay-status" data-stay-status={discharged ? 'dimesso' : 'non-dimesso'}>
        <div className="stay-status__text">
          {/* Blu solo per uno stato noto e attivo; «Dimesso» e «Non indicato» restano neutri. */}
          <span className={`badge ${active ? 'badge--active' : 'badge--gray'}`}>
            {statoRicoveroLabel(statoRicovero)}
          </span>
          <p className="stay-status__hint">
            {discharged
              ? 'Il paziente è in «Dimessi e archivio» e non compare negli elenchi di reparto.'
              : 'La dimissione toglie il paziente dagli elenchi di reparto e lo sposta in «Dimessi e archivio».'}
          </p>
        </div>
        {action && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={action}
            data-stay-action={discharged ? 'riammetti' : 'dimetti'}
          >
            {discharged ? 'Annulla dimissione' : 'Dimetti paziente'}
          </button>
        )}
      </div>
    </ClinicalCard>
  );
}
