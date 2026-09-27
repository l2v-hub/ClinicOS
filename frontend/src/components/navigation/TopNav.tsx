import { Fragment, useRef, type KeyboardEvent } from 'react';
import './TopNav.css';

export interface TopNavItem {
  key: string;
  label: string;
  badge?: number;
  /** Primo elemento di un gruppo: separatore visivo (non interattivo) prima del tab. */
  groupStart?: boolean;
  /** Etichetta del gruppo mostrata prima del primo elemento (es. "Clinica"); solo visiva. */
  groupLabel?: string;
}

interface TopNavProps {
  /** level2 = primary page nav (bigger, stronger). level3 = contextual sub-nav (lighter). */
  variant: 'level2' | 'level3';
  items: TopNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  /** Visible hierarchy label: makes the relationship between the two tab levels explicit. */
  visualLabel?: string;
  /** Stable prefix used to connect tabs to the controlled panel. */
  idPrefix?: string;
  panelId?: string;
  /** Optional layout modifier for a specific navigation placement. */
  className?: string;
}

/**
 * Single keyboard-accessible navigation component for the Left-Top-Top pattern.
 * Level 2 is the primary area rail; level 3 is a quieter contextual underline rail.
 */
export function TopNav({
  variant,
  items,
  activeKey,
  onChange,
  ariaLabel,
  visualLabel,
  idPrefix,
  panelId,
  className,
}: TopNavProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextItem = items[nextIndex];
    onChange(nextItem.key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <nav
      className={`top-nav top-nav--${variant}${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={ariaLabel ?? (variant === 'level2' ? 'Sezioni principali' : 'Sotto-sezioni')}
    >
      {visualLabel && (
        <span className="top-nav__context-label" aria-hidden="true">
          {visualLabel}
        </span>
      )}
      <div className="top-nav__items">
        {items.map((item, index) => {
          const active = activeKey === item.key;
          const tabId = idPrefix ? `${idPrefix}-${item.key}` : undefined;
          return (
            <Fragment key={item.key}>
              {item.groupLabel ? (
                <span className="top-nav__group-label" aria-hidden="true">
                  {item.groupLabel}
                </span>
              ) : item.groupStart && index > 0 ? (
                <span className="top-nav__group-sep" aria-hidden="true" />
              ) : null}
              <button
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                className={`top-nav__item${active ? ' is-active' : ''}`}
                onClick={() => onChange(item.key)}
                onKeyDown={(event) => moveFocus(event, index)}
              >
                {item.label}
                {(item.badge ?? 0) > 0 && (
                  <span className="top-nav__badge">{item.badge! > 99 ? '99+' : item.badge}</span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
