import { useMemo, useState, type ReactNode } from 'react';
import type { CartellaPaziente } from '../../types';
import {
  PARAMETER_FIELDS,
  legacyParameterEntries,
  readingTime,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { facilityLocalMinute } from '../../lib/facilityTime';
import { parameterDayInPeriod } from '../../lib/patientParameterWorkspace';
import type { TrendPeriod } from '../../lib/patientParameterTrends';
import './PatientParameters.css';

export function PatientParameterHistory({
  readings,
  cartella,
  period,
  children,
}: {
  readings: PatientParameterReading[];
  cartella: CartellaPaziente;
  period: TrendPeriod;
  children?: ReactNode;
}) {
  const [limit, setLimit] = useState(50);
  const [legacyLimit, setLegacyLimit] = useState(25);
  const ordered = useMemo(() => [...readings].reverse(), [readings]);
  const legacy = useMemo(() => legacyParameterEntries(cartella), [cartella]);
  const dated = legacy.filter((item) => parameterDayInPeriod(item.date, period));
  const undated = legacy.filter((item) => !item.date);
  return (
    <section className="parameter-history" aria-label="Valori registrati nel periodo">
      <h3 className="parameter-workspace-list-title">Rilevazioni registrate</h3>
      {!readings.length && (
        <p className="cr-empty">Nessuna rilevazione con data e ora nel periodo selezionato.</p>
      )}
      <ol className="parameter-history-list">
        {ordered.slice(0, limit).map((reading, index) => {
          const localDay = facilityLocalMinute(new Date(reading.measuredAt)).slice(0, 10);
          const firstOfDay =
            index === 0 ||
            facilityLocalMinute(new Date(ordered[index - 1].measuredAt)).slice(0, 10) !== localDay;
          return (
            <li key={reading.id} className="parameter-history-entry">
              {firstOfDay && (
                <h4 className="parameter-history-day">{localDay.split('-').reverse().join('/')}</h4>
              )}
              <article
                className="parameter-history-reading"
                aria-label={`Rilevazione ${readingTime(reading.measuredAt)}`}
              >
                <div className="parameter-history-stamp">
                  <time dateTime={reading.measuredAt}>
                    {readingTime(reading.measuredAt).slice(-5)}
                  </time>
                  <span>{reading.authorName}</span>
                </div>
                <dl>
                  {PARAMETER_FIELDS.filter((field) => reading.values[field.key]).map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {reading.values[field.key]} <small>{field.unit}</small>
                      </dd>
                    </div>
                  ))}
                </dl>
                {reading.values.note && (
                  <p className="parameter-history-note">
                    <strong>Note</strong> {reading.values.note}
                  </p>
                )}
              </article>
            </li>
          );
        })}
      </ol>
      {ordered.length > limit && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setLimit((value) => value + 50)}
        >
          Mostra altre rilevazioni ({ordered.length - limit})
        </button>
      )}
      {legacy.length > 0 && (
        <details className="parameter-history-legacy">
          <summary>Dati delle registrazioni precedenti</summary>
          <p>
            {dated.length} nel periodo selezionato. L'orario viene mostrato solo se era stato
            registrato.
          </p>
          <ul>
            {dated.slice(0, legacyLimit).map((item) => (
              <li key={item.id}>
                <strong>
                  {item.date.split('-').reverse().join('/')} · {item.time}
                </strong>
                <p>{item.values}</p>
                {item.author && <small>{item.author}</small>}
              </li>
            ))}
          </ul>
          {dated.length > legacyLimit && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setLegacyLimit((value) => value + 25)}
            >
              Mostra altri dati precedenti
            </button>
          )}
          {undated.length > 0 && (
            <details>
              <summary>Dati senza data ({undated.length})</summary>
              <p>Non inclusi nel periodo o nel grafico perché la data non è disponibile.</p>
              <ul>
                {undated.map((item) => (
                  <li key={item.id}>
                    <strong>Data non disponibile · {item.time}</strong>
                    <p>{item.values}</p>
                    {item.author && <small>{item.author}</small>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {children}
        </details>
      )}
    </section>
  );
}
