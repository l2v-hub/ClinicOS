import { canStartNewImport, ImportApiError } from './importSessionApi';
import type { ImportJob } from './importSessionTypes';

/** Resource 404s are not evidence that the parent session is unavailable. */
export function isUnavailableSession(error: unknown, sessionRead = false): boolean {
  return (
    error instanceof ImportApiError &&
    (error.code === 'session_terminal' ||
      error.code === 'session_closed' ||
      (sessionRead && canStartNewImport(error)))
  );
}
export function importFailureMessage(error: unknown): string {
  if (error instanceof ImportApiError && error.code === 'session_closed')
    return 'Questa sessione non è più modificabile. Per una nuova importazione, ricarica i documenti.';
  if (!(error instanceof ImportApiError) || error.status >= 500)
    return 'Disponibilità della sessione non verificata. Riprova: non è stata avviata una nuova importazione.';
  return error.message;
}
export function importRecoveryPresentation({
  job,
  opening,
  error,
  terminal,
  pendingUpload,
  now,
}: {
  job: ImportJob | null;
  opening: boolean;
  error: boolean;
  terminal: boolean;
  pendingUpload: boolean;
  now: Date;
}) {
  const expiry = job?.expiresAt ? new Date(job.expiresAt) : null;
  const recoverable =
    !!job &&
    !opening &&
    !error &&
    !terminal &&
    !pendingUpload &&
    !['expired', 'cancelled', 'confirmed'].includes(job.status) &&
    (!expiry || (Number.isFinite(expiry.getTime()) && expiry > now));
  const footer = pendingUpload
    ? 'Attendi il salvataggio delle pagine prima di chiudere.'
    : opening
      ? 'Verifica della disponibilità della sessione in corso…'
      : terminal
        ? 'Le pagine non possono essere riprese da questa importazione. Per iniziare di nuovo, ricarica i documenti.'
        : !recoverable
          ? 'Disponibilità della sessione non verificata. Riprova prima di riprendere il lavoro.'
          : job.manifest.pages.length
            ? 'Chiudendo puoi riprendere le pagine già salvate finché la sessione resta disponibile.'
            : 'Sessione pronta. Aggiungi i documenti da importare.';
  return {
    footer,
    closeLabel: recoverable ? 'Chiudi e riprendi la sessione' : 'Chiudi importazione',
    expiresAt: recoverable && expiry ? expiry : null,
  };
}
