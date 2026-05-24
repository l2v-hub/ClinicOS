import type { UtenteApp, NavKey } from '../../types';
import {
  IcoDashboard, IcoPazienti, IcoCalendar, IcoConsegne, IcoMessage,
  IcoLogout, IcoOperatori, IcoBed, IcoActivity,
} from '../../icons';

interface TeamsLikeSidebarProps {
  activeKey: NavKey;
  utente: UtenteApp;
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
  unreadNotes?: number;
}

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function getNavItems(utente: UtenteApp, unreadNotes: number): NavItem[] {
  if (utente.ruolo === 'admin') {
    return [
      { key: 'admin-dashboard', label: 'Dashboard', icon: <IcoDashboard /> },
      { key: 'gestione-operatori', label: 'Operatori', icon: <IcoOperatori /> },
      { key: 'agenda-admin', label: 'Agenda', icon: <IcoCalendar /> },
      { key: 'posti-letto', label: 'Posti Letto', icon: <IcoBed /> },
      { key: 'consegne', label: 'Consegne', icon: <IcoConsegne /> },
      { key: 'note', label: 'Note', icon: <IcoMessage />, badge: unreadNotes },
    ];
  }
  return [
    { key: 'operator-dashboard', label: 'Dashboard', icon: <IcoDashboard /> },
    { key: 'pazienti', label: 'Pazienti', icon: <IcoPazienti /> },
    { key: 'parametri-multipaziente', label: 'Parametri', icon: <IcoActivity /> },
    { key: 'consegne', label: 'Consegne', icon: <IcoConsegne /> },
    { key: 'agenda-operatore', label: 'Agenda', icon: <IcoCalendar /> },
    { key: 'note', label: 'Note', icon: <IcoMessage />, badge: unreadNotes },
  ];
}

export default function TeamsLikeSidebar({
  activeKey, utente, onNavigate, onLogout, unreadNotes = 0
}: TeamsLikeSidebarProps) {
  const items = getNavItems(utente, unreadNotes);
  const initials = utente.iniziali || (utente.nome ? utente.nome.slice(0, 2).toUpperCase() : 'CL');

  // Treat 'dettaglio-paziente' as active on pazienti item
  const resolvedActiveKey: NavKey =
    activeKey === 'dettaglio-paziente' ? 'pazienti' : activeKey;

  return (
    <nav className="teams-sidebar">
      <div className="teams-sidebar__brand">
        <div className="teams-sidebar__brand-dot">C</div>
      </div>

      <div className="teams-sidebar__nav">
        {items.map(item => (
          <div
            key={item.key}
            className={`teams-sidebar__item${resolvedActiveKey === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
            title={item.label}
          >
            <span className="teams-sidebar__item-icon">{item.icon}</span>
            <span className="teams-sidebar__item-label">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="teams-sidebar__badge">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </div>
        ))}
      </div>

      <div className="teams-sidebar__footer">
        <div className="teams-sidebar__avatar" title={utente.nome}>
          {initials}
        </div>
        <div className="teams-sidebar__logout" onClick={onLogout} title="Esci">
          <IcoLogout />
        </div>
      </div>
    </nav>
  );
}
