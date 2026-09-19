import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartellaPaziente } from '../../types';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import {
  PARAMETER_FIELDS,
  fetchParameterReadings,
  legacyParameterEntries,
  readingTime,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { facilityLocalMinute } from '../../lib/facilityTime';
import './PatientParameters.css';

export function PatientParameterHistory({
  patientId,
  cartella,
}: {
  patientId: string;
  cartella: CartellaPaziente;
}) {
  const [date, setDate] = useState('');
  const [readings, setReadings] = useState<PatientParameterReading[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [legacyLimit, setLegacyLimit] = useState(25);
  const generation = useRef(0);
  const moreRequest = useRef<AbortController | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const legacy = useMemo(
    () => legacyParameterEntries(cartella).filter((item) => !date || item.date === date),
    [cartella, date],
  );
  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    moreRequest.current?.abort();
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setReadings([]);
    setCursor(null);
    setLegacyLimit(25);
    void fetchParameterReadings(
      API_URL,
      patientId,
      { date },
      { headers: operatorHeaders(), signal: controller.signal },
    )
      .then((page) => {
        if (version === generation.current) {
          setReadings(page.readings);
          setCursor(page.nextCursor);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted && version === generation.current) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted && version === generation.current) setLoading(false);
      });
    return () => {
      controller.abort();
      moreRequest.current?.abort();
      ++generation.current;
    };
  }, [patientId, date, revision]);
  async function more() {
    if (!cursor || loading || moreRequest.current) return;
    const version = generation.current;
    const controller = new AbortController();
    moreRequest.current = controller;
    setLoadingMore(true);
    setError('');
    try {
      const page = await fetchParameterReadings(
        API_URL,
        patientId,
        { date, cursor },
        { headers: operatorHeaders(), signal: controller.signal },
      );
      if (version !== generation.current) return;
      setReadings((current) => [
        ...new Map([...current, ...page.readings].map((item) => [item.id, item])).values(),
      ]);
      setCursor(page.nextCursor);
    } catch {
      if (!controller.signal.aborted && version === generation.current)
        setError('Impossibile caricare altre rilevazioni. Riprova.');
    } finally {
      if (moreRequest.current === controller) moreRequest.current = null;
      if (version === generation.current) setLoadingMore(false);
    }
  }
  return (
    <section className="parameter-history" aria-label="Storico parametri vitali">
      <header className="parameter-history-toolbar">
        <div>
          <h3>Rilevazioni registrate</h3>
          <p>Data, ora e operatore di ogni salvataggio · dalla più recente</p>
        </div>
        <label>
          Giornata
          <input
            type="date"
            className="form-input"
            value={date}
            min="2000-01-01"
            max="2099-12-31"
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <button
          className="btn-secondary btn-sm"
          onClick={() => {
            setDate('');
            setRevision((value) => value + 1);
          }}
        >
          Tutte le giornate
        </button>
        <button className="btn-secondary btn-sm" onClick={() => setRevision((value) => value + 1)}>
          Aggiorna
        </button>
      </header>
      {loading && <p role="status">Caricamento storico…</p>}
      {error && (
        <p role="alert" className="parameter-history-error">
          {error}{' '}
          <button
            className="btn-secondary btn-sm"
            onClick={() => setRevision((value) => value + 1)}
          >
            Riprova
          </button>
        </p>
      )}
      {!loading && !error && readings.length === 0 && (
        <p className="cr-empty">
          Nessuna rilevazione {date ? 'in questa giornata' : 'registrata dalla compilazione rapida'}
          .
        </p>
      )}
      <ol className="parameter-history-list">
        {readings.map((reading, index) => {
          const localDay = facilityLocalMinute(new Date(reading.measuredAt)).slice(0, 10);
          const firstOfDay =
            index === 0 ||
            facilityLocalMinute(new Date(readings[index - 1].measuredAt)).slice(0, 10) !== localDay;
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
      {cursor && (
        <button
          className="btn-secondary"
          disabled={loadingMore || loading}
          onClick={() => void more()}
        >
          {loadingMore ? 'Caricamento…' : 'Carica rilevazioni precedenti'}
        </button>
      )}
      {legacy.length > 0 && (
        <details className="parameter-history-legacy" open={readings.length === 0 && !loading}>
          <summary>Dati della griglia e delle registrazioni precedenti ({legacy.length})</summary>
          <p>
            Questi dati restano disponibili. L’orario viene mostrato soltanto se era stato
            registrato.
          </p>
          <ul>
            {legacy.slice(0, legacyLimit).map((item) => (
              <li key={item.id}>
                <strong>
                  {item.date ? item.date.split('-').reverse().join('/') : 'Data non disponibile'} ·{' '}
                  {item.time}
                </strong>
                <p>{item.values}</p>
                {item.author && <small>{item.author}</small>}
              </li>
            ))}
          </ul>
          {legacy.length > legacyLimit && (
            <button
              className="btn-secondary btn-sm"
              onClick={() => setLegacyLimit((value) => value + 25)}
            >
              Mostra altri dati precedenti
            </button>
          )}
        </details>
      )}
    </section>
  );
}
