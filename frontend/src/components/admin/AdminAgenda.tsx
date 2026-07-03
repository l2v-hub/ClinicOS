import { useState } from 'react';
import type { Appuntamento, Operatore, Paziente } from '../../types';
import { IcoChevronLeft, IcoChevronRight, IcoCalendar, IcoPlus } from '../../icons';
import { AppointmentForm } from '../shared/AppointmentForm';
import { IntakeWorkspace } from '../shared/intake/IntakeWorkspace';

type ViewMode = 'giornaliero' | 'settimanale' | 'mensile';

interface AdminAgendaProps {
  operatori: Operatore[];
  appuntamenti: Appuntamento[];
  pazienti: Paziente[];
  onAddAppuntamento: (apt: Omit<Appuntamento, 'id'>) => Promise<string | null>;
  onAddPaziente: (nome: string) => void;
  onSelectPaziente?: (nome: string) => void;
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
function fmtDate(d: Date): string {
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

function occInfo(pct: number): { label: string; cls: string } {
  if (pct < 30) return { label: 'Basso', cls: 'agt-occ--low' };
  if (pct < 60) return { label: 'Bilanciato', cls: 'agt-occ--balanced' };
  if (pct < 85) return { label: 'Alto', cls: 'agt-occ--high' };
  return { label: 'Sovraccarico', cls: 'agt-occ--overloaded' };
}

export function AdminAgenda({ operatori, appuntamenti, pazienti, onAddAppuntamento, onAddPaziente, onSelectPaziente }: AdminAgendaProps) {
  const [view, setView] = useState<ViewMode>('giornaliero');
  const [refDate, setRefDate] = useState(new Date());
  const [filtroOpId, setFiltroOpId] = useState('tutti');
  const [aptForm, setAptForm] = useState<{ data: string; ora: string; operatoreId: string } | null>(null);
  const [showNewPaziente, setShowNewPaziente] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);

  const attivi = operatori.filter(o => o.stato === 'attivo');
  const visibili = filtroOpId === 'tutti' ? attivi : attivi.filter(o => o.id === filtroOpId);

  function getApts(data: string, opId?: string): Appuntamento[] {
    return appuntamenti.filter(a =>
      a.data === data &&
      (opId ? a.operatoreId === opId : filtroOpId === 'tutti' || a.operatoreId === filtroOpId)
    ).sort((a, b) => a.ora.localeCompare(b.ora));
  }

  function navigate(delta: number) {
    if (view === 'giornaliero') setRefDate(d => addDays(d, delta));
    else if (view === 'settimanale') setRefDate(d => addDays(d, delta * 7));
    else setRefDate(d => { const r = new Date(d); r.setMonth(d.getMonth() + delta); return r; });
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

      {/* ── Operator filter chips ── */}
      <div className="agt-filter-row">
        <button
          className={`agt-filter-chip${filtroOpId === 'tutti' ? ' active' : ''}`}
          onClick={() => setFiltroOpId('tutti')}>
          Tutti gli operatori
        </button>
        {attivi.map(op => (
          <button key={op.id}
            className={`agt-filter-chip${filtroOpId === op.id ? ' active' : ''}`}
            style={filtroOpId === op.id ? { borderColor: op.colore, background: op.colore + '18', color: op.colore } : {}}
            onClick={() => setFiltroOpId(filtroOpId === op.id ? 'tutti' : op.id)}>
            <span className="agt-op-dot" style={{ background: op.colore }} />
            {op.cognome}
          </button>
        ))}
      </div>

      {/* ── DAILY VIEW ── */}
      {view === 'giornaliero' && (
        <div className="agt-admin-day-wrap">
          <div className="agt-admin-grid"
            style={{ gridTemplateColumns: `52px repeat(${visibili.length}, minmax(160px, 1fr))` }}>

            {/* Column headers */}
            <div className="agt-admin-corner" />
            {visibili.map(op => {
              const opApts = getApts(todayStr, op.id);
              const usedMin = opApts.reduce((s, a) => s + (a.durata ?? 30), 0);
              const pct = Math.min(100, Math.round((usedMin / TOTAL_AVAIL_MIN) * 100));
              const occ = occInfo(pct);
              const completati = opApts.filter(a => a.stato === 'completato').length;
              return (
                <div key={op.id} className="agt-col-hdr">
                  <div className="agt-col-hdr__top">
                    <span className="agt-op-dot" style={{ background: op.colore }} />
                    <span className="agt-col-hdr__name">{op.cognome} {op.nome}</span>
                  </div>
                  <span className="agt-col-hdr__role">{op.reparto}</span>
                  <div className="agt-col-hdr__occ-row">
                    <span className={`agt-occ-label ${occ.cls}`}>{occ.label}</span>
                    <span className="agt-col-hdr__counts">{completati}/{opApts.length} · {pct}%</span>
                  </div>
                  <div className="agt-occ-track">
                    <div className="agt-occ-fill" style={{ width: `${pct}%`, background: op.colore }} />
                  </div>
                </div>
              );
            })}

            {/* Time rows */}
            {TIME_SLOTS.map(ora => {
              const isHour = ora.endsWith(':00');
              return (
                <>
                  <div key={`t-${ora}`} className={`agt-admin-time${isHour ? ' hour' : ''}`}>
                    {isHour ? ora : ''}
                  </div>
                  {visibili.map(op => {
                    const apt = getApts(todayStr, op.id).find(a => a.ora === ora);
                    const isSelected = apt?.id === selectedAptId;
                    return (
                      <div key={`${op.id}-${ora}`}
                        className={`agt-admin-cell${apt ? ' occ' : ' free'}${isHour ? ' hour' : ''}`}
                        onClick={() => {
                          if (apt) setSelectedAptId(isSelected ? null : apt.id);
                          else setAptForm({ data: todayStr, ora, operatoreId: op.id });
                        }}>
                        {apt ? (
                          <div className={`agt-apt-card agt-apt-card--${apt.stato}${isSelected ? ' selected' : ''}`}>
                            <div className="agt-apt-card__row">
                              {onSelectPaziente && apt.pazienteNome
                                ? <button className="link-btn agt-apt-card__patient" onClick={e => { e.stopPropagation(); onSelectPaziente(apt.pazienteNome!); }}>{apt.pazienteNome}</button>
                                : <span className="agt-apt-card__patient">{apt.pazienteNome ?? '—'}</span>
                              }
                              <span className={`agt-badge agt-badge--${apt.stato}`}>
                                {STATO_LABEL[apt.stato]}
                              </span>
                            </div>
                            <div className="agt-apt-card__meta">
                              <span>{TIPO_LABEL[apt.tipoIntervento]}</span>
                              <span className="agt-meta-sep">·</span>
                              <span>{apt.durata ?? 30} min</span>
                            </div>
                          </div>
                        ) : (
                          <div className="agt-admin-empty">
                            <IcoPlus />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WEEKLY VIEW ── */}
      {view === 'settimanale' && (
        <div className="agt-week-wrap">
          <div className="agt-week-grid" style={{ gridTemplateColumns: `52px repeat(7, 1fr)` }}>
            <div className="agt-week-corner" />
            {getWeekDays(refDate).map(d => {
              const isToday = isoDate(d) === isoDate(new Date());
              const dayApts = getApts(isoDate(d));
              return (
                <div key={isoDate(d)} className={`agt-week-hdr${isToday ? ' today' : ''}`}>
                  <span className="agt-week-hdr__name">
                    {d.toLocaleDateString('it-IT', { weekday: 'short' })}
                  </span>
                  <span className={`agt-week-hdr__num${isToday ? ' today' : ''}`}>{d.getDate()}</span>
                  {dayApts.length > 0 && (
                    <span className="agt-week-hdr__count">{dayApts.length}</span>
                  )}
                </div>
              );
            })}
            {HOUR_SLOTS.map(ora => (
              <>
                <div key={`tw-${ora}`} className="agt-week-time">{ora}</div>
                {getWeekDays(refDate).map(d => {
                  const dStr = isoDate(d);
                  const apts = getApts(dStr).filter(a => a.ora === ora || a.ora === ora.replace(':00', ':30'));
                  const defOpId = filtroOpId !== 'tutti' ? filtroOpId : (attivi[0]?.id ?? '');
                  return (
                    <div key={`${dStr}-${ora}`}
                      className={`agt-week-cell${apts.length === 0 ? ' free' : ''}`}
                      onClick={() => apts.length === 0 && setAptForm({ data: dStr, ora, operatoreId: defOpId })}>
                      {apts.map(a => {
                        const op = operatori.find(o => o.id === a.operatoreId);
                        return (
                          <div key={a.id} className={`agt-week-apt agt-apt-card--${a.stato}`} style={{ borderLeftColor: op?.colore ?? '#888' }}>
                            <span className="agt-week-apt__time">{a.ora}</span>
                            {onSelectPaziente && a.pazienteNome
                              ? <button className="link-btn agt-week-apt__name" onClick={e => { e.stopPropagation(); onSelectPaziente(a.pazienteNome!); }}>{a.pazienteNome.split(',')[0]}</button>
                              : <span className="agt-week-apt__name">{a.pazienteNome?.split(',')[0] ?? '—'}</span>
                            }
                            {op && <span className="agt-op-dot agt-op-dot--sm" style={{ background: op.colore }} />}
                          </div>
                        );
                      })}
                      {apts.length === 0 && <span className="agt-week-add"><IcoPlus /></span>}
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
              const apts = getApts(isoDate(d));
              return (
                <div key={i}
                  className={`agt-month-day${!inMonth ? ' other' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => { setRefDate(d); setView('giornaliero'); }}>
                  <span className="agt-month-day__num">{d.getDate()}</span>
                  <div className="agt-month-day__apts">
                    {apts.slice(0, 3).map(a => {
                      const op = operatori.find(o => o.id === a.operatoreId);
                      return (
                        <div key={a.id} className={`agt-month-apt agt-apt-card--${a.stato}`} style={{ borderLeftColor: op?.colore ?? '#888' }}>
                          <span className="agt-month-apt__time">{a.ora}</span>
                          {onSelectPaziente && a.pazienteNome
                            ? <button className="link-btn agt-month-apt__name" onClick={e => { e.stopPropagation(); onSelectPaziente(a.pazienteNome!); }}>{a.pazienteNome.split(',')[0]}</button>
                            : <span className="agt-month-apt__name">{a.pazienteNome?.split(',')[0] ?? '—'}</span>
                          }
                        </div>
                      );
                    })}
                    {apts.length > 3 && <span className="agt-month-more">+{apts.length - 3}</span>}
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
          operatoreId={aptForm.operatoreId} operatori={operatori} pazienti={pazienti}
          onSave={async apt => { const err = await onAddAppuntamento(apt); if (!err) setAptForm(null); return err; }}
          onCancel={() => setAptForm(null)}
          onNewPatient={() => setShowNewPaziente(true)}
        />
      )}
      {/* operatorId/operatorRole not available in AdminAgenda props — not passed */}
      <IntakeWorkspace
        open={showNewPaziente}
        onClose={() => setShowNewPaziente(false)}
        onCreated={(id) => { onAddPaziente(id); setShowNewPaziente(false); }}
      />
    </div>
  );
}
