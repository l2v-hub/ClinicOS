import { useState } from 'react';
import type { Appuntamento, Operatore, Paziente, TherapySlot, MotivoNonErogazione } from '../../types';
import { IcoChevronLeft, IcoChevronRight, IcoCalendar, IcoPlus, IcoPill } from '../../icons';
import { AppointmentForm } from '../shared/AppointmentForm';
import { NewPatientModal } from '../shared/NewPatientModal';
import { TherapySlotModal } from './TherapySlotModal';

type ViewMode = 'giornaliero' | 'settimanale' | 'mensile';

interface OperatorAgendaProps {
  operatoreId: string;
  nomeOperatore: string;
  operatori: Operatore[];
  appuntamenti: Appuntamento[];
  pazienti: Paziente[];
  onAddAppuntamento: (apt: Omit<Appuntamento, 'id'>) => void;
  onSelectPaziente?: (nome: string) => void;
  therapySlots?: TherapySlot[];
  onConfirmTherapy?: (id: string) => void;
  onNotAdministeredTherapy?: (id: string, motivo: MotivoNonErogazione, note: string) => void;
}

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});
const HOUR_SLOTS = TIME_SLOTS.filter((_, i) => i % 2 === 0);
const TOTAL_AVAIL_MIN = 11 * 60;

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(d.getDate() + n); return r;
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
  const y = ref.getFullYear(), m = ref.getMonth();
  const mon = getMondayOf(new Date(y, m, 1));
  return Array.from({ length: 42 }, (_, i) => addDays(mon, i));
}
function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

const STATO_LABEL: Record<string, string> = {
  programmato: 'Programmato', in_corso: 'In corso', completato: 'Completato', annullato: 'Annullato',
};
const TIPO_LABEL: Record<string, string> = {
  visita: 'Visita', controllo: 'Controllo', procedura: 'Procedura',
  urgenza: 'Urgenza', consulto: 'Consulto', 'follow-up': 'Follow-up', altro: 'Altro',
};

export function OperatorAgenda({
  operatoreId, nomeOperatore, operatori, appuntamenti, pazienti, onAddAppuntamento, onSelectPaziente,
  therapySlots, onConfirmTherapy, onNotAdministeredTherapy,
}: OperatorAgendaProps) {
  const [view, setView] = useState<ViewMode>('giornaliero');
  const [refDate, setRefDate] = useState(new Date());
  const [aptForm, setAptForm] = useState<{ data: string; ora: string } | null>(null);
  const [showNewPaziente, setShowNewPaziente] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [selectedTherapySlotId, setSelectedTherapySlotId] = useState<string | null>(null);

  const therapySlotsMap = new Map<string, TherapySlot>();
  if (therapySlots) {
    for (const ts of therapySlots) {
      therapySlotsMap.set(ts.ora, ts);
    }
  }

  const myOp = operatori.find(o => o.id === operatoreId);
  const opColor = myOp?.colore ?? 'var(--blue)';

  function myApts(data: string): Appuntamento[] {
    return appuntamenti
      .filter(a => a.data === data && a.operatoreId === operatoreId)
      .sort((a, b) => a.ora.localeCompare(b.ora));
  }

  function navigate(delta: number) {
    if (view === 'giornaliero') setRefDate(d => addDays(d, delta));
    else if (view === 'settimanale') setRefDate(d => addDays(d, delta * 7));
    else setRefDate(d => { const r = new Date(d); r.setMonth(d.getMonth() + delta); return r; });
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
  const todayApts = myApts(todayStr);
  const completati = todayApts.filter(a => a.stato === 'completato').length;
  const usedMin = todayApts.reduce((s, a) => s + (a.durata ?? 30), 0);
  const pct = Math.min(100, Math.round((usedMin / TOTAL_AVAIL_MIN) * 100));
  const occLabel = pct < 30 ? 'Basso' : pct < 60 ? 'Bilanciato' : pct < 85 ? 'Alto' : 'Sovraccarico';
  const occClass = pct < 30 ? 'agt-occ--low' : pct < 60 ? 'agt-occ--balanced' : pct < 85 ? 'agt-occ--high' : 'agt-occ--overloaded';

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
            {(['giornaliero', 'settimanale', 'mensile'] as ViewMode[]).map(v => (
              <button key={v} className={`agt-view-btn${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}>
                {v === 'giornaliero' ? 'Giorno' : v === 'settimanale' ? 'Settimana' : 'Mese'}
              </button>
            ))}
          </div>
          <div className="agt-nav">
            <button className="agt-nav-btn" onClick={() => navigate(-1)}><IcoChevronLeft /></button>
            <button className="agt-today-btn" onClick={() => setRefDate(new Date())}>
              <IcoCalendar /> Oggi
            </button>
            <button className="agt-nav-btn" onClick={() => navigate(1)}><IcoChevronRight /></button>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="agt-legend">
        <span className="agt-legend__item"><span className="agt-legend__dot" style={{ background: '#059669' }} />Completato</span>
        <span className="agt-legend__item"><span className="agt-legend__dot" style={{ background: '#1A56DB' }} />In corso</span>
        <span className="agt-legend__item"><span className="agt-legend__dot" style={{ background: '#D97706' }} />Programmato</span>
        <span className="agt-legend__item"><span className="agt-legend__dot" style={{ background: '#E5E7EB', border: '1px dashed #9DB7D5' }} />Disponibile</span>
      </div>

      {/* ── Occupancy strip (daily) ── */}
      {view === 'giornaliero' && (
        <div className="agt-occ-strip">
          <div className="agt-occ-row">
            <span className="agt-occ-stats">
              {completati}/{todayApts.length} completati · {usedMin} min su {TOTAL_AVAIL_MIN} min disponibili
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
      {view === 'giornaliero' && (
        <div className="agt-day-wrap">
          {TIME_SLOTS.map(ora => {
            const tSlot = therapySlotsMap.get(ora);
            const apt = myApts(todayStr).find(a => a.ora === ora);
            const isHour = ora.endsWith(':00');
            const isSelected = apt?.id === selectedAptId;

            return (
              <div key={ora}>
                {/* Therapy slot card */}
                {tSlot && (() => {
                  const tErogate = tSlot.somministrazioni.filter(s => s.stato === 'erogata').length;
                  const tNonErogate = tSlot.somministrazioni.filter(s => s.stato === 'non_erogata').length;
                  const tTotal = tSlot.somministrazioni.length;
                  const tPending = tTotal - tErogate - tNonErogate;
                  const allDone = tErogate === tTotal;
                  return (
                    <div
                      className={`agt-therapy-slot${allDone ? ' agt-therapy-slot--completed' : ''}`}
                      onClick={() => setSelectedTherapySlotId(tSlot.id)}>
                      <span className="agt-therapy-slot__icon"><IcoPill /></span>
                      <span className="agt-therapy-slot__label">{tSlot.label}</span>
                      <span className="agt-therapy-slot__count">{tErogate}/{tTotal} erogate</span>
                      <span className="agt-therapy-slot__progress">
                        {tNonErogate > 0 ? `${tNonErogate} non erogate` : ''}{tNonErogate > 0 && tPending > 0 ? ' · ' : ''}{tPending > 0 ? `${tPending} da erogare` : ''}
                      </span>
                    </div>
                  );
                })()}

                {/* Regular time slot */}
                <div
                  className={`agt-slot${isHour ? ' agt-slot--hour' : ' agt-slot--half'}${apt ? ' agt-slot--occ' : ' agt-slot--free'}`}
                  onClick={() => {
                    if (apt) setSelectedAptId(isSelected ? null : apt.id);
                    else setAptForm({ data: todayStr, ora });
                  }}>
                  <span className="agt-slot__time">{isHour ? ora : ''}</span>
                  {apt ? (
                    <div className={`agt-apt-card agt-apt-card--${apt.stato}${isSelected ? ' selected' : ''}`}>
                      <div className="agt-apt-card__row">
                        {onSelectPaziente && apt.pazienteNome
                          ? <button className="link-btn agt-apt-card__patient" onClick={e => { e.stopPropagation(); onSelectPaziente(apt.pazienteNome!); }}>{apt.pazienteNome}</button>
                          : <span className="agt-apt-card__patient">{apt.pazienteNome ?? '—'}</span>
                        }
                        <div className="agt-apt-card__badges">
                          {apt.priorita === 'urgente' && <span className="agt-badge agt-badge--urgent">Urgente</span>}
                          <span className={`agt-badge agt-badge--${apt.stato}`}>{STATO_LABEL[apt.stato]}</span>
                        </div>
                      </div>
                      <div className="agt-apt-card__meta">
                        <span>{TIPO_LABEL[apt.tipoIntervento]}</span>
                        <span className="agt-meta-sep">·</span>
                        <span>{apt.durata ?? 30} min</span>
                      </div>
                      {apt.note && isSelected && <p className="agt-apt-card__note">{apt.note}</p>}
                    </div>
                  ) : (
                    <div className="agt-free-slot">
                      <span className="agt-free-slot__plus"><IcoPlus /></span>
                      <span className="agt-free-slot__label">Disponibile</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── WEEKLY VIEW ── */}
      {view === 'settimanale' && (
        <div className="agt-week-wrap">
          <div className="agt-week-grid" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
            <div className="agt-week-corner" />
            {getWeekDays(refDate).map(d => {
              const isToday = isoDate(d) === isoDate(new Date());
              return (
                <div key={isoDate(d)} className={`agt-week-hdr${isToday ? ' today' : ''}`}>
                  <span className="agt-week-hdr__name">
                    {d.toLocaleDateString('it-IT', { weekday: 'short' })}
                  </span>
                  <span className={`agt-week-hdr__num${isToday ? ' today' : ''}`}>{d.getDate()}</span>
                </div>
              );
            })}
            {HOUR_SLOTS.map(ora => (
              <>
                <div key={`th-${ora}`} className="agt-week-time">{ora}</div>
                {getWeekDays(refDate).map(d => {
                  const dStr = isoDate(d);
                  const apts = myApts(dStr).filter(a => a.ora === ora || a.ora === ora.replace(':00', ':30'));
                  return (
                    <div key={`${dStr}-${ora}`}
                      className={`agt-week-cell${apts.length === 0 && !therapySlotsMap.has(ora) ? ' free' : ''}`}
                      onClick={() => apts.length === 0 && setAptForm({ data: dStr, ora })}>
                      {therapySlotsMap.has(ora) && (() => {
                        const ts = therapySlotsMap.get(ora)!;
                        const tErog = ts.somministrazioni.filter(s => s.stato === 'erogata').length;
                        const tNonErog = ts.somministrazioni.filter(s => s.stato === 'non_erogata').length;
                        const tDaErog = ts.somministrazioni.filter(s => s.stato === 'da_erogare').length;
                        const allDone = tErog === ts.somministrazioni.length;
                        const titleParts = [`${tErog}/${ts.somministrazioni.length} erogate`];
                        if (tNonErog > 0) titleParts.push(`${tNonErog} non erogate`);
                        if (tDaErog > 0) titleParts.push(`${tDaErog} da erogare`);
                        return (
                          <div
                            className={`agt-week-therapy-dot${allDone ? ' done' : ''}`}
                            title={`${ts.label}: ${titleParts.join(' · ')}`}
                            onClick={e => { e.stopPropagation(); setSelectedTherapySlotId(ts.id); }}>
                            <IcoPill />
                          </div>
                        );
                      })()}
                      {apts.map(a => (
                        <div key={a.id} className={`agt-week-apt agt-apt-card--${a.stato}`}>
                          <span className="agt-week-apt__time">{a.ora}</span>
                          {onSelectPaziente && a.pazienteNome
                            ? <button className="link-btn agt-week-apt__name" onClick={e => { e.stopPropagation(); onSelectPaziente(a.pazienteNome!); }}>{a.pazienteNome.split(',')[0]}</button>
                            : <span className="agt-week-apt__name">{a.pazienteNome?.split(',')[0] ?? '—'}</span>
                          }
                          <span className={`agt-status-dot agt-status-dot--${a.stato}`} />
                        </div>
                      ))}
                      {apts.length === 0 && !therapySlotsMap.has(ora) && <span className="agt-week-add"><IcoPlus /></span>}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* ── MONTHLY VIEW ── */}
      {view === 'mensile' && (
        <div className="agt-month-wrap">
          <div className="agt-month-grid">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
              <div key={d} className="agt-month-wday">{d}</div>
            ))}
            {getMonthMatrix(refDate).map((d, i) => {
              const inMonth = d.getMonth() === refDate.getMonth();
              const isToday = isoDate(d) === isoDate(new Date());
              const apts = myApts(isoDate(d));
              return (
                <div key={i}
                  className={`agt-month-day${!inMonth ? ' other' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => { setRefDate(d); setView('giornaliero'); }}>
                  <span className="agt-month-day__num">{d.getDate()}</span>
                  <div className="agt-month-day__apts">
                    {apts.slice(0, 2).map(a => (
                      <div key={a.id} className={`agt-month-apt agt-apt-card--${a.stato}`}>
                        <span className="agt-month-apt__time">{a.ora}</span>
                        {onSelectPaziente && a.pazienteNome
                          ? <button className="link-btn agt-month-apt__name" onClick={e => { e.stopPropagation(); onSelectPaziente(a.pazienteNome!); }}>{a.pazienteNome.split(',')[0]}</button>
                          : <span className="agt-month-apt__name">{a.pazienteNome?.split(',')[0] ?? '—'}</span>
                        }
                      </div>
                    ))}
                    {apts.length > 2 && <span className="agt-month-more">+{apts.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {aptForm && (
        <AppointmentForm
          data={aptForm.data} ora={aptForm.ora}
          operatoreId={operatoreId} operatori={operatori} pazienti={pazienti}
          onSave={apt => { onAddAppuntamento(apt); setAptForm(null); }}
          onCancel={() => setAptForm(null)}
          onNewPatient={() => setShowNewPaziente(true)}
        />
      )}
      {showNewPaziente && (
        <NewPatientModal
          operatori={operatori}
          onSave={async () => { setShowNewPaziente(false); }}
          onCancel={() => setShowNewPaziente(false)}
        />
      )}
      {selectedTherapySlotId && onConfirmTherapy && onNotAdministeredTherapy && (() => {
        const activeSlot = therapySlots?.find(s => s.id === selectedTherapySlotId);
        if (!activeSlot) return null;
        return (
          <TherapySlotModal
            slot={activeSlot}
            onClose={() => setSelectedTherapySlotId(null)}
            onConfirm={onConfirmTherapy}
            onNotAdministered={onNotAdministeredTherapy}
          />
        );
      })()}
    </div>
  );
}
