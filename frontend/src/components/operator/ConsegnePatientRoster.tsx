import type { Paziente } from '../../types';
import { useEffect, useRef } from 'react';
import type { ConsegnaDraftStore } from '../../lib/consegnaDrafts';
import { useConsegnaDraft } from '../../lib/useConsegnaDraft';
import { parsePatientLocation } from '../../lib/patientIdentity';
import { PatientIdentity } from '../shared/PatientIdentity';
import type { SummaryState } from './useConsegneRoster';
/** Camera dalla posizione attuale; mai inventata. */
function roomOf(patient: Paziente): string {
  const location = parsePatientLocation(patient.location);
  return location?.status === 'assigned' && location.room ? location.room : '—';
}
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
        <span className="ho-bed" aria-hidden="true">
          {roomOf(patient)}
        </span>
        <span className="ho-who">
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
                    : summary.value.total === 1
                      ? '1 consegna'
                      : `${summary.value.total} consegne`}
                </span>
                {summary.value.urgentActive > 0 && (
                  <span>
                    {summary.value.urgentActive === 1
                      ? '1 urgenza da prendere in carico'
                      : `${summary.value.urgentActive} urgenze da prendere in carico`}
                  </span>
                )}
                {summary.value.statoRicovero && (
                  <span>Ricovero: {summary.value.statoRicovero.replaceAll('_', ' ')}</span>
                )}
              </>
            )}
          </span>
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
