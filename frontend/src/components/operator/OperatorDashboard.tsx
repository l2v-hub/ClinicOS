import type { UtenteApp, Consegna, SlotAgenda } from '../../types';
import { IcoArrow, IcoWarning, IcoCalendar, IcoConsegne } from '../../icons';
import type { NavKey } from '../../types';

interface OperatorDashboardProps {
  utente: UtenteApp;
  consegne: Consegna[];
  agenda: SlotAgenda[];
  totalePazienti: number;
  loadingPazienti: boolean;
  onNavigate: (nav: NavKey) => void;
}

const STATO_LABEL: Record<string, string> = {
  completato: 'Completato',
  in_corso: 'In corso',
  programmato: 'Programmato',
  libero: 'Libero',
  annullato: 'Annullato',
};

export function OperatorDashboard({
  utente, consegne, agenda, totalePazienti, loadingPazienti, onNavigate,
}: OperatorDashboardProps) {
  const mieConsegne = consegne.filter(c =>
    c.operatoreAssegnato.includes(utente.nome.replace('Dr. ', '').replace('Dr.ssa ', '')) ||
    c.operatoreAssegnato === utente.nome
  );
  const urgenti = mieConsegne.filter(c => c.priorita === 'urgente' && c.stato !== 'completata');
  const aperte = mieConsegne.filter(c => c.stato !== 'completata');
  const prossimoSlot = agenda.find(s => s.stato === 'programmato' || s.stato === 'in_corso');

  return (
    <div className="operator-dashboard">
      <div className="dashboard__date">
        {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="op-welcome">
        <div className="op-avatar-lg">{utente.iniziali}</div>
        <div>
          <h2 className="op-welcome__name">Benvenuto, {utente.nome}</h2>
          <p className="op-welcome__dept">{utente.reparto}</p>
        </div>
      </div>

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

      {/* Prossimo appuntamento */}
      {prossimoSlot && (
        <div className="next-appt-banner">
          <div className="next-appt-banner__label">
            <IcoCalendar /> Prossimo appuntamento
          </div>
          <div className="next-appt-banner__content">
            <span className="next-appt-banner__time">{prossimoSlot.ora}</span>
            <span className="next-appt-banner__patient">{prossimoSlot.pazienteNome}</span>
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
                ? <span className="agenda-day-slot__patient">{slot.pazienteNome}</span>
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
                <span className="consegna-paziente">{c.pazienteNome}</span>
                <p className="consegna-note">{c.note}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
