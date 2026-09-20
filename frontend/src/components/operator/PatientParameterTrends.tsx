import { useState } from 'react';
import type { PatientParameterReading } from '../../lib/patientParameterReadings';
import {
  TREND_PARAMETERS,
  type TrendParameter,
  type TrendPeriod,
} from '../../lib/patientParameterTrends';
import { PatientParameterTrendChart } from './PatientParameterTrendChart';
import './PatientParameterTrends.css';

export function PatientParameterTrends({
  readings,
  period,
  sourceKey,
}: {
  readings: PatientParameterReading[];
  period: TrendPeriod;
  sourceKey: string;
}) {
  const [selected, setSelected] = useState<TrendParameter[]>(
    TREND_PARAMETERS.map((item) => item.key),
  );
  return (
    <section
      className="parameter-trends parameter-trends--inline"
      aria-label="Andamento grafico del periodo"
    >
      <fieldset className="parameter-trends-selection">
        <legend>Parametri nel grafico</legend>
        <div className="filter-chips">
          {TREND_PARAMETERS.map((item) => (
            <label
              key={item.key}
              className={`filter-chip${selected.includes(item.key) ? ' active' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(item.key)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, item.key]
                      : current.filter((value) => value !== item.key),
                  )
                }
              />
              <span>{item.short}</span>
              <span className="parameter-trends-selection__name">{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {selected.length === 0 ? (
        <p className="cr-empty">Seleziona almeno un parametro per vedere il grafico.</p>
      ) : readings.length === 0 ? (
        <p className="cr-empty">Nessuna rilevazione con data e ora da rappresentare nel periodo.</p>
      ) : (
        <>
          <p className="parameter-trend-note">
            Stesso periodo dei valori sotto. Ogni parametro ha la propria scala; tocca un punto per
            vederne i dettagli.
          </p>
          <PatientParameterTrendChart
            key={sourceKey}
            readings={readings}
            selected={selected}
            period={period}
          />
          <p className="parameter-trend-note">
            Usa Tab e le frecce per spostarti, Invio per aprire il dettaglio. I valori mancanti
            interrompono le linee.
          </p>
        </>
      )}
    </section>
  );
}
