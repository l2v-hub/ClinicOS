import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { DialogLoading } from '../shared/DialogLoading';
import { AccessibleDialogSurface } from '../shared/AccessibleDialogSurface';
import { NewPatientChooser, type NewPatientPath } from './NewPatientChooser';

const IntakeWorkspace = lazy(() =>
  import('../shared/intake/IntakeWorkspace').then((module) => ({
    default: module.IntakeWorkspace,
  })),
);
const DischargeImportModal = lazy(() =>
  import('../shared/DischargeImportModal').then((module) => ({
    default: module.DischargeImportModal,
  })),
);

/** A failed browser module import can stay cached until reload. Recover locally
 * without dropping the method route or pretending a patient was created. */
class IntakeFlowBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <AccessibleDialogSurface labelledBy="intake-flow-error" onClose={this.props.onClose}>
        <h2 id="intake-flow-error">Impossibile aprire il modulo</h2>
        <p role="alert">
          Il modulo non è stato caricato. Riprova ricarica la pagina mantenendo la scelta del metodo
          e la bozza già salvata; nessun paziente viene creato.
        </p>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          data-dialog-initial-focus
          onClick={() => window.location.reload()}
        >
          Riprova
        </button>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={this.props.onClose}>
          Annulla
        </button>
      </AccessibleDialogSurface>
    );
  }
}

interface Props {
  onClose: () => void;
  /** Paziente creato (o aggiornato dall'import), il modulo scelto nel wizard e il percorso usato. */
  onDone: (
    patientId: string | undefined,
    moduleTabId: string | undefined,
    path: NewPatientPath,
  ) => void;
  operatorId?: string;
  operatorRole?: string;
  operatoreNome?: string;
  /** Percorso già scelto (pagina Nuovo ingresso): niente finestra di scelta. */
  initialPath?: NewPatientPath;
}

/** Ingresso unico "Nuovo paziente": la scelta, poi l'import dei documenti o il wizard manuale.
 *  Stesso flusso dalla lista pazienti e dal modulo appuntamento. */
export function NewPatientFlow({
  onClose,
  onDone,
  operatorId,
  operatorRole,
  operatoreNome,
  initialPath,
}: Props) {
  const [path, setPath] = useState<NewPatientPath | null>(initialPath ?? null);

  if (path === null) return <NewPatientChooser onClose={onClose} onChoose={setPath} />;

  return (
    <IntakeFlowBoundary onClose={onClose}>
      <Suspense fallback={<DialogLoading onClose={onClose} />}>
        {path === 'documenti' ? (
          <DischargeImportModal
            open
            onClose={onClose}
            onImported={(patientId, moduleTabId) => onDone(patientId, moduleTabId, 'documenti')}
            operatorId={operatorId}
            operatorRole={operatorRole}
          />
        ) : (
          <IntakeWorkspace
            open
            onClose={onClose}
            onCreated={(patientId, moduleTabId) => onDone(patientId, moduleTabId, 'manuale')}
            operatorId={operatorId}
            operatorRole={operatorRole}
            operatoreNome={operatoreNome}
          />
        )}
      </Suspense>
    </IntakeFlowBoundary>
  );
}
