import type { UtenteApp, Consegna, SlotAgenda, CartellaPaziente, Paziente } from '../../types';
import { IcoArrow, IcoWarning, IcoCalendar, IcoConsegne, IcoActivity, IcoShield } from '../../icons';
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

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card--blue">
          <div className="stat-card__label">I Miei Pazienti</div>
          <div className="stat-card__value">{loadingPazienti ? '—' : totalePazienti}</div>
          <button className="stat-card__action" onClick={() => onNavigate('pazienti')}>
            Lista pazienti <IcoArrow />
          </button>
        </div>
        <div className="stat-card stat-card--indigo">
          <div className="stat-card__label">Appuntamenti Oggi</div>
          <div className="stat-card__value">{agenda.filter(s => s.stato !== 'libero' && s.stato !== 'annullato').length}</div>
          <button className="stat-card__action" onClick={() => onNavigate('agenda-operatore')}>
            Agenda <IcoArrow />
          </button>
        </div>
        <div className="stat-card stat-card--emerald">
          <div className="stat-card__label">Consegne Aperte</div>
          <div className="stat-card__value" style={urgenti.length > 0 ? { color: 'var(--red)' } : {}}>
            {aperte.length}
          </div>
          <button className="stat-card__action" onClick={() => onNavigate('consegne')}>
            Vedi consegne <IcoArrow />
          </button>
        </div>
      </div>

      {/* Clinical KPI strip */}
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
                  {c.oraScadenza && <span className="consegna-scadenza">⏰ {c.oraScadenza}</span>}
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
