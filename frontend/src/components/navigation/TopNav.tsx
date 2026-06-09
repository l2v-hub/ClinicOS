import './TopNav.css';

export interface TopNavItem {
  key: string;
  label: string;
  badge?: number;
}

interface TopNavProps {
  /** level2 = primary page nav (bigger, stronger). level3 = contextual sub-nav (lighter). */
  variant: 'level2' | 'level3';
  items: TopNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

/**
 * Single horizontal navigation component for the Left-Top-Top pattern.
 * Same visual model for level 2 and level 3, differentiated only by hierarchy
 * (size / weight / underline thickness / padding). No pills, no per-item borders,
 * no per-page custom styling.
 */
export function TopNav({ variant, items, activeKey, onChange, ariaLabel }: TopNavProps) {
  return (
    <nav
      className={`top-nav top-nav--${variant}`}
      role="tablist"
      aria-label={ariaLabel ?? (variant === 'level2' ? 'Sezioni principali' : 'Sotto-sezioni')}
    >
      {items.map(item => {
        const active = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`top-nav__item${active ? ' is-active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            {item.label}
            {(item.badge ?? 0) > 0 && (
              <span className="top-nav__badge">{item.badge! > 99 ? '99+' : item.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
