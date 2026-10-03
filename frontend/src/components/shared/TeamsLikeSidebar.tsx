import type { CapabilityMap, UtenteApp, NavKey } from '../../types';
import { can, canNavigate } from '../../lib/capabilities';

// Icone della barra laterale: stessi tracciati del prototipo HMI 1 (24 px, tratto 2).
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  users:
    'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2',
  pill: 'M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 7l10 10',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  clipboard: 'M7 4H5v17h14V4h-2M9 4V3h6v1M9 4h6M9 11h6M9 15h4',
  calendar:
    'M5 4.5h14a2 2 0 0 1 2 2v12.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2zM3 9.5h18M8 2.5v4M16 2.5v4',
  msg: 'M4 5h16v11H9l-5 4z',
  flask: 'M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3M7 15h10',
  ai: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  bed: 'M3 5v15M3 16h18v4M21 16v-3a3 3 0 0 0-3-3h-8v6M6.5 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  team: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6',
  shield: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM9 12l2 2 4-4',
} as const;
type IconName = keyof typeof PATHS;

function RailIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

interface TeamsLikeSidebarProps {
  activeKey: NavKey;
  utente: UtenteApp;
  onNavigate: (key: NavKey) => void;
  criticalHandovers?: number | null;
  /** Pannello dell'assistente aperto: la voce lo dichiara (aria-expanded) e resta evidenziata. */
  assistantOpen?: boolean;
  /** Capability della sessione: le voci delle pagine non consentite non compaiono. */
  capabilities?: CapabilityMap | null;
}

interface NavItem {
  key: NavKey;
  label: string;
  icon: IconName;
  badge?: number;
  /** Nome completo (tooltip) quando l'etichetta della barra è abbreviata. */
  title?: string;
}

function getNavItems(utente: UtenteApp, criticalHandovers: number | null): NavItem[] {
  if (utente.ruolo === 'admin') {
    return [
      { key: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { key: 'gestione-operatori', label: 'Operatori', icon: 'team' },
      { key: 'agenda-admin', label: 'Agenda', icon: 'calendar' },
      { key: 'terapie', label: 'Terapia', icon: 'pill' },
      { key: 'posti-letto', label: 'Posti Letto', icon: 'bed' },
      { key: 'orari-operatori', label: 'Orari', icon: 'clock' },
      { key: 'consegne', label: 'Consegne', icon: 'clipboard', badge: criticalHandovers ?? undefined },
      { key: 'ruoli-permessi', label: 'Ruoli', icon: 'shield', title: 'Ruoli e permessi' },
    ];
  }
  // Ordine ed etichette del prototipo HMI 1.
  return [
    { key: 'operator-dashboard', label: 'Turno', icon: 'home' },
    { key: 'pazienti', label: 'Pazienti', icon: 'users' },
    { key: 'terapie', label: 'Terapia', icon: 'pill' },
    { key: 'parametri-multipaziente', label: 'Parametri', icon: 'activity' },
    { key: 'consegne', label: 'Consegne', icon: 'clipboard', badge: criticalHandovers ?? undefined },
    { key: 'agenda-operatore', label: 'Agenda', icon: 'calendar' },
    { key: 'anagrafica-farmaci', label: 'Farmaci', icon: 'flask' },
  ];
}

export default function TeamsLikeSidebar({
  activeKey,
  utente,
  onNavigate,
  assistantOpen = false,
  criticalHandovers = 0,
  capabilities = null,
}: TeamsLikeSidebarProps) {
  const items = getNavItems(utente, criticalHandovers).filter((item) =>
    canNavigate(capabilities, item.key),
  );

  // La cartella appartiene a Pazienti.
  const resolvedActiveKey: NavKey =
    activeKey === 'dettaglio-paziente' || activeKey === 'nuovo-ingresso' ? 'pazienti' : activeKey;
  const assistantActive = resolvedActiveKey === 'ai-assistant' || assistantOpen;

  return (
    <nav className="teams-sidebar" aria-label="Navigazione principale">
      <div className="teams-sidebar__brand">
        <span className="teams-sidebar__brand-dot" aria-hidden="true">
          <RailIcon name="cross" />
        </span>
      </div>

      <div className="teams-sidebar__nav">
        {items.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`teams-sidebar__item${resolvedActiveKey === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
            title={item.title ?? item.label}
            aria-label={item.key === 'consegne'
              ? `Consegne, ${criticalHandovers === null ? 'conteggio non disponibile' : `${criticalHandovers} critiche da prendere in carico`}`
              : undefined}
            aria-current={resolvedActiveKey === item.key ? 'page' : undefined}
          >
            <span className="teams-sidebar__item-icon">
              <RailIcon name={item.icon} />
            </span>
            <span className="teams-sidebar__item-label">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="teams-sidebar__badge">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
            {item.key === 'consegne' && criticalHandovers === null && <span className="teams-sidebar__badge" aria-hidden="true">…</span>}
          </button>
        ))}
      </div>

      <div className="teams-sidebar__footer">
        {/* L'Assistente (Agnos) esiste solo per i ruoli a cui la policy concede i comandi. */}
        {can(capabilities, 'agnos.plan_command') && (
          <button
            type="button"
            className={`teams-sidebar__item teams-sidebar__item--ai${assistantActive ? ' active' : ''}`}
            onClick={() => onNavigate('ai-assistant')}
            title="Milo · assistente clinico AI"
            aria-label="Apri Milo, assistente clinico AI"
            aria-expanded={assistantOpen}
            aria-haspopup="dialog"
          >
            <span className="teams-sidebar__item-icon">
              <RailIcon name="ai" />
            </span>
            <span className="teams-sidebar__item-label">Milo</span>
          </button>
        )}
      </div>
    </nav>
  );
}
