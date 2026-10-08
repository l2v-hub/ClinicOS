import type { UnscheduledMedication } from '../../../lib/patientTherapyCalendar';

interface Props {
  doseCount: number;
  timeCount: number;
  incomplete: UnscheduledMedication[];
  period: 'giorno' | 'settimana';
  onEdit?: (therapyId: string) => void;
}

/** Counts refer to scheduled occurrences, not to the total number of prescriptions.
 * A prescription with both valid and invalid times can appear in both groups. */
export function PatientTherapyScheduleSummary({
  doseCount,
  timeCount,
  incomplete,
  period,
  onEdit,
}: Props) {
  const periodText = period === 'giorno' ? 'questo giorno' : 'questa settimana';
  return (
    <div className="patient-therapy-calendar__summary">
      <p className="patient-therapy-calendar__count" role="status">
        {doseCount} {doseCount === 1 ? 'dose programmata' : 'dosi programmate'} · {timeCount}{' '}
        {timeCount === 1 ? 'orario esatto' : 'orari esatti'}
      </p>
      {doseCount === 0 && (
        <p className="patient-therapy-calendar__empty">
          Nessuna dose programmata per {periodText}.
          {incomplete.length > 0 &&
            ' La programmazione è da completare: questo non significa assenza di terapia.'}
        </p>
      )}
      {incomplete.length > 0 && (
        <section
          className="patient-therapy-calendar__programming"
          aria-label="Programmazione da completare"
        >
          <p role="status">
            <strong>
              {incomplete.length} {incomplete.length === 1 ? 'terapia' : 'terapie'} con
              programmazione da completare
            </strong>
          </p>
          <p>Gli orari mancanti o non validi non generano dosi nel calendario.</p>
          {!onEdit && (
            <p>Per completare o verificare la programmazione, contatta il medico prescrittore.</p>
          )}
          <details>
            <summary>Vedi terapie da programmare ({incomplete.length})</summary>
            <ul>
              {incomplete.map((item) => (
                <li key={item.therapyId}>
                  <strong>{item.drugName}</strong>
                  <span>
                    {item.dose} · {item.route}
                    {item.prescriber ? ` · Prescr. ${item.prescriber}` : ''}
                  </span>
                  <p>{item.reason}</p>
                  {onEdit && (
                    <button
                      type="button"
                      className="ds-btn ds-btn--secondary"
                      aria-label={`Completa programmazione di ${item.drugName}`}
                      onClick={() => onEdit(item.therapyId)}
                    >
                      Completa programmazione
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
