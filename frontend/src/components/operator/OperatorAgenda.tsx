import { useState, useMemo, Fragment, useEffect } from 'react';
import type { Appuntamento, Operatore, TherapySlot, MotivoNonErogazione } from '../../types';
import { IcoChevronLeft, IcoChevronRight, IcoCalendar, IcoPlus } from '../../icons';
import { AppointmentForm } from '../shared/AppointmentForm';
import { localIsoDate } from '../../lib/appointmentRange';
import { AgendaLegend } from '../shared/AgendaLegend';
import { AppuntamentoActions } from '../shared/AppuntamentoActions';
import { IntakeWorkspace } from '../shared/intake/IntakeWorkspace';
import { TherapySlotCard, TherapySlotDot } from '../shared/TherapySlotOverlay';
import { AgendaStatoFilterRow } from '../shared/AgendaStatoFilter';
import { STATO_LABEL, matchStato, type FiltroStatoAppuntamento } from '../shared/agendaStato';
import { TherapySlotModal } from './TherapySlotModal';

type ViewMode = 'giornaliero' | 'settimanale' | 'mensile';

interface OperatorAgendaProps {
  operatoreId: string;
  nomeOperatore: string;
  operatori: Operatore[];
  appuntamenti: Appuntamento[];
  onAddAppuntamento: (apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onUpdateAppuntamento?: (id: string, apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onDeleteAppuntamento?: (id: string) => void;
  loadingAppuntamenti?: boolean;
  appointmentLoadError?: string | null;
  onRetryAppointments?: () => void;
  onLoadAppointments?: (from: string, to: string, operatorId?: string) => void;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
  therapySlots?: TherapySlot[];
  loadingTherapySlots?: boolean;
  therapyLoadError?: string | null;
  onRetryTherapySlots?: () => void;
  onConfirmTherapy?: (info: {
    patientId: string;
    therapyId: string;
    drugName: string;
    dosage: string;
    route: string;
    fascia: string;
    ora: string;
  }) => void;
  onNotAdministeredTherapy?: (
    info: {
      patientId: string;
      therapyId: string;
      drugName: string;
      dosage: string;
      route: string;
      fascia: string;
      ora: string;
    },
    motivo: MotivoNonErogazione,
    note: string,
  ) => void;
  onLoadTherapySlots?: (date: string) => void;
}

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});
const HOUR_SLOTS = TIME_SLOTS.filter((_, i) => i % 2 === 0);
const TOTAL_AVAIL_MIN = 11 * 60;

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}
function getMondayOf(d: Date): Date {
  const day = d.getDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}
function getWeekDays(ref: Date): Date[] {
  const mon = getMondayOf(ref);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
function getMonthMatrix(ref: Date): Date[] {
  const y = ref.getFullYear(),
    m = ref.getMonth();
  const mon = getMondayOf(new Date(y, m, 1));
  return Array.from({ length: 42 }, (_, i) => addDays(mon, i));
}
function isoDate(d: Date): string {
  return localIsoDate(d);
}
function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

const TIPO_LABEL: Record<string, string> = {
  visita: 'Visita',
  controllo: 'Controllo',
  procedura: 'Procedura',
  urgenza: 'Urgenza',
  consulto: 'Consulto',
  'follow-up': 'Follow-up',
  altro: 'Altro',
};

export function OperatorAgenda({
  operatoreId,
  nomeOperatore,
  operatori,
  appuntamenti,
  onAddAppuntamento,
  onUpdateAppuntamento,
  onDeleteAppuntamento,
  loadingAppuntamenti = false,
  appointmentLoadError = null,
  onRetryAppointments,
  onLoadAppointments,
  onSelectPaziente,
  therapySlots,
  loadingTherapySlots = false,
  therapyLoadError = null,
  onRetryTherapySlots,
  onConfirmTherapy,
  onNotAdministeredTherapy,
  onLoadTherapySlots,
}: OperatorAgendaProps) {
  const [view, setView] = useState<ViewMode>('giornaliero');
  const [refDate, setRefDate] = useState(new Date());
  const [filtroStato, setFiltroStato] = useState<FiltroStatoAppuntamento>('tutti');
  const [aptForm, setAptForm] = useState<{ data: string; ora: string } | null>(null);
  const [showNewPaziente, setShowNewPaziente] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [selectedTherapySlotId, setSelectedTherapySlotId] = useState<string | null>(null);
  const [editingApt, setEditingApt] = useState<Appuntamento | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const days =
      view === 'giornaliero'
        ? [refDate]
        : view === 'settimanale'
          ? getWeekDays(refDate)
          : getMonthMatrix(refDate);
    onLoadAppointments?.(isoDate(days[0]), isoDate(days[days.length - 1]), operatoreId);
  }, [onLoadAppointments, operatoreId, refDate, view]);

  const therapySlotsMap = new Map<string, TherapySlot>();
  if (therapySlots) {
    for (const ts of therapySlots) {
      therapySlotsMap.set(ts.ora, ts);
    }
  }

  const myOp = operatori.find((o) => o.id === operatoreId);
  const opColor = myOp?.colore ?? 'var(--blue)';

  function myApts(data: string): Appuntamento[] {
    return appuntamenti
      .filter((a) => a.data === data && a.operatoreId === operatoreId)
      .sort((a, b) => a.ora.localeCompare(b.ora));
  }

  /** Appuntamenti del giorno effettivamente mostrati, cioe' filtrati per stato. */
  function visibleApts(data: string): Appuntamento[] {
    return myApts(data).filter((a) => matchStato(a, filtroStato));
  }

  function navigate(delta: number) {
    setRefDate((d) => {
      let next: Date;
      if (view === 'giornaliero') next = addDays(d, delta);
      else if (view === 'settimanale') next = addDays(d, delta * 7);
      else {
        next = new Date(d);
        next.setMonth(d.getMonth() + delta);
      }
      onLoadTherapySlots?.(isoDate(next));
      return next;
    });
  }

  function titleLabel(): string {
    if (view === 'giornaliero') return fmtDateLong(refDate);
    if (view === 'settimanale') {
      const days = getWeekDays(refDate);
      return `${days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return fmtMonth(refDate);
  }

  const todayStr = isoDate(refDate);
  const todayApts = useMemo(
    () =>
      appuntamenti
        .filter(
          (appointment) => appointment.data === todayStr && appointment.operatoreId === operatoreId,
        )
        .sort((left, right) => left.ora.localeCompare(right.ora)),
    [appuntamenti, operatoreId, todayStr],
  );

  function aptsInRange(days: Date[]): number {
    const from = isoDate(days[0]);
    const to = isoDate(days[days.length - 1]);
    return appuntamenti.filter(
      (a) =>
        a.operatoreId === operatoreId &&
        a.data >= from &&
        a.data <= to &&
        matchStato(a, filtroStato),
    ).length;
  }

  // Appuntamenti del range visualizzato (giorno/settimana/mese), non filtrati: alimentano
  // i conteggi dei chip di stato, che devono restare stabili al variare del filtro.
  const rangeApts = useMemo(() => {
    const days =
      view === 'giornaliero'
        ? [refDate]
        : view === 'settimanale'
          ? getWeekDays(refDate)
          : getMonthMatrix(refDate);
    const from = isoDate(days[0]);
    const to = isoDate(days[days.length - 1]);
    return appuntamenti.filter(
      (a) => a.operatoreId === operatoreId && a.data >= from && a.data <= to,
    );
  }, [appuntamenti, operatoreId, view, refDate]);
  // Indice per lookup O(1) nella griglia giornaliera: senza, ogni cella orario richiamava
  // myApts() e rifiltrava/riordinava l'intero array `appuntamenti` (TIME_SLOTS.length volte
  // per render, su un array con gli appuntamenti di tutti gli operatori, non solo i propri).
  const todayAptByOra = useMemo(() => {
    const map = new Map<string, Appuntamento>();
    for (const a of todayApts) map.set(a.ora, a);
    return map;
  }, [todayApts]);
  const completati = todayApts.filter((a) => a.stato === 'completato').length;
  const usedMin = todayApts.reduce((s, a) => s + (a.durata ?? 30), 0);
  const pct = Math.min(100, Math.round((usedMin / TOTAL_AVAIL_MIN) * 100));
  const occLabel =
    pct < 30 ? 'Basso' : pct < 60 ? 'Bilanciato' : pct < 85 ? 'Alto' : 'Sovraccarico';
  const occClass =
    pct < 30
      ? 'agt-occ--low'
      : pct < 60
        ? 'agt-occ--balanced'
        : pct < 85
          ? 'agt-occ--high'
          : 'agt-occ--overloaded';

  // Extract activeSlot OUTSIDE JSX — avoids React Compiler IIFE caching bug
  const activeSlot = selectedTherapySlotId
    ? ((therapySlots ?? []).find((s) => s.id === selectedTherapySlotId) ?? null)
    : null;

  return (
    <div className="agt-view">
      {/* ── Header ── */}
      <div className="agt-header">
        <div className="agt-header__left">
          <div className="agt-op-chip">
            <span className="agt-op-dot" style={{ background: opColor }} />
            <span className="agt-op-name">{nomeOperatore}</span>
          </div>
          <span className="agt-header__date">{titleLabel()}</span>
        </div>
        <div className="agt-header__right">
          <div className="agt-view-switcher">
            {(['giornaliero', 'settimanale', 'mensile'] as ViewMode[]).map((v) => (
              <button
                key={v}
                className={`agt-view-btn${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}
              >
                {v === 'giornaliero' ? 'Giorno' : v === 'settimanale' ? 'Settimana' : 'Mese'}
              </button>
            ))}
          </div>
          <div className="agt-nav">
            <button className="agt-nav-btn" onClick={() => navigate(-1)}>
              <IcoChevronLeft />
            </button>
            <button className="agt-today-btn" onClick={() => setRefDate(new Date())}>
              <IcoCalendar /> Oggi
            </button>
            <button className="agt-nav-btn" onClick={() => navigate(1)}>
              <IcoChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ── Appointment status filter chips ── */}
      <AgendaStatoFilterRow
        filtro={filtroStato}
        onChange={setFiltroStato}
        appuntamenti={rangeApts}
      />

      <AgendaLegend />

      {loadingAppuntamenti && <div className="empty-state-card">Caricamento agenda…</div>}
      {!loadingAppuntamenti && appointmentLoadError && (
        <div className="empty-state-card" role="alert">
          <strong>{appointmentLoadError}</strong>
          <button type="button" className="btn-secondary" onClick={onRetryAppointments}>
            Riprova
          </button>
        </div>
      )}
      {loadingTherapySlots && <div className="empty-state-card">Caricamento terapie…</div>}
      {!loadingTherapySlots && therapyLoadError && (
        <div className="empty-state-card" role="alert">
          <strong>{therapyLoadError}</strong>
          <button type="button" className="btn-secondary" onClick={onRetryTherapySlots}>
            Riprova terapie
          </button>
        </div>
      )}

      {/* ── Occupancy strip (daily) ── */}
      {!loadingAppuntamenti && !appointmentLoadError && view === 'giornaliero' && (
        <div className="agt-occ-strip">
          <div className="agt-occ-row">
            <span className="agt-occ-stats">
              {completati}/{todayApts.length} completati · {usedMin} min su {TOTAL_AVAIL_MIN} min
              disponibili
            </span>
            <span className={`agt-occ-label ${occClass}`}>{occLabel}</span>
            <span className="agt-occ-pct">{pct}%</span>
          </div>
          <div className="agt-occ-track">
            <div className="agt-occ-fill" style={{ width: `${pct}%`, background: opColor }} />
          </div>
        </div>
      )}

      {/* ── DAILY VIEW ── */}
      {!loadingAppuntamenti && !appointmentLoadError && view === 'giornaliero' && (
        <div className="agt-day-wrap">
          {TIME_SLOTS.map((ora) => {
            const tSlot = therapySlotsMap.get(ora);
            // La fascia resta "occupata" anche se il filtro nasconde l'appuntamento: solo
            // uno slot davvero libero puo' aprire il form di creazione.
            const slotApt = todayAptByOra.get(ora);
            const apt = slotApt && matchStato(slotApt, filtroStato) ? slotApt : undefined;
            const isHour = ora.endsWith(':00');
            const isSelected = apt?.id === selectedAptId;

            return (
              <div key={ora}>
                {/* Therapy slot card */}
                {tSlot && (
                  <TherapySlotCard
                    slot={tSlot}
                    onClick={() => setSelectedTherapySlotId(tSlot.id)}
                  />
                )}

                {/* Regular time slot */}
                <div
                  className={`agt-slot${isHour ? ' agt-slot--hour' : ' agt-slot--half'}${slotApt ? ' agt-slot--occ' : ' agt-slot--free'}`}
                  onClick={() => {
                    if (apt) setSelectedAptId(isSelected ? null : apt.id);
                    else if (!slotApt) setAptForm({ data: todayStr, ora });
                  }}
                >
                  <span className="agt-slot__time">{isHour ? ora : ''}</span>
                  {apt ? (
                    <div
                      className={`agt-apt-card agt-apt-card--${apt.stato}${isSelected ? ' selected' : ''}`}
                    >
                      <div className="agt-apt-card__row">
                        {onSelectPaziente && apt.pazienteNome ? (
                          <button
                            className="link-btn agt-apt-card__patient"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPaziente(apt.pazienteNome!, apt.pazienteId ?? undefined);
                            }}
                          >
                            {apt.pazienteNome}
                          </button>
                        ) : (
                          <span className="agt-apt-card__patient">{apt.pazienteNome ?? '—'}</span>
                        )}
                        <div className="agt-apt-card__badges">
                          {apt.priorita === 'urgente' && (
                            <span className="agt-badge agt-badge--urgent">Urgente</span>
                          )}
                          <span className={`agt-badge agt-badge--${apt.stato}`}>
                            {STATO_LABEL[apt.stato]}
                          </span>
                        </div>
                      </div>
                      <div className="agt-apt-card__meta">
                        <span>{TIPO_LABEL[apt.tipoIntervento]}</span>
                        <span className="agt-meta-sep">·</span>
                        <span>{apt.durata ?? 30} min</span>
                      </div>
                      {apt.note && isSelected && <p className="agt-apt-card__note">{apt.note}</p>}
                      {isSelected && (
                        <AppuntamentoActions
                          apt={apt}
                          confirmDeleteId={confirmDeleteId}
                          onEdit={setEditingApt}
                          onAskDelete={setConfirmDeleteId}
                          onDelete={onDeleteAppuntamento}
                        />
                      )}
                    </div>
                  ) : slotApt ? null : (
                    <div className="agt-free-slot">
                      <span className="agt-free-slot__plus">
                        <IcoPlus />
                      </span>
                      <span className="agt-free-slot__label">Disponibile</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Therapy slots outside regular time range (sera 20:00, notte 22:00) */}
          {therapySlots
            ?.filter((ts) => !TIME_SLOTS.includes(ts.ora))
            .map((ts) => (
              <div key={ts.id} style={{ padding: '0 0 0 52px' }}>
                <TherapySlotCard slot={ts} onClick={() => setSelectedTherapySlotId(ts.id)} />
              </div>
            ))}
        </div>
      )}

      {/* ── WEEKLY VIEW ── */}
      {!loadingAppuntamenti && !appointmentLoadError && view === 'settimanale' && (
        <div className="agt-week-wrap">
          <div className="agt-week-grid" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
            <div className="agt-week-corner" />
            {getWeekDays(refDate).map((d) => {
              const isToday = isoDate(d) === isoDate(new Date());
              const dayApts = visibleApts(isoDate(d));
              return (
                <div key={isoDate(d)} className={`agt-week-hdr${isToday ? ' today' : ''}`}>
                  <span className="agt-week-hdr__name">
                    {d.toLocaleDateString('it-IT', { weekday: 'short' })}
                  </span>
                  <span className={`agt-week-hdr__num${isToday ? ' today' : ''}`}>
                    {d.getDate()}
                  </span>
                  {dayApts.length > 0 && (
                    <span className="agt-week-hdr__count">{dayApts.length}</span>
                  )}
                </div>
              );
            })}
            {HOUR_SLOTS.map((ora) => (
              <Fragment key={`hr-${ora}`}>
                <div className="agt-week-time">{ora}</div>
                {getWeekDays(refDate).map((d) => {
                  const dStr = isoDate(d);
                  const cellApts = myApts(dStr).filter(
                    (a) => a.ora === ora || a.ora === ora.replace(':00', ':30'),
                  );
                  const apts = cellApts.filter((a) => matchStato(a, filtroStato));
                  return (
                    <div
                      key={`${dStr}-${ora}`}
                      className={`agt-week-cell${cellApts.length === 0 && !therapySlotsMap.has(ora) ? ' free' : ''}`}
                      onClick={() => cellApts.length === 0 && setAptForm({ data: dStr, ora })}
                    >
                      {therapySlotsMap.has(ora) && (
                        <TherapySlotDot
                          slot={therapySlotsMap.get(ora)!}
                          onClick={() => setSelectedTherapySlotId(therapySlotsMap.get(ora)!.id)}
                        />
                      )}
                      {apts.map((a) => (
                        <div
                          key={a.id}
                          className={`agt-week-apt agt-apt-card--${a.stato}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingApt(a);
                          }}
                        >
                          <span className="agt-week-apt__time">{a.ora}</span>
                          {onSelectPaziente && a.pazienteNome ? (
                            <button
                              className="link-btn agt-week-apt__name"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPaziente(a.pazienteNome!, a.pazienteId ?? undefined);
                              }}
                            >
                              {a.pazienteNome.split(',')[0]}
                            </button>
                          ) : (
                            <span className="agt-week-apt__name">
                              {a.pazienteNome?.split(',')[0] ?? '—'}
                            </span>
                          )}
                          <span className={`agt-status-dot agt-status-dot--${a.stato}`} />
                        </div>
                      ))}
                      {cellApts.length === 0 && !therapySlotsMap.has(ora) && (
                        <span className="agt-week-add">
                          <IcoPlus />
                        </span>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
            {/* Extra therapy slots outside HOUR_SLOTS range (sera/notte) */}
            {therapySlots
              ?.filter((ts) => !HOUR_SLOTS.includes(ts.ora))
              .map((ts) => (
                <Fragment key={`extra-${ts.fascia}`}>
                  <div className="agt-week-time">{ts.ora}</div>
                  {getWeekDays(refDate).map((d) => {
                    const dStr = isoDate(d);
                    const isToday = dStr === isoDate(new Date());
                    return (
                      <div key={`${dStr}-${ts.fascia}`} className="agt-week-cell">
                        {isToday && ts.summary.total > 0 && (
                          <TherapySlotDot
                            slot={ts}
                            onClick={() => setSelectedTherapySlotId(ts.id)}
                          />
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
          </div>
          {aptsInRange(getWeekDays(refDate)) === 0 && (
            <p className="agt-empty-note">Nessun appuntamento in questa settimana.</p>
          )}
        </div>
      )}

      {/* ── MONTHLY VIEW ── */}
      {!loadingAppuntamenti && !appointmentLoadError && view === 'mensile' && (
        <div className="agt-month-wrap">
          <div className="agt-month-grid">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => (
              <div key={d} className="agt-month-wday">
                {d}
              </div>
            ))}
            {getMonthMatrix(refDate).map((d, i) => {
              const inMonth = d.getMonth() === refDate.getMonth();
              const isToday = isoDate(d) === isoDate(new Date());
              const apts = visibleApts(isoDate(d));
              return (
                <div
                  key={i}
                  className={`agt-month-day${!inMonth ? ' other' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => {
                    setRefDate(d);
                    setView('giornaliero');
                  }}
                >
                  <span className="agt-month-day__num">{d.getDate()}</span>
                  <div className="agt-month-day__apts">
                    {apts.slice(0, 2).map((a) => (
                      <div key={a.id} className={`agt-month-apt agt-apt-card--${a.stato}`}>
                        <span className="agt-month-apt__time">{a.ora}</span>
                        {onSelectPaziente && a.pazienteNome ? (
                          <button
                            className="link-btn agt-month-apt__name"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPaziente(a.pazienteNome!, a.pazienteId ?? undefined);
                            }}
                          >
                            {a.pazienteNome.split(',')[0]}
                          </button>
                        ) : (
                          <span className="agt-month-apt__name">
                            {a.pazienteNome?.split(',')[0] ?? '—'}
                          </span>
                        )}
                      </div>
                    ))}
                    {apts.length > 2 && <span className="agt-month-more">+{apts.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {aptsInRange(getMonthMatrix(refDate)) === 0 && (
            <p className="agt-empty-note">Nessun appuntamento in questo mese.</p>
          )}
        </div>
      )}

      {aptForm && (
        <AppointmentForm
          data={aptForm.data}
          ora={aptForm.ora}
          operatoreId={operatoreId}
          operatori={operatori}
          onSave={async (apt) => {
            const err = await onAddAppuntamento(apt);
            if (!err) setAptForm(null);
            return err;
          }}
          onCancel={() => setAptForm(null)}
          onNewPatient={() => setShowNewPaziente(true)}
        />
      )}
      {editingApt && (
        <AppointmentForm
          data={editingApt.data}
          ora={editingApt.ora}
          operatoreId={editingApt.operatoreId}
          operatori={operatori}
          appuntamento={editingApt}
          onSave={async (apt) => {
            const err = (await onUpdateAppuntamento?.(editingApt.id, apt)) ?? null;
            if (!err) setEditingApt(null);
            return err;
          }}
          onCancel={() => setEditingApt(null)}
          onNewPatient={() => setShowNewPaziente(true)}
        />
      )}
      {/* operatorRole not available in OperatorAgenda props — not passed */}
      <IntakeWorkspace
        open={showNewPaziente}
        onClose={() => setShowNewPaziente(false)}
        onCreated={() => setShowNewPaziente(false)}
        operatoreNome={nomeOperatore}
        operatorId={operatoreId}
      />
      {activeSlot && onConfirmTherapy && onNotAdministeredTherapy && (
        <TherapySlotModal
          slot={activeSlot}
          onClose={() => setSelectedTherapySlotId(null)}
          onConfirm={onConfirmTherapy}
          onNotAdministered={onNotAdministeredTherapy}
        />
      )}
    </div>
  );
}
