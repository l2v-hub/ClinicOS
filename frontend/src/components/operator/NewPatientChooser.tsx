import { useEffect, useId, useRef, useState } from 'react';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { useAiImportStatus } from '../shared/useAiImportStatus';
import { IcoAI, IcoEdit, IcoX } from '../../icons';
import './NewPatientChooser.css';

export type NewPatientPath = 'documenti' | 'manuale';

interface Props {
  onClose: () => void;
  onChoose: (path: NewPatientPath) => void;
}

/** Ingresso unico per un nuovo paziente: prima il percorso rapido dai documenti (l'AI compila,
 *  l'operatore verifica), poi l'inserimento a mano. Entrambi portano ai flussi esistenti. */
export function NewPatientChooser({ onClose, onChoose }: Props) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const { loading, available, reason } = useAiImportStatus();
  const docsEnabled = available && !loading;
  const docsRef = useRef<HTMLButtonElement | null>(null);
  const manualRef = useRef<HTMLButtonElement | null>(null);
  const [openedAt] = useState(() => Date.now());

  // Lo stato del servizio AI arriva dopo l'apertura: il focus parte su "A mano" e, se il servizio
  // risulta disponibile subito dopo e l'utente non si è ancora mosso, passa a "Da documenti".
  useEffect(() => {
    if (!docsEnabled || Date.now() - openedAt > 1500) return;
    if (document.activeElement === manualRef.current) docsRef.current?.focus();
  }, [docsEnabled, openedAt]);

  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      describedBy={descId}
      onClose={onClose}
      className="new-patient-chooser"
    >
      <div className="new-patient-chooser__head">
        <h3 id={titleId} className="new-patient-chooser__title">
          Nuovo paziente
        </h3>
        <button type="button" className="ds-icon-btn" aria-label="Chiudi" onClick={onClose}>
          <IcoX />
        </button>
      </div>
      <p id={descId} className="new-patient-chooser__desc">
        Come vuoi inserire il paziente?
      </p>
      <div className="new-patient-chooser__options">
        <button
          type="button"
          ref={docsRef}
          className="new-patient-chooser__option new-patient-chooser__option--primary"
          disabled={!docsEnabled}
          aria-busy={loading}
          {...(docsEnabled ? { 'data-dialog-initial-focus': '' } : {})}
          onClick={() => onChoose('documenti')}
        >
          <span className="new-patient-chooser__icon" aria-hidden="true">
            <IcoAI />
          </span>
          <span className="new-patient-chooser__text">
            <strong>Da documenti</strong>
            <span>
              Carica lettera di dimissione, PDF o foto: l'AI compila i dati, tu li verifichi.
            </span>
            {loading ? (
              <em className="new-patient-chooser__status">Verifica del servizio AI in corso…</em>
            ) : !available ? (
              <em className="new-patient-chooser__status new-patient-chooser__status--off">
                {reason}
              </em>
            ) : (
              <em className="new-patient-chooser__status">Il più rapido</em>
            )}
          </span>
        </button>
        <button
          type="button"
          ref={manualRef}
          className="new-patient-chooser__option"
          {...(docsEnabled ? {} : { 'data-dialog-initial-focus': '' })}
          onClick={() => onChoose('manuale')}
        >
          <span className="new-patient-chooser__icon" aria-hidden="true">
            <IcoEdit />
          </span>
          <span className="new-patient-chooser__text">
            <strong>A mano</strong>
            <span>Inserisci anagrafica, ingresso e dati clinici passo per passo.</span>
          </span>
        </button>
      </div>
    </AccessibleDialogSurface>
  );
}
