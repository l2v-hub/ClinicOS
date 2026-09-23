import type { Paziente } from '../../types';
import { useEffect, useRef } from 'react';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { PatientIdentity } from '../shared/PatientIdentity';
import type { SummaryState } from './useConsegneRoster';
function RosterPatient({
  patient,
  selected,
  summary,
  store,
  onSelect,
  onRetry,
}: {
  patient: Paziente;
  selected: boolean;
  summary?: SummaryState;
  store: ConsegnaDraftStore;
  onSelect: () => void;
  onRetry: () => void;
}) {
  const draft = useConsegnaDraft(store, patient.id);
  const row = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (selected) row.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selected]);
  return (
    <li ref={row} className={`handover-rounds__patient${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="handover-rounds__select"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <PatientIdentity patient={patient} />
        <span className="handover-rounds__badges">
          {draft.dirty && <span>Bozza</span>}
          {draft.receipt && <span>Appena salvata</span>}
          {!summary || summary.status === 'loading' ? (
            <span>Verifica consegne…</span>
          ) : summary.status === 'error' ? (
            <span>Riepilogo non disponibile</span>
          ) : summary.status === 'unavailable' ? (
            <span>Dati non disponibili</span>
          ) : (
            <>
              <span>
                {summary.value.total === 0
                  ? 'Nessuna consegna'
                  : summary.value.open === 0
                    ? `${summary.value.total} nello storico`
                    : `${summary.value.open} aperte`}
              </span>
              {summary.value.urgentOpen > 0 && <span>{summary.value.urgentOpen} urgenti</span>}
              {summary.value.statoRicovero && (
                <span>Ricovero: {summary.value.statoRicovero.replaceAll('_', ' ')}</span>
              )}
            </>
          )}
        </span>
      </button>
      {summary?.status === 'error' && (
        <button type="button" className="link-btn" onClick={onRetry}>
          Riprova riepilogo
        </button>
      )}
    </li>
  );
}
export function ConsegnePatientRoster({
  patients,
  selectedId,
  summaries,
  store,
  onSelect,
  onRetry,
}: {
  patients: Paziente[];
  selectedId?: string;
  summaries: Record<string, SummaryState>;
  store: ConsegnaDraftStore;
  onSelect: (patient: Paziente) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <ul className="handover-rounds__roster" aria-label="Pazienti del giro">
      {patients.map((patient) => (
        <RosterPatient
          key={patient.id}
          patient={patient}
          selected={patient.id === selectedId}
          summary={summaries[patient.id]}
          store={store}
          onSelect={() => onSelect(patient)}
          onRetry={() => onRetry(patient.id)}
        />
      ))}
    </ul>
  );
}
