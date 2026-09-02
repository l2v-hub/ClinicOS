import { memo } from 'react';
import type { ClinicalSummaryEntry, Paziente } from '../../types';
import { IcoChevronRight, IcoTrash } from '../../icons';
import { IndicatoreAnomalie } from './cartella/AvvisoAnomalieFarmaci';
import { anomalieDelPaziente, type AnomalieReparto } from './cartella/useAnomalieReparto';

const STATO_RICOVERO_LABEL: Record<string, string> = {
  ricoverato: 'Ricoverato',
  ambulatoriale: 'Ambulatoriale',
  day_hospital: 'Day Hospital',
  dimesso: 'Dimesso',
};

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function birthSummary(patient: Paziente): string {
  const date = new Date(patient.dateOfBirth).toLocaleDateString('it-IT');
  const sex = patient.sex === 'M' ? 'M' : patient.sex === 'F' ? 'F' : 'Sesso non indicato';
  return `${date} · ${calcAge(patient.dateOfBirth)} anni · ${sex}`;
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
}: {
  patient: Paziente;
  summary?: ClinicalSummaryEntry;
  openHandovers: number;
  anomalies: AnomalieReparto;
}) {
  const patientAnomalies = anomalieDelPaziente(anomalies, patient.id);
  const hasSignals =
    Boolean(summary?.hasCriticalVitals || summary?.hasHighRisk) ||
    Boolean(summary?.allergieCount) ||
    patientAnomalies.totale > 0 ||
    openHandovers > 0;

  if (!hasSignals) return <span className="patient-signals__empty">Nessuna segnalazione</span>;

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
  loading: boolean;
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
  deleteEnabled,
  deleting,
  onSelect,
  onDelete,
}: {
  patient: Paziente;
  summary?: ClinicalSummaryEntry;
  openHandovers: number;
  anomalie: AnomalieReparto;
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
          <span className="patient-signals__empty">Ricovero non disponibile</span>
        )}
        <PatientSignals
          patient={patient}
          summary={summary}
          openHandovers={openHandovers}
          anomalies={anomalie}
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
  loading,
  summaryMap,
  consegneAperteMap,
  anomalie,
  deleteEnabled,
  deletingId,
  onSelect,
  onDelete,
}: PatientRosterProps) {
  return (
    <>
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
              <th scope="col">Paziente</th>
              <th scope="col">Codice fiscale</th>
              <th scope="col">Ricovero</th>
              <th scope="col">Segnalazioni</th>
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
                        <span className="patient-signals__empty">Non disponibile</span>
                      )}
                    </td>
                    <td>
                      <PatientSignals
                        patient={patient}
                        summary={summary}
                        openHandovers={consegneAperteMap.get(patient.id) ?? 0}
                        anomalies={anomalie}
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
