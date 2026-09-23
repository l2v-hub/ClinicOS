import { useEffect, useId, useRef, useState } from 'react';
import type { Operatore, Paziente, PrioritaConsegna } from '../../types';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { PatientIdentity } from '../shared/PatientIdentity';
import { ConfirmDialog } from '../shared/ConfirmDialog';
const TYPES = [
  'Monitoraggio',
  'Terapia',
  'Esami',
  'Dimissione',
  'Medicazione',
  'Consultazione',
  'Rivalutazione',
  'Altro',
];
export function ConsegnaComposer({
  patient,
  store,
  operatori,
  onSave,
  nextAvailable = false,
  message = '',
  focusRequest = 0,
}: {
  patient: Paziente;
  store: ConsegnaDraftStore;
  operatori: Operatore[];
  onSave: (advance: boolean) => void;
  nextAvailable?: boolean;
  message?: string;
  focusRequest?: number;
}) {
  const draft = useConsegnaDraft(store, patient.id);
  const id = useId();
  const [discard, setDiscard] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const identityRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
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
      noteRef.current?.focus({ preventScroll: true });
      noteRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusRequest]);
  const locked = draft.saving || Boolean(draft.pending);
  const blocked =
    draft.outcome?.kind === 'failed' && !draft.outcome.uncertain && Boolean(draft.pending);
  const field = (change: Parameters<ConsegnaDraftStore['update']>[1]) =>
    store.update(patient.id, change);
  return (
    <section className="handover-rounds__composer" aria-label="Scrivi consegna">
      <h3>Nuova consegna</h3>
      <form
        ref={formRef}
        aria-busy={draft.saving}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(false);
        }}
      >
        <div ref={identityRef} className="handover-rounds__composer-identity">
          <PatientIdentity patient={patient} />
        </div>
        <div className="handover-rounds__fields">
          <label htmlFor={`${id}-type`}>
            Tipo
            <select
              id={`${id}-type`}
              className="form-select"
              value={draft.fields.tipo}
              disabled={locked}
              onChange={(event) => field({ tipo: event.target.value })}
            >
              {TYPES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-priority`}>
            Priorità
            <select
              id={`${id}-priority`}
              className="form-select"
              value={draft.fields.priorita}
              disabled={locked}
              onChange={(event) => field({ priorita: event.target.value as PrioritaConsegna })}
            >
              <option value="normale">Normale</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>
          <label htmlFor={`${id}-date`}>
            Data scadenza
            <input
              id={`${id}-date`}
              type="date"
              className="form-input"
              value={draft.fields.scadenza}
              disabled={locked}
              required
              onChange={(event) => field({ scadenza: event.target.value })}
            />
          </label>
          <label htmlFor={`${id}-time`}>
            Ora scadenza (opzionale)
            <input
              id={`${id}-time`}
              type="time"
              className="form-input"
              value={draft.fields.oraScadenza ?? ''}
              disabled={locked}
              onChange={(event) => field({ oraScadenza: event.target.value })}
            />
          </label>
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
        </div>
        <label className="handover-rounds__note" htmlFor={`${id}-note`}>
          Cosa deve essere fatto?
          <textarea
            ref={noteRef}
            id={`${id}-note`}
            className="form-input"
            rows={5}
            maxLength={4000}
            required
            value={draft.fields.note}
            disabled={locked}
            onChange={(event) => field({ note: event.target.value })}
          />
        </label>
        <span className="handover-rounds__hint">
          {draft.fields.note.length}/4000 · La nuova consegna sarà aperta.
        </span>
        <div className="handover-rounds__actions">
          <button
            type="submit"
            className="btn-success"
            disabled={draft.saving || blocked || !draft.fields.note.trim()}
          >
            {draft.saving ? 'Salvataggio…' : draft.pending ? 'Riprova salvataggio' : 'Salva'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={
              draft.saving ||
              blocked ||
              Boolean(draft.pending) ||
              !draft.fields.note.trim() ||
              !nextAvailable
            }
            onClick={() => onSave(true)}
          >
            Salva e prossimo
          </button>
          {draft.dirty && (
            <button
              type="button"
              className="link-btn"
              disabled={draft.saving}
              onClick={() => setDiscard(true)}
            >
              Scarta bozza
            </button>
          )}
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
            ? 'Il salvataggio potrebbe essere già avvenuto. Scartare la bozza non annulla una consegna salvata: verifica prima il Feed.'
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
