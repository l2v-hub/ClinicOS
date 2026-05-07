import type { ReactNode } from 'react';

// ── PageTabs (L1) ─────────────────────────────────────────────────────────────
// Horizontal tab bar for page-level groups (e.g., Panoramica | Clinica | Diario)

export interface PageTabGroup {
  id: string;
  label: string;
  badge?: number;
}

interface PageTabsProps {
  groups: PageTabGroup[];
  activeId: string;
  onChange: (groupId: string) => void;
  className?: string;
}

export function PageTabs({ groups, activeId, onChange, className }: PageTabsProps) {
  return (
    <nav className={`page-tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label="Page sections">
      {groups.map(g => (
        <button
          key={g.id}
          role="tab"
          aria-selected={activeId === g.id}
          className={`page-tabs__btn${activeId === g.id ? ' page-tabs__btn--active' : ''}`}
          onClick={() => onChange(g.id)}
        >
          {g.label}
          {(g.badge ?? 0) > 0 && <span className="page-tabs__badge">{g.badge}</span>}
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
  onChange: (tabId: string) => void;
  className?: string;
}

export function SectionTabs({ tabs, activeId, onChange, className }: SectionTabsProps) {
  return (
    <nav className={`section-tabs${className ? ` ${className}` : ''}`} role="tablist" aria-label="Section tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeId === t.id}
          className={`section-tabs__btn${activeId === t.id ? ' section-tabs__btn--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {(t.badge ?? 0) > 0 && (
            <span className={`section-tabs__badge${t.urgent ? ' section-tabs__badge--urgent' : ''}`}>{t.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ── SubSectionControl (L3) ────────────────────────────────────────────────────
// Segmented control for deep navigation within a section

export interface SubSectionOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SubSectionControlProps {
  options: SubSectionOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SubSectionControl({ options, value, onChange, size = 'md', className }: SubSectionControlProps) {
  const sizeClass = size === 'sm' ? ' subsection-ctrl--sm' : '';
  return (
    <div className={`subsection-ctrl${sizeClass}${className ? ` ${className}` : ''}`} role="tablist" aria-label="Sub-section">
      {options.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`subsection-ctrl__option${value === o.value ? ' subsection-ctrl__option--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <span className="subsection-ctrl__icon">{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}
