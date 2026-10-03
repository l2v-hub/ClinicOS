import { useEffect, useId, useRef, useState } from 'react';
import type { Operatore, Paziente, PrioritaConsegna } from '../../types';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { PatientIdentity } from '../shared/PatientIdentity';
import { patientIdentityName } from '../../lib/patientIdentity';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useCan } from '../../lib/capabilities';
import { corePriorityOptions } from '../../lib/corePriority';
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
  const canCreate = useCan('consegne.create');
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
        <h3>Consegna · {patientIdentityName(patient)}</h3>
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
              {corePriorityOptions(draft.fields.priorita, 'alta', 'Alta').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
          {draft.fields.note.length}/4000 · Data, ora e autore sono registrati automaticamente.
        </span>
        <div className="handover-rounds__actions">
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
          <button
            type="submit"
            className="ds-btn ds-btn--secondary"
            disabled={draft.saving || blocked || !draft.fields.note.trim()}
          >
            {draft.saving ? 'Salvataggio…' : draft.pending ? 'Riprova salvataggio' : 'Salva'}
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--primary"
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
