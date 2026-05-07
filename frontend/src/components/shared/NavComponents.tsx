import type { ReactNode } from 'react';

// ── PageTabs (L1) ─────────────────────────────────────────────────────────────
// Horizontal tab bar for page-level groups (e.g., Panoramica | Clinica | Diario)

export interface PageTab {
  id: string;
  label: string;
  badge?: number;
}

interface PageTabsProps {
  tabs: PageTab[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function PageTabs({ tabs, activeId, onSelect, className }: PageTabsProps) {
  return (
    <nav className={`page-tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label="Page sections">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeId === t.id}
          className={`page-tabs__item${activeId === t.id ? ' active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
          {(t.badge ?? 0) > 0 && <span className="page-tabs__badge">{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

// ── SectionTabs (L2) ──────────────────────────────────────────────────────────
// Horizontal tab bar for section-level tabs within a group

export interface SectionTab {
  id: string;
  label: string;
  badge?: number;
  urgent?: boolean;
}

interface SectionTabsProps {
  tabs: SectionTab[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function SectionTabs({ tabs, activeId, onSelect, className }: SectionTabsProps) {
  return (
    <nav className={`section-tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label="Section tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeId === t.id}
          className={`section-tabs__item${activeId === t.id ? ' active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
          {(t.badge ?? 0) > 0 && (
            <span className={`section-tabs__badge${t.urgent ? ' urgent' : ''}`}>{t.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ── SubSectionControl (L3) ────────────────────────────────────────────────────
// Segmented control for deep navigation within a section

export interface SubSectionOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SubSectionControlProps {
  options: SubSectionOption[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function SubSectionControl({ options, activeId, onSelect, className }: SubSectionControlProps) {
  return (
    <div className={`subsection-ctrl${className ? ` ${className}` : ''}`} role="tablist" aria-label="Sub-section">
      {options.map(o => (
        <button
          key={o.id}
          role="tab"
          aria-selected={activeId === o.id}
          className={`subsection-ctrl__item${activeId === o.id ? ' active' : ''}`}
          onClick={() => onSelect(o.id)}
        >
          {o.icon && <span className="subsection-ctrl__icon">{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}
