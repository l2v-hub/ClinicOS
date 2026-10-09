import { useParameterEntryDraft } from '../../lib/useParameterEntryDraft';
import type { ParameterDraftStore } from '../../lib/parameterEntryDrafts';
import type { ParameterPagePatient } from '../../lib/patientParametersPage';
import { patientIdentifier, patientIdentityName } from '../../lib/patientIdentity';
import {
  ParameterReadingSaveError,
  type ParameterReadingRequest,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { ParameterReadingForm } from './ParameterReadingForm';

interface Props {
  patient: ParameterPagePatient;
  draftStore: ParameterDraftStore;
  noteCount?: number;
  summaryPending?: boolean;
  outsideResults?: boolean;
  onOpenHistory: () => void;
  onSave: (request: ParameterReadingRequest) => Promise<PatientParameterReading>;
}
export function ParameterEntryPanel({
  patient,
  draftStore,
  noteCount,
  summaryPending = false,
  outsideResults = false,
  onOpenHistory,
  onSave,
}: Props) {
  const { store, draft } = useParameterEntryDraft(patient.id, draftStore);
  const name = patientIdentityName(patient);
  async function save() {
    const token = store.begin(patient.id);
    if (!token) return;
    try {
      const saved = await onSave(token.request);
      store.succeed(token, saved.measuredAt);
    } catch (cause) {
      const unknownOutcome = !(cause instanceof ParameterReadingSaveError) || cause.uncertain;
      store.fail(
        token,
        cause instanceof Error ? cause.message : 'Salvataggio non verificato. Riprova.',
        unknownOutcome,
      );
    }
  }
  const noteSummary =
    noteCount !== undefined
      ? `${noteCount} ${noteCount === 1 ? 'nota salvata' : 'note salvate'} oggi`
      : summaryPending
        ? 'verifica note in corso'
        : 'conteggio note non disponibile';
  return (
    <section className="par-form" aria-label={`Rilevazione di ${name}`}>
      {outsideResults && (
        <p className="par-outside" role="status">
          {name} non è nei risultati della ricerca: questa rilevazione resta sua.
        </p>
      )}
      <div className="par-form__head">
        <div className="par-form__who">
          <h2 className="par-form__name">{name}</h2>
          <span className="par-cap">{patientIdentifier(patient)}</span>
        </div>
        <button type="button" className="ds-link" onClick={onOpenHistory}>
          Storico
        </button>
      </div>
      <ParameterReadingForm
        patientId={patient.id}
        values={draft.values}
        saving={draft.saving}
        uncertain={draft.uncertain}
        error={draft.error}
        savedAt={draft.savedAt}
        pendingAt={draft.pending?.measuredAt}
        noteSummary={noteSummary}
        onChange={(key, value) => store.update(patient.id, key, value)}
        onSave={save}
        onOpenHistory={onOpenHistory}
      />
    </section>
  );
}
