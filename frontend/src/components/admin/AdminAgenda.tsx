import { Fragment, useMemo, useState } from 'react';
import type { Appuntamento, Operatore, TherapySlot } from '../../types';
import { IcoChevronLeft, IcoChevronRight, IcoCalendar, IcoPlus } from '../../icons';
import { AppointmentForm } from '../shared/AppointmentForm';
import { AgendaLegend } from '../shared/AgendaLegend';
import { AppuntamentoActions } from '../shared/AppuntamentoActions';
import { IntakeWorkspace } from '../shared/intake/IntakeWorkspace';
import { TherapySlotCard, TherapySlotDot } from '../shared/TherapySlotOverlay';
import { AgendaStatoFilterRow } from '../shared/AgendaStatoFilter';
import { STATO_LABEL, matchStato, type FiltroStatoAppuntamento } from '../shared/agendaStato';
import { TherapySlotModal } from '../operator/TherapySlotModal';

type ViewMode = 'giornaliero' | 'settimanale' | 'mensile';

interface AdminAgendaProps {
  operatori: Operatore[];
  appuntamenti: Appuntamento[];
  onAddAppuntamento: (apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onUpdateAppuntamento?: (id: string, apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onDeleteAppuntamento?: (id: string) => void;
  loadingAppuntamenti?: boolean;
  onAddPaziente: (nome: string) => void;
  onSelectPaziente?: (nome: string, patientId?: string) => void;
  /** Fasce terapia di reparto (GET /therapy-slots). In agenda admin sono di sola lettura:
   *  la firma di somministrazione resta un atto clinico dell'operatore erogante. */
  therapySlots?: TherapySlot[];
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
  return d.toISOString().slice(0, 10);
}
function fmtDate(d: Date): string {
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

function occInfo(pct: number): { label: string; cls: string } {
  if (pct < 30) return { label: 'Basso', cls: 'agt-occ--low' };
  if (pct < 60) return { label: 'Bilanciato', cls: 'agt-occ--balanced' };
  if (pct < 85) return { label: 'Alto', cls: 'agt-occ--high' };
  return { label: 'Sovraccarico', cls: 'agt-occ--overloaded' };
}

export function AdminAgenda({
  operatori,
  appuntamenti,
  onAddAppuntamento,
  onUpdateAppuntamento,
  onDeleteAppuntamento,
  loadingAppuntamenti = false,
  onAddPaziente,
  onSelectPaziente,
  therapySlots,
  onLoadTherapySlots,
}: AdminAgendaProps) {
  const [view, setView] = useState<ViewMode>('giornaliero');
  const [refDate, setRefDate] = useState(new Date());
  const [filtroOpId, setFiltroOpId] = useState('tutti');
  const [filtroStato, setFiltroStato] = useState<FiltroStatoAppuntamento>('tutti');
  const [aptForm, setAptForm] = useState<{ data: string; ora: string; operatoreId: string } | null>(
    null,
  );
  const [showNewPaziente, setShowNewPaziente] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [selectedTherapySlotId, setSelectedTherapySlotId] = useState<string | null>(null);
  const [editingApt, setEditingApt] = useState<Appuntamento | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const therapySlotsMap = useMemo(() => {
    const map = new Map<string, TherapySlot>();
    for (const ts of therapySlots ?? []) map.set(ts.ora, ts);
    return map;
  }, [therapySlots]);
  const activeTherapySlot = selectedTherapySlotId
    ? ((therapySlots ?? []).find((s) => s.id === selectedTherapySlotId) ?? null)
    : null;

  const attivi = operatori.filter((o) => o.stato === 'attivo');
  const visibili = filtroOpId === 'tutti' ? attivi : attivi.filter((o) => o.id === filtroOpId);

  function getApts(data: string, opId?: string): Appuntamento[] {
    return appuntamenti
      .filter(
        (a) =>
          a.data === data &&
          (opId ? a.operatoreId === opId : filtroOpId === 'tutti' || a.operatoreId === filtroOpId),
      )
      .sort((a, b) => a.ora.localeCompare(b.ora));
  }

  /** Appuntamenti effettivamente mostrati: filtro operatore + filtro stato. */
  function visibleApts(data: string, opId?: string): Appuntamento[] {
    return getApts(data, opId).filter((a) => matchStato(a, filtroStato));
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

  function goToday() {
    const today = new Date();
    setRefDate(today);
    onLoadTherapySlots?.(isoDate(today));
  }

  function titleLabel(): string {
    if (view === 'giornaliero') return fmtDate(refDate);
    if (view === 'settimanale') {
      const days = getWeekDays(refDate);
      return `${days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return fmtMonth(refDate);
  }

  const todayStr = isoDate(refDate);

  function aptsInRange(days: Date[]): number {
    const from = isoDate(days[0]);
    const to = isoDate(days[days.length - 1]);
    return appuntamenti.filter(
      (a) =>
        a.data >= from &&
        a.data <= to &&
        (filtroOpId === 'tutti' || a.operatoreId === filtroOpId) &&
        matchStato(a, filtroStato),
    ).length;
  }

  // Appuntamenti del range visualizzato (giorno/settimana/mese) col solo filtro operatore
  // applicato: alimentano i conteggi dei chip di stato, che restano stabili al variare
  // del filtro di stato stesso.
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
      (a) =>
        a.data >= from && a.data <= to && (filtroOpId === 'tutti' || a.operatoreId === filtroOpId),
    );
  }, [appuntamenti, view, refDate, filtroOpId]);

  // Indice per lookup O(1) nella griglia giornaliera (operatore x slot orario). Senza,
  // ogni cella richiamava getApts() e rifiltrava/riordinava l'intero array `appuntamenti`
  // (TIME_SLOTS.length * operatori visibili chiamate per render, su un array che include
  // ogni appuntamento mai creato, non solo quelli del giorno mostrato).
  const aptByOpAndOra = useMemo(() => {
    const map = new Map<string, Appuntamento>();
    for (const a of appuntamenti) {
      if (a.data === todayStr) map.set(`${a.operatoreId}::${a.ora}`, a);
    }
    return map;
  }, [appuntamenti, todayStr]);

  return (
    <div className="agt-view">
      {/* ── Header ── */}
      <div className="agt-header">
        <div className="agt-header__left">
          <span className="agt-header__title">Agenda Globale</span>
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
            <button className="agt-today-btn" onClick={goToday}>
              <IcoCalendar /> Oggi
            </button>
            <button className="agt-nav-btn" onClick={() => navigate(1)}>
              <IcoChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ── Operator filter chips ── */}
      <div className="agt-filter-row">
        <button
          className={`agt-filter-chip${filtroOpId === 'tutti' ? ' active' : ''}`}
          onClick={() => setFiltroOpId('tutti')}
        >
          Tutti gli operatori
        </button>
        {attivi.map((op) => (
          <button
            key={op.id}
            className={`agt-filter-chip${filtroOpId === op.id ? ' active' : ''}`}
            style={
              filtroOpId === op.id
                ? { borderColor: op.colore, background: op.colore + '18', color: op.colore }
                : {}
            }
            onClick={() => setFiltroOpId(filtroOpId === op.id ? 'tutti' : op.id)}
          >
            <span className="agt-op-dot" style={{ background: op.colore }} />
            {op.cognome}
          </button>
        ))}
      </div>

      {/* ── Appointment status filter chips ── */}
      <AgendaStatoFilterRow
        filtro={filtroStato}
        onChange={setFiltroStato}
        appuntamenti={rangeApts}
      />

      <AgendaLegend />

      {loadingAppuntamenti && <div className="empty-state-card">Caricamento agenda…</div>}

      {/* ── DAILY VIEW ── */}
      {!loadingAppuntamenti && view === 'giornaliero' && visibili.length === 0 && (
        <>
          <div className="empty-state-card">
            Nessun operatore attivo: attiva un operatore per pianificare gli appuntamenti.
          </div>
          {/* Le terapie sono di reparto: restano visibili anche senza operatori in turno,
              altrimenti sparirebbero proprio quando il reparto e' scoperto. */}
          <div className="agt-admin-therapy-standalone">
            {(therapySlots ?? []).map((ts) => (
              <TherapySlotCard
                key={ts.id}
                slot={ts}
                onClick={() => setSelectedTherapySlotId(ts.id)}
              />
            ))}
          </div>
        </>
      )}
      {!loadingAppuntamenti && view === 'giornaliero' && visibili.length > 0 && (
        <div className="agt-admin-day-wrap">
          <div
            className="agt-admin-grid"
            style={{
              gridTemplateColumns: `52px repeat(${visibili.length}, minmax(160px, 1fr))`,
            }}
          >
            {/* Column headers */}
            <div className="agt-admin-corner" />
            {visibili.map((op) => {
              const opApts = getApts(todayStr, op.id);
              const usedMin = opApts.reduce((s, a) => s + (a.durata ?? 30), 0);
              const pct = Math.min(100, Math.round((usedMin / TOTAL_AVAIL_MIN) * 100));
              const occ = occInfo(pct);
              const completati = opApts.filter((a) => a.stato === 'completato').length;
              return (
                <div key={op.id} className="agt-col-hdr">
                  <div className="agt-col-hdr__top">
                    <span className="agt-op-dot" style={{ background: op.colore }} />
                    <span className="agt-col-hdr__name">
                      {op.cognome} {op.nome}
                    </span>
                  </div>
                  <span className="agt-col-hdr__role">{op.reparto}</span>
                  <div className="agt-col-hdr__occ-row">
                    <span className={`agt-occ-label ${occ.cls}`}>{occ.label}</span>
                    <span className="agt-col-hdr__counts">
                      {completati}/{opApts.length} · {pct}%
                    </span>
                  </div>
                  <div className="agt-occ-track">
                    <div
                      className="agt-occ-fill"
                      style={{ width: `${pct}%`, background: op.colore }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Time rows */}
            {TIME_SLOTS.map((ora) => {
              const isHour = ora.endsWith(':00');
              const tSlot = therapySlotsMap.get(ora);
              return (
                <Fragment key={ora}>
                  {tSlot && (
                    <div className="agt-admin-therapy-row">
                      <TherapySlotCard
                        slot={tSlot}
                        onClick={() => setSelectedTherapySlotId(tSlot.id)}
                      />
                    </div>
                  )}
                  <div className={`agt-admin-time${isHour ? ' hour' : ''}`}>
                    {isHour ? ora : ''}
                  </div>
                  {visibili.map((op) => {
                    // La cella resta "occupata" anche se il filtro nasconde l'appuntamento:
                    // solo una cella davvero libera puo' aprire il form di creazione.
                    const cellApt = aptByOpAndOra.get(`${op.id}::${ora}`);
                    const apt = cellApt && matchStato(cellApt, filtroStato) ? cellApt : undefined;
                    const isSelected = apt?.id === selectedAptId;
                    return (
                      <div
                        key={`${op.id}-${ora}`}
                        className={`agt-admin-cell${cellApt ? ' occ' : ' free'}${isHour ? ' hour' : ''}`}
                        onClick={() => {
                          if (apt) setSelectedAptId(isSelected ? null : apt.id);
                          else if (!cellApt)
                            setAptForm({ data: todayStr, ora, operatoreId: op.id });
                        }}
                      >
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
                                    onSelectPaziente(
                                      apt.pazienteNome!,
                                      apt.pazienteId ?? undefined,
                                    );
                                  }}
                                >
                                  {apt.pazienteNome}
                                </button>
                              ) : (
                                <span className="agt-apt-card__patient">
                                  {apt.pazienteNome ?? '—'}
                                </span>
                              )}
                              <span className={`agt-badge agt-badge--${apt.stato}`}>
                                {STATO_LABEL[apt.stato]}
                              </span>
                            </div>
                            <div className="agt-apt-card__meta">
                              <span>{TIPO_LABEL[apt.tipoIntervento]}</span>
                              <span className="agt-meta-sep">·</span>
                              <span>{apt.durata ?? 30} min</span>
                            </div>
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
                        ) : cellApt ? null : (
                          <div className="agt-admin-empty">
                            <IcoPlus />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}

            {/* Fasce fuori dal range orario della griglia (sera 20:00, notte 22:00) */}
            {(therapySlots ?? [])
              .filter((ts) => !TIME_SLOTS.includes(ts.ora))
              .map((ts) => (
                <div key={ts.id} className="agt-admin-therapy-row">
                  <TherapySlotCard slot={ts} onClick={() => setSelectedTherapySlotId(ts.id)} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── WEEKLY VIEW ── */}
      {!loadingAppuntamenti && view === 'settimanale' && (
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
              <Fragment key={ora}>
                <div className="agt-week-time">{ora}</div>
                {getWeekDays(refDate).map((d) => {
                  const dStr = isoDate(d);
                  const cellApts = getApts(dStr).filter(
                    (a) => a.ora === ora || a.ora === ora.replace(':00', ':30'),
                  );
                  const apts = cellApts.filter((a) => matchStato(a, filtroStato));
                  const defOpId = filtroOpId !== 'tutti' ? filtroOpId : (attivi[0]?.id ?? '');
                  const tSlot = therapySlotsMap.get(ora);
                  return (
                    <div
                      key={`${dStr}-${ora}`}
                      className={`agt-week-cell${cellApts.length === 0 && !tSlot ? ' free' : ''}`}
                      onClick={() =>
                        cellApts.length === 0 &&
                        setAptForm({ data: dStr, ora, operatoreId: defOpId })
                      }
                    >
                      {tSlot && (
                        <TherapySlotDot
                          slot={tSlot}
                          onClick={() => setSelectedTherapySlotId(tSlot.id)}
                        />
                      )}
                      {apts.map((a) => {
                        const op = operatori.find((o) => o.id === a.operatoreId);
                        return (
                          <div
                            key={a.id}
                            className={`agt-week-apt agt-apt-card--${a.stato}`}
                            style={{ borderLeftColor: op?.colore ?? '#888' }}
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
                            {op && (
                              <span
                                className="agt-op-dot agt-op-dot--sm"
                                style={{ background: op.colore }}
                              />
                            )}
                          </div>
                        );
                      })}
                      {cellApts.length === 0 && !tSlot && (
                        <span className="agt-week-add">
                          <IcoPlus />
                        </span>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}

            {/* Fasce fuori dal range orario della griglia (sera 20:00, notte 22:00) */}
            {(therapySlots ?? [])
              .filter((ts) => !HOUR_SLOTS.includes(ts.ora))
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
      {!loadingAppuntamenti && view === 'mensile' && (
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
                    {apts.slice(0, 3).map((a) => {
                      const op = operatori.find((o) => o.id === a.operatoreId);
                      return (
                        <div
                          key={a.id}
                          className={`agt-month-apt agt-apt-card--${a.stato}`}
                          style={{ borderLeftColor: op?.colore ?? '#888' }}
                        >
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
                      );
                    })}
                    {apts.length > 3 && <span className="agt-month-more">+{apts.length - 3}</span>}
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
          operatoreId={aptForm.operatoreId}
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
      {/* operatorId/operatorRole not available in AdminAgenda props — not passed */}
      <IntakeWorkspace
        open={showNewPaziente}
        onClose={() => setShowNewPaziente(false)}
        onCreated={(id) => {
          onAddPaziente(id);
          setShowNewPaziente(false);
        }}
      />
      {activeTherapySlot && (
        <TherapySlotModal
          slot={activeTherapySlot}
          onClose={() => setSelectedTherapySlotId(null)}
          readOnly
        />
      )}
    </div>
  );
}
