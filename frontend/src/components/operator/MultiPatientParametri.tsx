import { useEffect, useMemo, useRef, useState } from 'react';
import { IcoSearch, IcoX } from '../../icons';
import { PageHeader } from '../shared/PageHeader';
import { comparePazienti } from '../../lib/patientSort';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { facilityLocalMinute } from '../../lib/facilityTime';
import { fetchPatientPage } from '../../lib/patientPage';
import { applySavedParameterSummary, resetParameterDay } from '../../lib/parameterEntrySummary';
import {
  fetchPatientParametersPage,
  mergePatientParametersPage,
  type PatientParametersPageItem,
} from '../../lib/patientParametersPage';
import {
  saveParameterReading,
  type ParameterReadingRequest,
  type SavedParameterReading,
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
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const moreController = useRef<AbortController | null>(null);
  const currentDay = useRef(day);
  const previousQuery = useRef(query);
  const loadedDay = useRef(day);
  const loadedQuery = useRef<string | null>(null);
  const failedMore = useRef(false);
  const savedSummaries = useRef(new Map<string, SavedParameterReading['summary']>());
  currentDay.current = day;
  const filters = useMemo(
    () => ({
      q: query.trim() || undefined,
      limit: 25,
      date: day,
      month: Number(day.slice(5, 7)),
      year: Number(day.slice(0, 4)),
      view: 'entry' as const,
    }),
    [query, day],
  );

  function protectSavedSummary(item: PatientParametersPageItem): PatientParametersPageItem {
    item = { ...item, summaryDate: day };
    const saved = savedSummaries.current.get(item.patient.id);
    return saved?.date === day ? applySavedParameterSummary(item, saved) : item;
  }

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    moreController.current?.abort();
    setLoading(true);
    setLoadingMore(false);
    setSummaryLoading(true);
    setNextCursor(null);
    setError('');
    failedMore.current = false;
    if (loadedDay.current !== day) {
      loadedDay.current = day;
      setItems((current) => current.map((item) => resetParameterDay(item, day)));
    }
    let detailedReady = false;
    const hadRows = items.length > 0;
    const load = () => {
      // Identities and daily metadata are independent. The detailed page remains
      // authoritative for membership/cursor, including room searches.
      if (!filters.q) {
        void fetchPatientPage(
          API_URL,
          { limit: 25 },
          {
            headers: operatorHeaders(),
            signal: controller.signal,
          },
        )
          .then((page) => {
            if (
              controller.signal.aborted ||
              version !== generation.current ||
              detailedReady ||
              hadRows
            )
              return;
            setItems(
              page.items.map((patient) => ({
                patient,
                cartella: { pazienteId: patient.id, parametriMensili: [] },
                summaryPending: true,
              })),
            );
            setLoading(false);
          })
          .catch(() => {
            /* The parameter page handles failure and can still supply identities. */
          });
      }
      void (async () => {
        const sameFilter = loadedQuery.current === (filters.q ?? '');
        const targetCount = sameFilter ? Math.max(25, items.length) : 25;
        let refreshed: PatientParametersPageItem[] = [];
        let cursor: string | undefined;
        do {
          const page = await fetchPatientParametersPage(
            API_URL,
            { ...filters, cursor },
            {
              headers: operatorHeaders(),
              signal: controller.signal,
            },
          );
          if (controller.signal.aborted || version !== generation.current) return;
          detailedReady = true;
          refreshed = mergePatientParametersPage(
            refreshed,
            page.items.map(protectSavedSummary),
            true,
          );
          const needsMore = Boolean(page.nextCursor && refreshed.length < targetCount);
          const snapshot = refreshed;
          // Do not unmount rows on subsequent pages while refreshing their metadata.
          setItems((current) =>
            sameFilter && needsMore
              ? mergePatientParametersPage(current, snapshot, true)
              : snapshot.map(protectSavedSummary),
          );
          setLoading(false);
          setNextCursor(page.nextCursor);
          cursor = needsMore ? page.nextCursor! : undefined;
        } while (cursor);
        loadedQuery.current = filters.q ?? '';
      })()
        .catch((cause) => {
          if (!controller.signal.aborted && version === generation.current) setError(cause.message);
        })
        .finally(() => {
          if (version === generation.current && !controller.signal.aborted) {
            setLoading(false);
            setSummaryLoading(false);
          }
        });
    };
    const typing = previousQuery.current !== query;
    previousQuery.current = query;
    const timer = typing ? window.setTimeout(load, 250) : undefined;
    if (!typing) load();
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
      setItems((current) =>
        mergePatientParametersPage(current, page.items.map(protectSavedSummary), true),
      );
      setNextCursor(page.nextCursor);
      failedMore.current = false;
    } catch {
      if (!controller.signal.aborted && version === generation.current) {
        failedMore.current = true;
        setError('Impossibile caricare altri pazienti. Riprova.');
      }
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
      const known = savedSummaries.current.get(patientId);
      if (!known || known.date !== summary.date || known.count <= summary.count)
        savedSummaries.current.set(patientId, summary);
      setItems((current) =>
        current.map((item) =>
          item.patient.id !== patientId
            ? item
            : applySavedParameterSummary(item, savedSummaries.current.get(patientId) ?? summary),
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
          {summaryLoading
            ? 'Aggiornamento rilevazioni e note di oggi…'
            : error
              ? 'Riepilogo giornaliero non disponibile'
              : `${recorded}/${items.length} pazienti caricati con rilevazioni oggi`}
        </span>
      </div>
      {loading && <p role="status">Caricamento pazienti…</p>}
      {error && (
        <div className="parameter-history-error" role="alert">
          {error}{' '}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() =>
              failedMore.current ? void loadMore() : setRevision((value) => value + 1)
            }
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
                noteCount={item.cartella.noteCount}
                summaryPending={item.summaryPending && summaryLoading}
                summaryUnavailable={item.summaryPending && !summaryLoading}
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
                disabled={loading || loadingMore || summaryLoading}
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
