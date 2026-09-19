import {
  PARAMETER_FIELDS,
  readingTime,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';

export function PatientParameterMonthTable({ readings }: { readings: PatientParameterReading[] }) {
  if (readings.length === 0) return null;
  return (
    <div
      className="parameter-month-scroll"
      role="region"
      aria-label="Rilevazioni mensili per data e ora"
      tabIndex={0}
    >
      <table className="clinicos-table parameter-month-table">
        <caption>
          Una riga per ogni rilevazione salvata. Più orari nella stessa giornata restano separati.
        </caption>
        <thead>
          <tr>
            <th scope="col">Data e ora</th>
            <th scope="col">Parametri</th>
            <th scope="col">Operatore</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <tr key={reading.id}>
              <th scope="row">
                <time dateTime={reading.measuredAt}>{readingTime(reading.measuredAt)}</time>
              </th>
              <td>
                <dl>
                  {PARAMETER_FIELDS.filter((field) => reading.values[field.key]).map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {reading.values[field.key]} {field.unit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </td>
              <td>{reading.authorName}</td>
              <td className="parameter-month-note">{reading.values.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
