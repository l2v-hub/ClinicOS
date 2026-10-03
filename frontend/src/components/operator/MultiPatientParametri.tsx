import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IcoSearch, IcoX } from '../../icons';
import { PageHeader } from '../shared/PageHeader';
import { createParameterDraftStore } from '../../lib/parameterEntryDrafts';
import { isRosterChanged } from '../../lib/rosterOrder';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { useRosterOrderContext } from '../shared/RosterOrderContext';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { readSessionCache, writeSessionCache } from '../../lib/sessionCache';
import { parametersCacheKey } from '../../lib/patientParametersPrefetch';
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
import { ParameterEntryPanel } from './ParameterEntryPanel';
import { ParameterPatientPick } from './ParameterPatientPick';
import { ParameterEntryClock } from './ParameterEntryClock';
import './PatientParameters.css';
import './ParametriVitali.css';

interface Props {
  operatoreNome: string;
  onSelectPaziente: (patientId: string) => void;
}
export function MultiPatientParametri({ operatoreNome, onSelectPaziente }: Props) {
  const {
    options: rosterOptions,
    requestKey: rosterKey,
    accept: acceptRoster,
    recover: recoverRoster,
  } = useRosterOrderContext();
  const [draftStore] = useState(createParameterDraftStore);
  useEffect(() => () => draftStore.clear(), [draftStore]);
  const [day, setDay] = useState(() => facilityLocalMinute().slice(0, 10));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PatientParametersPageItem | null>(null);
  const [showOrder, setShowOrder] = useState(false);
  // Ultimo elenco gia' mostrato in sessione per giorno/ordine: la pagina compare subito con
  // quello e lo rivalida in background invece di ripartire da "Caricamento pazienti…".
  const initialItems = readSessionCache<PatientParametersPageItem[]>(
    parametersCacheKey('', rosterKey, day),
  );
  const [items, setItems] = useState<PatientParametersPageItem[]>(() => initialItems ?? []);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [loading, setLoading] = useState(!initialItems);
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
  useEffect(() => {
    currentDay.current = day;
  }, [day]);
  const filters = useMemo(
    () => ({
      q: query.trim() || undefined,
      limit: 25,
      date: day,
      month: Number(day.slice(5, 7)),
      year: Number(day.slice(0, 4)),
      view: 'entry' as const,
      ...rosterOptions,
    }),
    [query, day, rosterOptions],
  );

  const protectSavedSummary = useCallback(
    (item: PatientParametersPageItem): PatientParametersPageItem => {
      item = { ...item, summaryDate: day };
      const saved = savedSummaries.current.get(item.patient.id);
      return saved?.date === day ? applySavedParameterSummary(item, saved) : item;
    },
    [day],
  );

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    moreController.current?.abort();
    let detailedReady = false;
    const hadRows = itemsRef.current.length > 0;
    const load = () => {
      if (controller.signal.aborted) return;
      // Righe gia' a schermo: la rivalidazione non le nasconde dietro il placeholder.
      setLoading(itemsRef.current.length === 0);
      setLoadingMore(false);
      setSummaryLoading(true);
      setNextCursor(null);
      setError('');
      failedMore.current = false;
      if (loadedDay.current !== day) {
        loadedDay.current = day;
        setItems((current) => current.map((item) => resetParameterDay(item, day)));
      }
      // Identities and daily metadata are independent. The detailed page remains
      // authoritative for membership/cursor, including room searches.
      if (!filters.q) {
        void fetchPatientPage(
          API_URL,
          { limit: 25, ...rosterOptions, asOf: day },
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
        const filterKey = JSON.stringify([filters.q ?? '', rosterKey]);
        const sameFilter = loadedQuery.current === filterKey;
        const targetCount = sameFilter ? Math.max(25, itemsRef.current.length) : 25;
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
          acceptRoster(page.roster);
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
        loadedQuery.current = filterKey;
        writeSessionCache(parametersCacheKey(filters.q ?? '', rosterKey, day), refreshed);
      })()
        .catch(async (cause) => {
          if (!controller.signal.aborted && version === generation.current) {
            if (isRosterChanged(cause) && (await recoverRoster())) return;
            setError(cause.message);
          }
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
    const timer = window.setTimeout(load, typing ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      moreController.current?.abort();
      generation.current = version + 1;
    };
  }, [
    filters,
    revision,
    rosterKey,
    day,
    query,
    protectSavedSummary,
    rosterOptions,
    acceptRoster,
    recoverRoster,
  ]);

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
      acceptRoster(page.roster);
      setItems((current) =>
        mergePatientParametersPage(current, page.items.map(protectSavedSummary), true),
      );
      setNextCursor(page.nextCursor);
      failedMore.current = false;
    } catch (cause) {
      if (!controller.signal.aborted && version === generation.current) {
        if (isRosterChanged(cause) && (await recoverRoster())) return;
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
  const recorded = items.filter((item) => (item.cartella.readingCount ?? 0) > 0).length;
  // Il paziente scelto resta nel modulo anche se una ricerca lo toglie dall'elenco: il modulo non
  // cambia paziente da solo. Senza scelta, il primo dell'elenco.
  // La scelta automatica del primo paziente diventa esplicita appena arriva l'elenco: una ricerca
  // successiva non deve cambiare (o far sparire) il paziente su cui si sta scrivendo.
  if (!selected && items.length > 0) setSelected(items[0]);
  const listed = selected
    ? items.find((item) => item.patient.id === selected.patient.id)
    : undefined;
  const selectedItem = listed ?? selected ?? items[0];
  const selectedOutside = Boolean(selected && !listed);
  return (
    <div className="ds-page par-view">
      <PageHeader title="Parametri vitali" subtitle="Rilevazione rapida con NEWS2" />
      <ParameterEntryClock onDayChange={setDay} hidden />
      <div className="par-grid">
        <section className="par-patients" aria-label="Pazienti">
          <span className="par-eyebrow">Paziente</span>
          <div className="par-search">
            <span className="par-search__ico" aria-hidden="true">
              <IcoSearch />
            </span>
            <input
              type="search"
              className="par-search__input"
              placeholder="Cerca paziente"
              aria-label="Cerca paziente per nome o camera"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="par-search__clear"
                onClick={() => setQuery('')}
                aria-label="Cancella ricerca"
              >
                <IcoX />
              </button>
            )}
          </div>
          <div className="par-patients__tools">
            <span className="par-cap" role="status">
              {summaryLoading
                ? 'Aggiornamento rilevazioni di oggi…'
                : error
                  ? 'Riepilogo giornaliero non disponibile'
                  : `${recorded}/${items.length} con rilevazioni oggi`}
            </span>
            <button
              type="button"
              className="ds-link"
              aria-expanded={showOrder}
              aria-controls="par-order"
              onClick={() => setShowOrder((value) => !value)}
            >
              Ordine del giro
            </button>
          </div>
          {showOrder && (
            <div id="par-order">
              <RosterOrderControl />
            </div>
          )}
          {loading && <p role="status">Caricamento pazienti…</p>}
          {error && (
            <div className="parameter-history-error" role="alert">
              {error}{' '}
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
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
          <ul className="par-plist" aria-busy={loading}>
            {items.map((item) => (
              <ParameterPatientPick
                key={item.patient.id}
                item={item}
                draftStore={draftStore}
                selected={item.patient.id === selectedItem?.patient.id}
                summaryPending={Boolean(item.summaryPending && summaryLoading)}
                onSelect={() => setSelected(item)}
              />
            ))}
          </ul>
          {nextCursor && (
            <button
              type="button"
              className="ds-btn ds-btn--secondary par-more"
              disabled={loading || loadingMore || summaryLoading}
              onClick={() => void loadMore()}
            >
              {loadingMore ? 'Caricamento…' : 'Carica altri 25 pazienti'}
            </button>
          )}
        </section>
        {selectedItem && (
          <ParameterEntryPanel
            key={selectedItem.patient.id}
            patient={selectedItem.patient}
            draftStore={draftStore}
            noteCount={selectedItem.cartella.noteCount}
            summaryPending={Boolean(selectedItem.summaryPending && summaryLoading)}
            outsideResults={selectedOutside}
            onOpenHistory={() => onSelectPaziente(selectedItem.patient.id)}
            onSave={(request) => save(selectedItem.patient.id, request)}
          />
        )}
      </div>
      <p className="parameter-entry-help">
        Operatore: {operatoreNome}. Data e ora vengono registrate quando premi Salva.
      </p>
    </div>
  );
}
