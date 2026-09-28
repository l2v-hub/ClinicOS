import { lazy, Suspense, useState } from 'react';
import { DialogLoading } from '../shared/DialogLoading';
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
  );
}
