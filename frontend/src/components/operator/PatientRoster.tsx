import { memo } from 'react';
import {
  birthSummary as patientBirthSummary,
  incompleteDemographicFields,
} from '../../lib/patientDemographics';
import type { ClinicalSummaryEntry, Paziente } from '../../types';
import { IcoChevronRight, IcoTrash } from '../../icons';
import { IndicatoreAnomalie } from './cartella/AvvisoAnomalieFarmaci';
import { anomalieDelPaziente, type AnomalieReparto } from './cartella/useAnomalieReparto';
import {
  ADMISSION_LABELS as STATO_RICOVERO_LABEL,
  PATIENT_SORT_LABELS,
  togglePatientSort,
  type PatientRosterSort,
  type PatientSortField,
} from '../../lib/patientRosterSort';

function birthSummary(patient: Paziente): string {
  const sex = patient.sex === 'M' ? 'M' : patient.sex === 'F' ? 'F' : 'Sesso non indicato';
  return `${patientBirthSummary(patient.dateOfBirth)} · ${sex}`;
}

function FiscalCode({ patient }: { patient: Paziente }) {
  return patient.codiceFiscale ? (
    <span className="patient-fiscal-code">{patient.codiceFiscale}</span>
  ) : (
    <span className="patient-fiscal-code patient-fiscal-code--missing">
      Codice fiscale non disponibile
    </span>
  );
}

function PatientSignals({
  patient,
  summary,
  openHandovers,
  anomalies,
  summaryLoading,
}: {
  patient: Paziente;
  summary?: ClinicalSummaryEntry;
  openHandovers: number;
  anomalies: AnomalieReparto;
  summaryLoading?: boolean;
}) {
  const patientAnomalies = anomalieDelPaziente(anomalies, patient.id);
  const hasSignals =
    Boolean(summary?.hasCriticalVitals || summary?.hasHighRisk) ||
    Boolean(summary?.allergieCount) ||
    patientAnomalies.totale > 0 ||
    openHandovers > 0;

  if (!hasSignals) {
    const incomplete = !summary || anomalies.fallito || anomalies.verificaIncompleta;
    const pending = summaryLoading || anomalies.inCorso;
    return (
      <span className="patient-signals__empty">
        {pending
          ? 'Verifica in corso…'
          : incomplete
            ? 'Segnalazioni non disponibili'
            : 'Nessuna segnalazione'}
      </span>
    );
  }

  return (
    <div
      className="patient-signals"
      aria-label={`Segnalazioni per ${patient.firstName} ${patient.lastName}`}
    >
      {(summary?.hasCriticalVitals || summary?.hasHighRisk) && (
        <span className="alert-chip alert-chip--red">Critico</span>
      )}
      {Boolean(summary?.allergieCount) && (
        <span className="alert-chip alert-chip--amber">Allergie {summary?.allergieCount}</span>
      )}
      <IndicatoreAnomalie esito={patientAnomalies} />
      {openHandovers > 0 && (
        <span className="patient-signal patient-signal--handover">Consegne {openHandovers}</span>
      )}
    </div>
  );
}

interface PatientRosterProps {
  patients: Paziente[];
  sort: PatientRosterSort;
  onSortChange: (sort: PatientRosterSort) => void;
  hasMore: boolean;
  loading: boolean;
  summaryLoading?: boolean;
  summaryMap: ReadonlyMap<string, ClinicalSummaryEntry>;
  consegneAperteMap: ReadonlyMap<string, number>;
  anomalie: AnomalieReparto;
  deleteEnabled: boolean;
  deletingId: string | null;
  onSelect: (patient: Paziente) => void;
  onDelete: (patient: Paziente, event: React.MouseEvent) => void;
}

const PatientCard = memo(function PatientCard({
  patient,
  summary,
  openHandovers,
  anomalie,
  summaryLoading,
  deleteEnabled,
  deleting,
  onSelect,
  onDelete,
}: {
  patient: Paziente;
  summary?: ClinicalSummaryEntry;
  openHandovers: number;
  anomalie: AnomalieReparto;
  summaryLoading?: boolean;
  deleteEnabled: boolean;
  deleting: boolean;
  onSelect: (patient: Paziente) => void;
  onDelete: (patient: Paziente, event: React.MouseEvent) => void;
}) {
  const state = summary?.statoRicovero;
  const fullName = `${patient.lastName}, ${patient.firstName}`;
  return (
    <article className="patient-card">
      <div className="patient-card__head">
        <span className="patient-card__avatar" aria-hidden="true">
          {patient.firstName[0]}
          {patient.lastName[0]}
        </span>
        <div className="patient-card__identity">
          <strong>{fullName}</strong>
          <span>{birthSummary(patient)}</span>
          {incompleteDemographicFields(patient).length > 0 && (
            <small>Anagrafica da completare</small>
          )}
        </div>
        <button
          type="button"
          className="patient-card__open"
          onClick={() => onSelect(patient)}
          aria-label={`Apri cartella di ${patient.firstName} ${patient.lastName}`}
        >
          Apri <IcoChevronRight />
        </button>
      </div>
      <div className="patient-card__fiscal">
        <span>Codice fiscale</span>
        <FiscalCode patient={patient} />
      </div>
      <div className="patient-card__context">
        {state ? (
          <span className={`stato-pill stato-pill--ricovero-${state}`}>
            {STATO_RICOVERO_LABEL[state] ?? state}
          </span>
        ) : (
          <span className="patient-signals__empty">
            {summaryLoading ? 'Caricamento ricovero…' : 'Ricovero non disponibile'}
          </span>
        )}
        <PatientSignals
          patient={patient}
          summary={summary}
          openHandovers={openHandovers}
          anomalies={anomalie}
          summaryLoading={summaryLoading}
        />
      </div>
      {deleteEnabled && (
        <button
          type="button"
          className="patient-card__delete"
          disabled={deleting}
          onClick={(event) => onDelete(patient, event)}
          aria-label={`Elimina ${patient.firstName} ${patient.lastName}`}
        >
          <IcoTrash /> Elimina paziente di test
        </button>
      )}
    </article>
  );
});

export function PatientRoster({
  patients,
  sort,
  onSortChange,
  hasMore,
  loading,
  summaryLoading,
  summaryMap,
  consegneAperteMap,
  anomalie,
  deleteEnabled,
  deletingId,
  onSelect,
  onDelete,
}: PatientRosterProps) {
  const ariaSort = (field: PatientSortField) =>
    sort.field === field
      ? sort.direction === 'asc'
        ? ('ascending' as const)
        : ('descending' as const)
      : undefined;
  const sortButton = (field: PatientSortField, label: string) => {
    const next = togglePatientSort(sort, field);
    const action = `Ordina per ${label.toLowerCase()} in ordine ${next.direction === 'asc' ? 'crescente' : 'decrescente'}`;
    return (
      <button
        type="button"
        className="patient-roster__sort"
        aria-label={action}
        title={field === 'signals' ? `${action} · Numero di segnalazioni disponibili` : action}
        onClick={() => onSortChange(next)}
      >
        {label}
        <span aria-hidden="true" className="patient-roster__sort-arrow">
          {sort.field === field ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    );
  };
  return (
    <>
      <div className="patient-roster-order">
        <div className="patient-roster-order__mobile">
          <label htmlFor="patient-sort-field">Ordina per</label>
          <select
            id="patient-sort-field"
            className="form-input"
            value={sort.field}
            onChange={(event) =>
              onSortChange({ field: event.target.value as PatientSortField, direction: 'asc' })
            }
          >
            {Object.entries(PATIENT_SORT_LABELS).map(([field, label]) => (
              <option key={field} value={field}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            aria-label={`Imposta ordine ${sort.direction === 'asc' ? 'decrescente' : 'crescente'}`}
            onClick={() => onSortChange(togglePatientSort(sort, sort.field))}
          >
            {sort.direction === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
          </button>
        </div>
        <span className="patient-roster-order__status" role="status" aria-live="polite">
          {PATIENT_SORT_LABELS[sort.field]}:{' '}
          {sort.direction === 'asc' ? 'crescente' : 'decrescente'}
          {sort.field === 'signals' ? ' · Numero di segnalazioni disponibili' : ''}
          {hasMore ? ' · Nei pazienti caricati' : ''}
        </span>
      </div>
      {(anomalie.inCorso || anomalie.fallito || anomalie.verificaIncompleta) && (
        <div
          className={`patient-roster-status${
            anomalie.fallito || anomalie.verificaIncompleta ? ' patient-roster-status--warning' : ''
          }`}
          role="status"
          aria-live="polite"
        >
          {anomalie.fallito || anomalie.verificaIncompleta
            ? 'Verifica farmaci di reparto incompleta: alcune segnalazioni potrebbero non essere disponibili.'
            : 'Verifica farmaci di reparto in corso…'}
        </div>
      )}
      <div className="patient-roster-wrap" aria-busy={loading}>
        <table className="patient-roster">
          <caption className="sr-only">Elenco pazienti caricati</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={ariaSort('patient')}>
                {sortButton('patient', 'Paziente')}
              </th>
              <th scope="col" aria-sort={ariaSort('fiscalCode')}>
                {sortButton('fiscalCode', 'Codice fiscale')}
              </th>
              <th scope="col" aria-sort={ariaSort('admission')}>
                {sortButton('admission', 'Ricovero')}
              </th>
              <th scope="col" aria-sort={ariaSort('signals')}>
                {sortButton('signals', 'Segnalazioni')}
              </th>
              <th scope="col" className="patient-roster__action-heading">
                Azione
              </th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan={5} className="patient-roster__empty">
                  <span role="status" aria-live="polite">
                    {loading ? 'Caricamento…' : 'Nessun paziente trovato'}
                  </span>
                </td>
              </tr>
            ) : (
              patients.map((patient) => {
                const summary = summaryMap.get(patient.id);
                const state = summary?.statoRicovero;
                const openLabel = `Apri cartella di ${patient.firstName} ${patient.lastName}`;
                return (
                  <tr
                    key={patient.id}
                    className="patient-roster__row"
                    tabIndex={0}
                    aria-label={openLabel}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('button')) return;
                      onSelect(patient);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      onSelect(patient);
                    }}
                  >
                    <td>
                      <div className="patient-roster__identity">
                        <span className="patient-roster__avatar" aria-hidden="true">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </span>
                        <span>
                          <strong>
                            {patient.lastName}, {patient.firstName}
                          </strong>
                          <small>{birthSummary(patient)}</small>
                          {incompleteDemographicFields(patient).length > 0 && (
                            <small>Anagrafica da completare</small>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <FiscalCode patient={patient} />
                    </td>
                    <td>
                      {state ? (
                        <span className={`stato-pill stato-pill--ricovero-${state}`}>
                          {STATO_RICOVERO_LABEL[state] ?? state}
                        </span>
                      ) : (
                        <span className="patient-signals__empty">
                          {summaryLoading ? 'Caricamento…' : 'Non disponibile'}
                        </span>
                      )}
                    </td>
                    <td>
                      <PatientSignals
                        patient={patient}
                        summary={summary}
                        openHandovers={consegneAperteMap.get(patient.id) ?? 0}
                        anomalies={anomalie}
                        summaryLoading={summaryLoading}
                      />
                    </td>
                    <td className="patient-roster__actions">
                      {deleteEnabled && (
                        <button
                          type="button"
                          className="patient-roster__delete"
                          disabled={deletingId === patient.id}
                          onClick={(event) => onDelete(patient, event)}
                          aria-label={`Elimina ${patient.firstName} ${patient.lastName}`}
                        >
                          <IcoTrash />
                        </button>
                      )}
                      <button
                        type="button"
                        className="patient-roster__open"
                        onClick={() => onSelect(patient)}
                        aria-label={openLabel}
                      >
                        <IcoChevronRight />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="patient-card-grid" aria-busy={loading}>
        {patients.length === 0 ? (
          <div className="patient-card-grid__state" role="status" aria-live="polite">
            {loading ? 'Caricamento…' : 'Nessun paziente trovato'}
          </div>
        ) : (
          patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              summary={summaryMap.get(patient.id)}
              openHandovers={consegneAperteMap.get(patient.id) ?? 0}
              anomalie={anomalie}
              summaryLoading={summaryLoading}
              deleteEnabled={deleteEnabled}
              deleting={deletingId === patient.id}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </>
  );
}
