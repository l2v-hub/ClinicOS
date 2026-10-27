import type {
  DraftIdentityConflictError,
  ExistingIntakeDraftReference,
} from '../intake/intakeDraftApi';

interface Props {
  conflict: DraftIdentityConflictError;
  onInspect(reference: ExistingIntakeDraftReference): void;
  onCorrect(): void;
}
export function ExistingDraftConflict({ conflict, onInspect, onCorrect }: Props) {
  return (
    <section className="import-upload-status" aria-label="Pratica già presente">
      <p role="alert">{conflict.message}</p>
      <p>
        I nuovi documenti e le correzioni restano in questa revisione. Non vengono trasferiti alla
        pratica esistente.
      </p>
      {conflict.candidates.length > 0 && (
        <ul>
          {conflict.candidates.map((candidate, index) => (
            <li key={candidate.id} data-existing-draft-id={candidate.id}>
              <p>
                Pratica {index + 1} ·{' '}
                {candidate.source === 'import' ? 'Da documenti' : 'Ingresso manuale'} · aggiornata
                il {new Date(candidate.updatedAt).toLocaleString('it-IT')}
              </p>
              <button type="button" className="btn-secondary" onClick={() => onInspect(candidate)}>
                Apri pratica salvata {index + 1}
              </button>
            </li>
          ))}
        </ul>
      )}
      {conflict.hasMore && (
        <p>Sono presenti altre pratiche: consulta anche la lista pazienti prima di scegliere.</p>
      )}
      <button type="button" className="btn-ghost" onClick={onCorrect}>
        Correggi i dati della revisione
      </button>
    </section>
  );
}
