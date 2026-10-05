import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import type { Operatore, Paziente, PrioritaConsegna } from '../../types';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { PatientIdentity } from '../shared/PatientIdentity';
import { patientIdentityName } from '../../lib/patientIdentity';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useCan } from '../../lib/capabilities';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';
import { facilityLocalMinute } from '../../lib/facilityTime';
const DiaryTherapyPanel = lazy(() =>
  import('./cartella/DiaryTherapyPanel').then((m) => ({ default: m.DiaryTherapyPanel })),
);
export function ConsegnaComposer({
  patient,
  store,
  operatori,
  onSave,
  nextAvailable = false,
  message = '',
  focusRequest = 0,
  onTherapyCreated,
  embedded = false,
}: {
  patient: Paziente;
  store: ConsegnaDraftStore;
  operatori: Operatore[];
  onSave: (advance: boolean) => void;
  nextAvailable?: boolean;
  message?: string;
  focusRequest?: number;
  onTherapyCreated?: () => void;
  embedded?: boolean;
}) {
  const draft = useConsegnaDraft(store, patient.id);
  const canCreate = useCan('consegne.create');
  const canPrescribe = useCan('diary.create_with_therapy');
  const [therapyStamp, setTherapyStamp] = useState<string | null>(null);
  const [therapySaved, setTherapySaved] = useState(false);
  const id = useId();
  const [discard, setDiscard] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const identityRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = formRef.current;
    const identity = identityRef.current;
    if (!form || !identity) return;
    const measure = () => {
      form.style.setProperty('--handover-identity-height', `${identity.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(identity);
    return () => observer.disconnect();
  }, [patient.id]);
  useEffect(() => {
    if (focusRequest) {
      formRef.current
        ?.querySelector<HTMLTextAreaElement>('textarea')
        ?.focus({ preventScroll: true });
    }
  }, [focusRequest]);
  const locked = draft.saving || Boolean(draft.pending) || Boolean(therapyStamp);
  const blocked =
    draft.outcome?.kind === 'failed' && !draft.outcome.uncertain && Boolean(draft.pending);
  const field = (change: Parameters<ConsegnaDraftStore['update']>[1]) =>
    store.update(patient.id, change);
  // Il ruolo non consente di scrivere consegne: niente modulo (il backend la rifiuterebbe).
  if (!canCreate)
    return (
      <section className="handover-rounds__composer" aria-label="Scrivi consegna">
        <p className="cr-empty">Il tuo ruolo non può creare consegne.</p>
      </section>
    );
  return (
    <section className="handover-rounds__composer" aria-label="Scrivi consegna">
      <div className="ho-card-head">
        <h3>{embedded ? 'Nuova nota' : `Consegna · ${patientIdentityName(patient)}`}</h3>
        <span className="ho-cap">{draft.dirty ? 'Bozza non salvata' : 'Nuova consegna'}</span>
      </div>
      <form
        ref={formRef}
        aria-busy={draft.saving}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(false);
        }}
      >
        {!embedded && (
          <div ref={identityRef} className="handover-rounds__composer-identity">
            <PatientIdentity patient={patient} />
          </div>
        )}
        <ClinicalNoteEditor
          content={draft.fields.note}
          priority={draft.fields.priorita}
          disabled={locked}
          onChange={(change) =>
            field({
              ...(change.content !== undefined ? { note: change.content } : {}),
              ...(change.priority ? { priorita: change.priority as PrioritaConsegna } : {}),
            })
          }
        >
          <label htmlFor={`${id}-assignee`}>
            Assegna a
            <select
              id={`${id}-assignee`}
              className="form-select"
              value={draft.fields.operatoreAssegnatoId ?? ''}
              disabled={locked}
              onChange={(event) => field({ operatoreAssegnatoId: event.target.value || null })}
            >
              <option value="">Non assegnata</option>
              {operatori
                .filter((operator) => operator.stato === 'attivo')
                .map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.cognome} {operator.nome}
                  </option>
                ))}
            </select>
          </label>
        </ClinicalNoteEditor>
        {store.persistenceFailed() && (
          <p role="alert">
            Bozza disponibile in questa pagina. Il browser non consente di conservarla dopo il
            ricaricamento.
          </p>
        )}
        {canPrescribe && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            disabled={locked || !draft.fields.note.trim()}
            onClick={() => setTherapyStamp(facilityLocalMinute())}
          >
            Anteprima terapia dal testo
          </button>
        )}
        {therapyStamp && (
          <Suspense fallback={<p role="status">Apertura anteprima…</p>}>
            <DiaryTherapyPanel
              pazienteId={patient.id}
              entry={{
                title: null,
                content: draft.fields.note.trim(),
                priority: draft.fields.priorita === 'alta' ? 'importante' : draft.fields.priorita,
                status: 'aperta',
                entryDateTime: therapyStamp,
              }}
              onCreated={() => {
                store.discard(patient.id);
                setTherapyStamp(null);
                setTherapySaved(true);
                onTherapyCreated?.();
              }}
              onClose={() => setTherapyStamp(null)}
            />
          </Suspense>
        )}
        {therapySaved && <p role="status">Segnalazione e terapia salvate nel diario paziente.</p>}
        <div className="handover-rounds__actions">
          {draft.dirty && (
            <button
              type="button"
              className="link-btn"
              disabled={locked}
              onClick={() => setDiscard(true)}
            >
              Scarta bozza
            </button>
          )}
          <button
            type="submit"
            className="ds-btn ds-btn--secondary"
            disabled={draft.saving || Boolean(therapyStamp) || blocked || !draft.fields.note.trim()}
          >
            {draft.saving ? 'Salvataggio…' : draft.pending ? 'Riprova salvataggio' : 'Salva'}
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={
              locked ||
              blocked ||
              Boolean(draft.pending) ||
              !draft.fields.note.trim() ||
              !nextAvailable
            }
            onClick={() => onSave(true)}
          >
            Salva e prossimo
          </button>
        </div>
        {draft.outcome?.kind === 'failed' && <p role="alert">{draft.outcome.message}</p>}
        {draft.receipt && (
          <p role="status">
            Consegna salvata per {patient.lastName}, {patient.firstName}.
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </form>
      <ConfirmDialog
        open={discard}
        title="Scartare la bozza?"
        message={
          draft.pending
            ? 'Il salvataggio potrebbe essere già avvenuto. Scartare la bozza non annulla una consegna salvata: verifica prima il Diario paziente.'
            : 'I campi non salvati di questo paziente saranno eliminati.'
        }
        confirmLabel="Scarta bozza"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          store.discard(patient.id);
          setDiscard(false);
        }}
      />
    </section>
  );
}
