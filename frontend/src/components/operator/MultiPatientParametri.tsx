import { useEffect, useMemo, useRef, useState } from 'react';
import { IcoSearch, IcoX } from '../../icons';
import { PageHeader } from '../shared/PageHeader';
import { comparePazienti } from '../../lib/patientSort';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { facilityLocalMinute } from '../../lib/facilityTime';
import {
  fetchPatientParametersPage,
  mergePatientParametersPage,
  type PatientParametersPageItem,
} from '../../lib/patientParametersPage';
import {
  saveParameterReading,
  type ParameterReadingRequest,
} from '../../lib/patientParameterReadings';
import { ParameterEntryRow } from './ParameterEntryRow';
import { ParameterEntryClock } from './ParameterEntryClock';
import './PatientParameters.css';

interface Props {
  operatoreNome: string;
  onSelectPaziente: (patientId: string) => void;
}
export function MultiPatientParametri({ operatoreNome, onSelectPaziente }: Props) {
  const [day, setDay] = useState(() => facilityLocalMinute().slice(0, 10));
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PatientParametersPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const moreController = useRef<AbortController | null>(null);
  const currentDay = useRef(day);
  currentDay.current = day;
  const filters = useMemo(
    () => ({
      q: query.trim() || undefined,
      limit: 25,
      date: day,
      month: Number(day.slice(5, 7)),
      year: Number(day.slice(0, 4)),
    }),
    [query, day],
  );

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    moreController.current?.abort();
    setLoading(true);
    setLoadingMore(false);
    setError('');
    const timer = window.setTimeout(() => {
      void fetchPatientParametersPage(API_URL, filters, {
        headers: operatorHeaders(),
        signal: controller.signal,
      })
        .then((page) => {
          if (version === generation.current) {
            setItems(page.items);
            setNextCursor(page.nextCursor);
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted && version === generation.current) setError(cause.message);
        })
        .finally(() => {
          if (version === generation.current && !controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      moreController.current?.abort();
      ++generation.current;
    };
  }, [filters, revision]);

  async function loadMore() {
    if (!nextCursor || moreController.current || loading) return;
    const controller = new AbortController();
    moreController.current = controller;
    const version = generation.current;
    setLoadingMore(true);
    setError('');
    try {
      const page = await fetchPatientParametersPage(
        API_URL,
        { ...filters, cursor: nextCursor },
        { headers: operatorHeaders(), signal: controller.signal },
      );
      if (version !== generation.current) return;
      setItems((current) => mergePatientParametersPage(current, page.items, true));
      setNextCursor(page.nextCursor);
    } catch {
      if (!controller.signal.aborted && version === generation.current)
        setError('Impossibile caricare altri pazienti. Riprova.');
    } finally {
      if (moreController.current === controller) moreController.current = null;
      if (version === generation.current) setLoadingMore(false);
    }
  }
  async function save(patientId: string, request: ParameterReadingRequest) {
    const { reading, summary } = await saveParameterReading(API_URL, patientId, request, {
      headers: operatorHeaders(),
    });
    if (summary.date === currentDay.current) {
      setItems((current) =>
        current.map((item) =>
          item.patient.id !== patientId
            ? item
            : {
                ...item,
                cartella: {
                  ...item.cartella,
                  readingCount: summary.count,
                  lastReadingAt: summary.lastReadingAt,
                },
              },
        ),
      );
    }
    return reading;
  }
  const sorted = [...items].sort((a, b) => comparePazienti(a.patient, b.patient));
  const recorded = items.filter((item) => (item.cartella.readingCount ?? 0) > 0).length;
  return (
    <div className="patient-list-view parameter-entry-page">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Parametri' }]}
        title="Registrazione parametri"
        subtitle="Compilazione rapida giornaliera. Ogni salvataggio aggiunge una rilevazione allo storico del paziente."
      />
      <ParameterEntryClock onDayChange={setDay} />
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico">
            <IcoSearch />
          </span>
          <input
            type="search"
            className="search-input"
            placeholder="Cerca per nome o camera…"
            aria-label="Cerca paziente per nome o camera"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Cancella ricerca"
            >
              <IcoX />
            </button>
          )}
        </div>
        <span className="parameter-entry-progress" role="status">
          {recorded}/{items.length} pazienti caricati con rilevazioni oggi
        </span>
      </div>
      {loading && <p role="status">Caricamento pazienti…</p>}
      {error && (
        <div className="parameter-history-error" role="alert">
          {error}{' '}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setRevision((value) => value + 1)}
          >
            Riprova caricamento
          </button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="empty-state-card">Nessun paziente in elenco.</p>
      )}
      {items.length > 0 && (
        <section className="qe-section qe-table-surface" aria-label="Inserimento rapido parametri">
          <div className="qe-list" aria-busy={loading}>
            <div className="qe-row qe-row--header" aria-hidden="true">
              <span>Paziente</span>
              <span>PA · mmHg</span>
              <span>SpO₂ · %</span>
              <span>FC · bpm</span>
              <span>TC · °C</span>
              <span>DTX</span>
              <span>Evacuazione</span>
              <span>Note</span>
              <span>Salva</span>
            </div>
            {sorted.map((item) => (
              <ParameterEntryRow
                key={item.patient.id}
                patient={item.patient}
                room={item.cartella.cameraNumero}
                bed={item.cartella.lettoNumero}
                readingCount={item.cartella.readingCount}
                lastReadingAt={item.cartella.lastReadingAt}
                onOpenHistory={() => onSelectPaziente(item.patient.id)}
                onSave={(request) => save(item.patient.id, request)}
              />
            ))}
          </div>
          {nextCursor && (
            <div className="qe-load-more">
              <button
                type="button"
                className="btn-secondary"
                disabled={loading || loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? 'Caricamento…' : 'Carica altri 25 pazienti'}
              </button>
            </div>
          )}
        </section>
      )}
      <p className="parameter-entry-help">
        Operatore: {operatoreNome}. Data e ora vengono registrate quando premi Salva. Seleziona il
        paziente per aprire lo storico.
      </p>
    </div>
  );
}
