import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { loadPatientParameterTrends } from '../../lib/loadPatientParameterTrends';
import type { PatientParameterReading } from '../../lib/patientParameterReadings';
import {
  TREND_PARAMETERS,
  trendPeriodError,
  trendPreset,
  type TrendParameter,
  type TrendPeriod,
} from '../../lib/patientParameterTrends';
import { PatientParameterTrendChart } from './PatientParameterTrendChart';
import './PatientParameterTrends.css';

export function PatientParameterTrends({ patientId }: { patientId: string }) {
  const [preset, setPreset] = useState('30');
  const [period, setPeriod] = useState<TrendPeriod>(() => trendPreset(30));
  const [draft, setDraft] = useState(period);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TrendParameter[]>(
    TREND_PARAMETERS.map((item) => item.key),
  );
  const [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    readings?: PatientParameterReading[];
    error?: string;
  } | null>(null);
  const generation = useRef(0);
  const requestKey = `${patientId}:${period.start}:${period.end}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    const version = ++generation.current;
    setResult(null);
    setProgress(0);
    void loadPatientParameterTrends(API_URL, patientId, period, {
      headers: operatorHeaders(),
      signal: controller.signal,
      onProgress: (count) => {
        if (!controller.signal.aborted && version === generation.current) setProgress(count);
      },
    })
      .then((readings) => {
        if (!controller.signal.aborted && version === generation.current)
          setResult({ key: requestKey, readings });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && version === generation.current)
          setResult({
            key: requestKey,
            error:
              error instanceof Error
                ? error.message
                : 'Impossibile caricare le rilevazioni. Riprova.',
          });
      });
    return () => controller.abort();
  }, [patientId, period, requestKey]);
  const current = result?.key === requestKey ? result : null;
  const readings = current?.readings;
  const dateLabel = (date: string) => date.split('-').reverse().join('/');
  return (
    <section className="parameter-trends" aria-label="Andamento parametri vitali">
      <header className="parameter-trends-heading">
        <div>
          <h3>Andamento dei parametri</h3>
          <p>Confronta le rilevazioni nel tempo. Seleziona un punto per vederne i dettagli.</p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => setRevision((value) => value + 1)}
        >
          Aggiorna
        </button>
      </header>
      <div className="parameter-trends-controls">
        <div className="filter-chips" role="group" aria-label="Periodo del grafico">
          {[
            ['7', '7 giorni'],
            ['30', '30 giorni'],
            ['90', '90 giorni'],
            ['custom', 'Personalizzato'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={`filter-chip${preset === value ? ' active' : ''}`}
              aria-pressed={preset === value}
              onClick={() => {
                setPreset(value);
                setRangeError(null);
                if (value !== 'custom') {
                  const next = trendPreset(Number(value));
                  setPeriod(next);
                  setDraft(next);
                } else setDraft(period);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <form
            className="parameter-trends-range"
            onSubmit={(event) => {
              event.preventDefault();
              const error = trendPeriodError(draft);
              setRangeError(error);
              if (!error) setPeriod({ ...draft });
            }}
          >
            <label>
              Dal
              <input
                type="date"
                className="form-input"
                min="2000-01-01"
                max="2099-12-31"
                required
                value={draft.start}
                onChange={(event) => {
                  setDraft({ ...draft, start: event.target.value });
                  setRangeError(null);
                }}
              />
            </label>
            <label>
              Al
              <input
                type="date"
                className="form-input"
                min="2000-01-01"
                max="2099-12-31"
                required
                value={draft.end}
                onChange={(event) => {
                  setDraft({ ...draft, end: event.target.value });
                  setRangeError(null);
                }}
              />
            </label>
            <button type="submit" className="btn-secondary btn-sm">
              Mostra periodo
            </button>
            <span>Fino a 366 giorni</span>
            {rangeError && (
              <p role="alert" className="parameter-trends-error">
                {rangeError}
              </p>
            )}
          </form>
        )}
        <fieldset className="parameter-trends-selection">
          <legend>Parametri da mostrare</legend>
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
                    setSelected((values) =>
                      event.target.checked
                        ? [...values, item.key]
                        : values.filter((value) => value !== item.key),
                    )
                  }
                />
                <span>{item.short}</span>
                <span className="parameter-trends-selection__name">{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="parameter-trends-summary">
        <strong>
          {dateLabel(period.start)} – {dateLabel(period.end)}
        </strong>
        {readings && (
          <span>
            {readings.length}{' '}
            {readings.length === 1 ? 'rilevazione nel periodo' : 'rilevazioni nel periodo'}
          </span>
        )}
      </div>
      {!current && (
        <p role="status">
          Caricamento delle rilevazioni del periodo…{progress > 0 ? ` ${progress} lette` : ''}
        </p>
      )}
      {current?.error && (
        <div role="alert" className="parameter-trends-error">
          <p>{current.error} Il grafico non è disponibile.</p>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setRevision((value) => value + 1)}
          >
            Riprova
          </button>
        </div>
      )}
      {readings &&
        (selected.length === 0 ? (
          <p className="cr-empty">Seleziona almeno un parametro per vedere il grafico.</p>
        ) : readings.length === 0 ? (
          <p className="cr-empty">
            Nessuna rilevazione con data e ora nel periodo scelto. Prova ad ampliare il periodo.
          </p>
        ) : (
          <>
            <p className="parameter-trend-note">
              Ogni parametro ha la propria scala. Le linee collegano le misurazioni disponibili; le
              interruzioni indicano valori mancanti.
            </p>
            <PatientParameterTrendChart
              key={requestKey}
              readings={readings}
              selected={selected}
              period={period}
            />
            <p className="parameter-trend-note">
              Tocca un punto oppure usa Tab e le frecce per spostarti, Invio per aprire il
              dettaglio.
            </p>
          </>
        ))}
      <p className="parameter-trends-source">
        Il grafico mostra le rilevazioni registrate con data e ora. I dati delle griglie precedenti
        e le annotazioni, come l’evacuazione, restano consultabili nello storico.
      </p>
    </section>
  );
}
