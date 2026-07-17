import type { UtenteApp, Consegna, SlotAgenda, CartellaPaziente, Paziente } from '../../types';
import { IcoArrow, IcoWarning, IcoCalendar, IcoConsegne, IcoActivity, IcoShield, IcoClock } from '../../icons';
import type { NavKey } from '../../types';
import { PageHeader } from '../shared/PageHeader';

interface OperatorDashboardProps {
  utente: UtenteApp;
  consegne: Consegna[];
  agenda: SlotAgenda[];
  totalePazienti: number;
  loadingPazienti: boolean;
  onNavigate: (nav: NavKey) => void;
  onSelectPaziente?: (nome: string) => void;
  cartelle?: CartellaPaziente[];
  pazienti?: Paziente[]; // reserved for future patient-level KPIs
}

const STATO_LABEL: Record<string, string> = {
  completato: 'Completato',
  in_corso: 'In corso',
  programmato: 'Programmato',
  libero: 'Libero',
  annullato: 'Annullato',
};

export function OperatorDashboard({
  utente, consegne, agenda, totalePazienti, loadingPazienti, onNavigate, onSelectPaziente,
  cartelle = [],
}: OperatorDashboardProps) {
  const mieConsegne = consegne.filter(c =>
    c.operatoreAssegnato.includes(utente.nome.replace('Dr. ', '').replace('Dr.ssa ', '')) ||
    c.operatoreAssegnato === utente.nome
  );
  const urgenti = mieConsegne.filter(c => c.priorita === 'urgente' && c.stato !== 'completata');
  const aperte = mieConsegne.filter(c => c.stato !== 'completata');
  const prossimoSlot = agenda.find(s => s.stato === 'programmato' || s.stato === 'in_corso');

  // Clinical KPIs from cartelle
  const critici = cartelle.filter(c => c.parametriVitali.some(v => v.stato === 'critico')).length;
  const rischiAlti = cartelle.filter(c => c.indicatoriRischio.some(r => r.livello === 'alto' || r.livello === 'critico')).length;
  const allergieGravi = cartelle.filter(c => c.allergie.some(a => a.gravita === 'grave')).length;
  const pazientiRicoverati = cartelle.filter(c => c.statoRicovero === 'ricoverato').length;

  // Avanzamento terapie / consegne (dati reali)
  const tutteTerapie = cartelle.flatMap(c => c.terapie ?? []);
  const terapieTotali = tutteTerapie.length;
  const terapieCompletate = tutteTerapie.filter(t => t.stato === 'completata').length;
  const pctTerapie = terapieTotali > 0 ? Math.round((terapieCompletate / terapieTotali) * 100) : 0;
  const consegneCompletate = mieConsegne.filter(c => c.stato === 'completata').length;
  const pctConsegne = mieConsegne.length > 0 ? Math.round((consegneCompletate / mieConsegne.length) * 100) : 0;

  const todayStr = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="operator-dashboard">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Dashboard' }]}
        title={`Benvenuto, ${utente.nome}`}
        subtitle={`${utente.reparto} — ${todayStr}`}
        actions={
          <button className="btn-ghost-outline" onClick={() => onNavigate('pazienti')}>
            <IcoArrow /> Vedi pazienti
          </button>
        }
      />

      {/* Alert urgente */}
      {urgenti.length > 0 && (
        <div className="coverage-alert">
          <IcoWarning />
          <span>
            <strong>{urgenti.length} consegn{urgenti.length === 1 ? 'a urgente' : 'e urgenti'} in attesa</strong>
            {' '}— richiede attenzione immediata
          </span>
          <button className="link-btn" onClick={() => onNavigate('consegne')}>
            Vedi <IcoArrow />
          </button>
        </div>
      )}

      {/* Clinical KPI band — banda alert clinici in cima */}
      {cartelle.length > 0 && (
        <div className="kpi-alert-grid">
          <div className={`kpi-alert-card${critici > 0 ? ' kpi-alert-card--red' : ' kpi-alert-card--green'}`} onClick={() => onNavigate('parametri-multipaziente')} title="Vai a Parametri">
            <span className="kpi-alert-card__val">{critici}</span>
            <span className="kpi-alert-card__lbl"><IcoActivity /> Parametri critici</span>
            {critici === 0 && <span className="kpi-alert-card__ok">Nessuna criticità</span>}
          </div>
          <div className={`kpi-alert-card${rischiAlti > 0 ? ' kpi-alert-card--amber' : ' kpi-alert-card--green'}`} onClick={() => onNavigate('pazienti')} title="Vai a Pazienti">
            <span className="kpi-alert-card__val">{rischiAlti}</span>
            <span className="kpi-alert-card__lbl"><IcoShield /> Rischi alti/critici</span>
            {rischiAlti === 0 && <span className="kpi-alert-card__ok">Nessuna criticità</span>}
          </div>
          <div className={`kpi-alert-card${allergieGravi > 0 ? ' kpi-alert-card--amber' : ' kpi-alert-card--green'}`} onClick={() => onNavigate('pazienti')} title="Vai a Pazienti">
            <span className="kpi-alert-card__val">{allergieGravi}</span>
            <span className="kpi-alert-card__lbl"><IcoWarning /> Allergie gravi</span>
            {allergieGravi === 0 && <span className="kpi-alert-card__ok">Nessuna criticità</span>}
          </div>
          <div className="kpi-alert-card kpi-alert-card--blue" onClick={() => onNavigate('pazienti')} title="Vai a Pazienti">
            <span className="kpi-alert-card__val">{pazientiRicoverati}</span>
            <span className="kpi-alert-card__lbl">Ricoverati attivi</span>
          </div>
        </div>
      )}

      {/* Stat cards — KPI grandi e cliccabili */}
      <div className="stats-grid">
        {([
          { key: 'pazienti' as NavKey, mod: 'blue', label: 'I Miei Pazienti', value: loadingPazienti ? '—' : totalePazienti, cta: 'Lista pazienti' },
          { key: 'agenda-operatore' as NavKey, mod: 'indigo', label: 'Appuntamenti Oggi', value: agenda.filter(s => s.stato !== 'libero' && s.stato !== 'annullato').length, cta: 'Agenda' },
          { key: 'consegne' as NavKey, mod: 'emerald', label: 'Consegne Aperte', value: aperte.length, cta: 'Vedi consegne', danger: urgenti.length > 0 },
        ]).map(c => (
          <div
            key={c.key}
            className={`stat-card stat-card--${c.mod} stat-card--clickable`}
            role="button"
            tabIndex={0}
            onClick={() => onNavigate(c.key)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(c.key); } }}
          >
            <div className="stat-card__label">{c.label}</div>
            <div className="stat-card__value" style={c.danger ? { color: 'var(--red)' } : {}}>{c.value}</div>
            <span className="stat-card__action">{c.cta} <IcoArrow /></span>
          </div>
        ))}
      </div>

      {/* Avanzamento terapie — barre di avanzamento (dati reali cartelle) */}
      {terapieTotali > 0 && (
        <div className="progress-card-grid">
          <div className="progress-card">
            <div className="progress-card__head">
              <span className="progress-card__label">Terapie completate</span>
              <span className="progress-card__count">{terapieCompletate}/{terapieTotali}</span>
            </div>
            <div className="progress-bar"><div className="progress-bar__fill progress-bar__fill--emerald" style={{ width: `${pctTerapie}%` }} /></div>
          </div>
          <div className="progress-card">
            <div className="progress-card__head">
              <span className="progress-card__label">Consegne evase</span>
              <span className="progress-card__count">{consegneCompletate}/{mieConsegne.length}</span>
            </div>
            <div className="progress-bar"><div className="progress-bar__fill progress-bar__fill--blue" style={{ width: `${pctConsegne}%` }} /></div>
          </div>
        </div>
      )}

      {/* Prossimo appuntamento */}
      {prossimoSlot && (
        <div className="next-appt-banner">
          <div className="next-appt-banner__label">
            <IcoCalendar /> Prossimo appuntamento
          </div>
          <div className="next-appt-banner__content">
            <span className="next-appt-banner__time">{prossimoSlot.ora}</span>
            {onSelectPaziente && prossimoSlot.pazienteNome
              ? <button className="link-btn next-appt-banner__patient" onClick={() => onSelectPaziente(prossimoSlot.pazienteNome!)}>{prossimoSlot.pazienteNome}</button>
              : <span className="next-appt-banner__patient">{prossimoSlot.pazienteNome}</span>
            }
            <span className="next-appt-banner__motivo">{prossimoSlot.motivo}</span>
            <span className={`agenda-stato-pill agenda-stato--${prossimoSlot.stato}`}>
              {STATO_LABEL[prossimoSlot.stato] ?? prossimoSlot.stato}
            </span>
          </div>
        </div>
      )}

      {/* Agenda del giorno */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-header__title">
          <span className="section-header__ico"><IcoCalendar /></span>
          Agenda di Oggi
        </h3>
        <button className="link-btn" onClick={() => onNavigate('agenda-operatore')}>
          Vedi tutto <IcoArrow />
        </button>
      </div>

      <div className="agenda-day-list">
        {agenda.map(slot => (
          <div key={slot.id} className={`agenda-day-slot agenda-day-slot--${slot.stato}`}>
            <span className="agenda-day-slot__time">{slot.ora}</span>
            <div className="agenda-day-slot__info">
              {slot.pazienteNome
                ? (onSelectPaziente
                    ? <button className="link-btn agenda-day-slot__patient" onClick={() => onSelectPaziente(slot.pazienteNome!)}>{slot.pazienteNome}</button>
                    : <span className="agenda-day-slot__patient">{slot.pazienteNome}</span>)
                : <span className="agenda-day-slot__free">Slot libero</span>
              }
              {slot.motivo && <span className="agenda-day-slot__motivo">{slot.motivo}</span>}
            </div>
            <span className={`agenda-stato-pill agenda-stato--${slot.stato}`}>
              {STATO_LABEL[slot.stato] ?? slot.stato}
            </span>
          </div>
        ))}
      </div>

      {/* Consegne urgenti */}
      {urgenti.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 32 }}>
            <h3 className="section-header__title">
              <span className="section-header__ico"><IcoConsegne /></span>
              Le Mie Consegne Urgenti
            </h3>
            <button className="link-btn" onClick={() => onNavigate('consegne')}>
              Vedi tutte <IcoArrow />
            </button>
          </div>
          <div className="consegne-list">
            {urgenti.slice(0, 3).map(c => (
              <div key={c.id} className="consegna-card consegna-card--urgente">
                <div className="consegna-card__top">
                  <span className="consegna-priorita-badge consegna-priorita-badge--urgente">Urgente</span>
                  <span className="consegna-tipo">{c.tipo}</span>
                  {c.oraScadenza && <span className="consegna-scadenza"><IcoClock />{c.oraScadenza}</span>}
                </div>
                {onSelectPaziente && c.pazienteNome
                  ? <button className="link-btn consegna-paziente" onClick={() => onSelectPaziente(c.pazienteNome!)} style={{ fontWeight: 600 }}>{c.pazienteNome}</button>
                  : <span className="consegna-paziente">{c.pazienteNome}</span>
                }
                <p className="consegna-note">{c.note}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
