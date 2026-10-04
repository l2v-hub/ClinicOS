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
  summary: _summary,
  store,
  onSelect,
  onRetry: _onRetry,
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
          </span>
        </span>
      </button>
      <a className="ds-link" href={`#/dettaglio-paziente/${encodeURIComponent(patient.id)}`} aria-label={`Diario di ${patient.lastName}, ${patient.firstName}`}>
        Diario paziente →
      </a>
    </li>
  );
}
export function ConsegnePatientRoster({
  patients,
  selectedId,
  summaries,
  store,
  onSelect,
  onRetry: _onRetry,
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
          onRetry={() => _onRetry(patient.id)}
        />
      ))}
    </ul>
  );
}
