import { useEffect, useMemo, useState } from 'react';
import type {
  TherapyActionInfo,
  TherapySlot,
  TherapySlotPageInfo,
  MotivoNonErogazione,
} from '../../types';
import { PageHeader } from '../shared/PageHeader';
import { RosterOrderControl } from '../shared/RosterOrderControl';
import { TherapyGiroRows, type FiltroStato } from './TherapyGiroRows';
import { TherapyWeekCalendar } from './TherapyWeekCalendar';
import { localIsoDate } from '../../lib/appointmentRange';
import { isCalendarDate, shiftCalendarDate } from '../../lib/patientTherapyCalendar';
import { giroTimeDone, giroTimes, initialGiroTime } from '../../lib/therapyGiro';
import { weekDays } from '../../lib/therapyWeek';
import { DateNav } from '../shared/DateNav';
import { IcoCalendar } from '../../icons';
import { useCapabilityDecided, useRequiresConfirmation } from '../../lib/capabilities';
import { useCanAdministerTherapy } from '../../lib/therapyPermissions';
import {
  recordAdministration,
  type AdministrationOutcome,
} from '../../lib/therapyAdministrationWrite';
import { lateMinutes } from '../../lib/therapyDoseStatus';
import './TherapyRoundsPage.css';
import {
  rememberTherapyCalendarState,
  type TherapyCalendarState,
} from '../../lib/therapyCalendarState';

/**
 * Accesso diretto al giro (KPI «Terapie in ritardo», «Altre N in coda → Terapia»…): giorno, ora,
 * filtro e paziente su cui atterrare. Un nuovo `requestId` riapplica lo stesso bersaglio.
 */
export interface TherapyRoundsEntry {
  requestId: number;
  /** Giorno YYYY-MM-DD (default: quello caricato). */
  date?: string;
  /** Ora reale "HH:MM" oppure fascia del server ("mattina", "pranzo", …). */
  time?: string;
  /** Senza `time`: apre la prima ora con dosi in ritardo (oggi). */
  late?: boolean;
  /** Filtro di stato iniziale (es. 'pending' per vedere solo le dosi da somministrare). */
  filter?: FiltroStato;
  /** Paziente da mettere a fuoco ed evidenziare nell'ora scelta. */
  patientId?: string;
}

interface Props {
  slots: TherapySlot[];
  loading: boolean;
  error: string | null;
  pageInfo: TherapySlotPageInfo;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoad: (date: string) => void;
  onLoadMore: () => void;
  readOnly?: boolean;
  /** Giorno del giro caricato da App: la pagina rimontata mostra la stessa data dei dati. */
  date?: string;
  onConfirm: (info: TherapyActionInfo) => void;
  onNotAdministered: (info: TherapyActionInfo, reason: MotivoNonErogazione, note: string) => void;
  /** Accesso diretto: ora / filtro / paziente iniziali (vedi TherapyRoundsEntry). */
  entry?: TherapyRoundsEntry;
  calendarState?: TherapyCalendarState;
  onOpenPatient?: (patientId: string, date: string, time: string) => void;
}

export function TherapyRoundsPage({
  date: loadedDate,
  slots,
  loading,
  error,
  pageInfo,
  loadingMore,
  loadMoreError,
  onLoad,
  onLoadMore,
  readOnly: readOnlyProp = false,
  onConfirm,
  onNotAdministered,
  entry,
  calendarState,
  onOpenPatient,
}: Props) {
  const [date, setDate] = useState(
    () => calendarState?.date ?? entry?.date ?? loadedDate ?? localIsoDate(),
  );
  // Ruolo «con conferma» (supervisore): dopo il dialogo di conferma la registrazione parte da qui
  // con `confirmed: true` (il server la rifiuta senza); poi il giro si ricarica dal server.
  const confirmAdminister = useRequiresConfirmation('administration.confirm');
  // Con la policy attiva decide la mappa delle capability: il supervisore (shell gestionale)
  // somministra «con conferma», l'amministratore tecnico resta in sola lettura (capability negata).
  const capabilityDecided = useCapabilityDecided('administration.confirm');
  const canAdministerByPolicy = useCanAdministerTherapy();
  const readOnly = capabilityDecided ? !canAdministerByPolicy : readOnlyProp;
  const confirmNotGiven = useRequiresConfirmation('administration.record_not_administered');
  const [confirmedFeedback, setConfirmedFeedback] = useState<{
    tone: 'ok' | 'error';
    text: string;
  } | null>(null);
  async function recordConfirmed(info: TherapyActionInfo, outcome: AdministrationOutcome) {
    setConfirmedFeedback(null);
    const result = await recordAdministration(info, outcome, { confirmed: true });
    setConfirmedFeedback(
      result.ok
        ? {
            tone: 'ok',
            text:
              outcome.kind === 'administered'
                ? `Somministrazione di ${info.drugName} registrata.`
                : `Mancata somministrazione di ${info.drugName} registrata.`,
          }
        : { tone: 'error', text: result.message },
    );
    onLoad(info.date);
  }
  const [selected, setSelected] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroStato>('tutte');
  const [showOrder, setShowOrder] = useState(false);
  const [mode, setMode] = useState<'giro' | 'calendario'>(
    calendarState?.mode ?? (entry ? 'giro' : 'calendario'),
  );
  // Settimana del calendario: separata dalla data del giro, che resta quella caricata.
  const [weekOf, setWeekOf] = useState(calendarState?.weekOf ?? date);
  const [calendarOpen, setCalendarOpen] = useState(calendarState?.open ?? null);
  const [calendarScroll, setCalendarScroll] = useState(calendarState?.scrollTop ?? 0);
  useEffect(() => {
    rememberTherapyCalendarState({
      mode,
      date,
      weekOf,
      open: calendarOpen,
      scrollTop: calendarScroll,
    });
  }, [mode, date, weekOf, calendarOpen, calendarScroll]);
  function changeDate(value: string) {
    if (!isCalendarDate(value)) return;
    setSelected(null);
    setDate(value);
    onLoad(value);
  }
  const ready = !loading && !error;
  // ── Accesso diretto: applicato una volta per requestId, sui dati del giorno richiesto ──
  const [appliedEntry, setAppliedEntry] = useState<number | null>(
    calendarState ? (entry?.requestId ?? null) : null,
  );
  const [focusPatientId, setFocusPatientId] = useState<string | null>(null);
  const entryPending = entry !== undefined && appliedEntry !== entry.requestId;
  // Gli accessi a una dose precisa mostrano anche caricamento/errori del giro richiesto.
  if (entryPending && mode !== 'giro') setMode('giro');
  // prima il giorno richiesto: la selezione dell'ora aspetta i dati di quel giorno
  const [entryDateApplied, setEntryDateApplied] = useState<number | null>(
    calendarState ? (entry?.requestId ?? null) : null,
  );
  if (entry?.date && entryDateApplied !== entry.requestId && isCalendarDate(entry.date)) {
    setEntryDateApplied(entry.requestId);
    if (entry.date !== date) {
      setDate(entry.date);
      setSelected(null);
    }
  }
  const entryRequestId = entry?.requestId;
  const entryDate = entry?.date;
  useEffect(() => {
    if (entryRequestId === undefined || !entryDate || !isCalendarDate(entryDate)) return;
    if (entryDate !== loadedDate) onLoad(entryDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una volta per richiesta
  }, [entryRequestId]);
  // Fasce del giro = ore reali delle prescrizioni (07:00, 08:00, 12:00, …), non le fasce del server.
  // stessa identità finché le fasce non cambiano: la protezione dal doppio invio la usa
  const times = useMemo(() => giroTimes(slots), [slots]);
  // L'ora si fissa una volta per data, appena arrivano i dati: ricalcolarla a ogni render la farebbe
  // saltare all'ora successiva quando l'ultimo farmaco da fare diventa erogato, e un secondo clic
  // finirebbe su un'altra ora. Si ricalcola solo se l'ora scelta sparisce.
  if (
    entryPending &&
    ready &&
    (loadedDate ?? date) === date &&
    (!entry.date || entry.date === date)
  ) {
    setAppliedEntry(entry.requestId);
    setMode('giro');
    setFiltro(entry.filter ?? 'tutte');
    setFocusPatientId(entry.patientId ?? null);
    const byTime = entry.time ? times.find((t) => t.ora === entry.time) : undefined;
    const byBand = entry.time
      ? times.find((t) => t.patients.some((g) => g.items.some((i) => i.fascia === entry.time)))
      : undefined;
    const byLate = entry.late
      ? times.find((t) => t.pending > 0 && lateMinutes(date, t.ora) !== null)
      : undefined;
    const byPatient = entry.patientId
      ? times.find((t) => t.patients.some((g) => g.patient.patientId === entry.patientId))
      : undefined;
    const target = byTime ?? byBand ?? byLate ?? byPatient;
    if (target) setSelected(target.ora);
  }
  if (!entryPending && ready && times.length > 0 && !times.some((t) => t.ora === selected))
    setSelected(initialGiroTime(times));
  const active = times.find((t) => t.ora === selected);
  const done = active ? giroTimeDone(active) : 0;
  const total = active?.total ?? 0;
  const s = active;
  const FILTRI: { key: FiltroStato; label: string; count: number }[] = [
    { key: 'tutte', label: 'Tutte', count: 0 },
    { key: 'pending', label: 'Da erogare', count: s?.pending ?? 0 },
    { key: 'administered', label: 'Erogate', count: s?.administered ?? 0 },
    { key: 'not_administered', label: 'Non erogate', count: s?.notAdministered ?? 0 },
  ];
  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const giro = mode === 'giro';
  function weekLabel(day: string) {
    const days = weekDays(day);
    const f = (d: string, opts: Intl.DateTimeFormatOptions) =>
      new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', opts);
    return `${f(days[0], { day: 'numeric', month: 'short' })} – ${f(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return (
    <div className="giro-view">
      <PageHeader
        title={giro ? 'Giro terapia' : 'Calendario terapie'}
        subtitle={
          giro
            ? `Somministrazioni per ora e per paziente · ${dayLabel}`
            : `Calendario della settimana · ${weekLabel(weekOf)}`
        }
      />
      {giro && ready && active && (
        <div className="giro-bar">
          <div className="giro-slots" role="group" aria-label="Ora della terapia">
            {times.map((t) => (
              <button
                type="button"
                key={t.ora}
                className="ds-chip giro-slot"
                aria-pressed={t.ora === active.ora}
                aria-label={`Ore ${t.ora}: ${giroTimeDone(t)} fatte su ${t.total}${t.pending > 0 ? `, ${t.pending} da erogare` : ''}`}
                onClick={() => setSelected(t.ora)}
              >
                {t.ora} · {giroTimeDone(t)}/{t.total}
              </button>
            ))}
          </div>
          <div className="giro-progress">
            <div
              className="giro-progress__track"
              role="progressbar"
              aria-label={`Avanzamento delle ${active.ora}`}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <i style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
            </div>
            <span className="giro-progress__count">
              {done}/{total}
            </span>
          </div>
        </div>
      )}
      <div className="giro-tools">
        <div className="ds-chip-group" role="group" aria-label="Vista della terapia">
          <button
            type="button"
            className="ds-chip"
            aria-pressed={!giro}
            onClick={() => {
              setWeekOf(date);
              setCalendarOpen(null);
              setMode('calendario');
            }}
          >
            <IcoCalendar /> Calendario
          </button>
          <button
            type="button"
            className="ds-chip"
            aria-pressed={giro}
            onClick={() => {
              if (loadedDate !== date) onLoad(date);
              setMode('giro');
            }}
          >
            Giro
          </button>
        </div>
        {giro && ready && active && (
          <div className="giro-filters" role="group" aria-label="Stato della somministrazione">
            {FILTRI.map((f) => (
              <button
                type="button"
                key={f.key}
                className="ds-chip"
                aria-pressed={filtro === f.key}
                onClick={() => setFiltro(f.key)}
              >
                {f.label}
                {f.count > 0 && <span className="ds-chip__count">{f.count}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="giro-tools__right">
          {giro ? (
            <DateNav
              isToday={date === localIsoDate()}
              onPrev={() => changeDate(shiftCalendarDate(date, -1))}
              onToday={() => changeDate(localIsoDate())}
              onNext={() => changeDate(shiftCalendarDate(date, 1))}
              date={date}
              onDateChange={changeDate}
              dateLabel="Data terapia"
              todayLabel="Oggi"
              groupLabel="Data del giro"
            />
          ) : (
            <DateNav
              isToday={weekDays(weekOf).includes(localIsoDate())}
              onPrev={() => (setCalendarOpen(null), setWeekOf(shiftCalendarDate(weekOf, -7)))}
              onToday={() => {
                setCalendarOpen(null);
                setWeekOf(localIsoDate());
              }}
              onNext={() => (setCalendarOpen(null), setWeekOf(shiftCalendarDate(weekOf, 7)))}
              prevLabel="Settimana precedente"
              nextLabel="Settimana successiva"
              todayLabel="Oggi"
              groupLabel="Settimana del calendario"
            />
          )}
          {giro && (
            <button
              type="button"
              className="ds-chip"
              aria-expanded={showOrder}
              aria-controls="giro-order"
              onClick={() => setShowOrder((v) => !v)}
            >
              Ordine del giro
            </button>
          )}
        </div>
      </div>
      {giro && showOrder && (
        <div id="giro-order">
          <RosterOrderControl />
        </div>
      )}
      {!giro && (
        <TherapyWeekCalendar
          date={weekOf}
          open={calendarOpen}
          onOpen={(day, time, patientId) =>
            setCalendarOpen({ date: day, time, ...(patientId ? { patientId } : {}) })
          }
          onClose={() => setCalendarOpen(null)}
          scrollTop={calendarScroll}
          onScroll={setCalendarScroll}
          onOpenPatient={(patientId, day, time) => {
            rememberTherapyCalendarState({
              mode,
              date,
              weekOf,
              open: calendarOpen,
              scrollTop: calendarScroll,
            });
            onOpenPatient?.(patientId, day, time);
          }}
        />
      )}
      {giro && loading && <p role="status">Caricamento terapie…</p>}
      {giro && !loading && error && (
        <div role="alert" className="empty-state-card">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => onLoad(date)}>
            Riprova
          </button>
        </div>
      )}
      {giro && ready && times.length === 0 && (
        <p className="empty-state-card">Nessuna terapia programmata per questa data.</p>
      )}
      {giro && ready && active && pageInfo.hasMore && (
        <div className="giro-note-box" role="status">
          <span>
            <strong>Visualizzazione parziale.</strong> Ore e conteggi riguardano le{' '}
            {pageInfo.loadedTherapies} terapie caricate: carica le altre per il giro completo.
          </span>
          {loadMoreError && <span role="alert">{loadMoreError}</span>}
          <button
            type="button"
            className="btn-secondary"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? 'Caricamento…' : 'Carica altre terapie'}
          </button>
        </div>
      )}
      {confirmedFeedback && (
        <p
          className={`giro-feedback is-${confirmedFeedback.tone}`}
          role={confirmedFeedback.tone === 'error' ? 'alert' : 'status'}
        >
          {confirmedFeedback.text}
        </p>
      )}
      {giro && ready && active && (
        <TherapyGiroRows
          key={`${active.ora}|${filtro}`}
          time={active}
          date={date}
          filtro={filtro}
          readOnly={readOnly}
          detailsPartial={pageInfo.hasMore}
          focusPatientId={focusPatientId ?? undefined}
          requiresConfirmation={confirmAdminister}
          onConfirm={
            readOnly
              ? undefined
              : confirmAdminister
                ? (info) => void recordConfirmed(info, { kind: 'administered' })
                : onConfirm
          }
          onNotAdministered={
            readOnly
              ? undefined
              : confirmNotGiven
                ? (info, motivo, note) =>
                    void recordConfirmed(info, { kind: 'not_administered', motivo, note })
                : onNotAdministered
          }
        />
      )}
    </div>
  );
}
