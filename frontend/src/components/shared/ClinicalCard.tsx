import { useState, useEffect, useRef, useId, type ReactNode } from 'react';

export interface ClinicalCardProps {
  title: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (next: boolean) => void;
  onEdit?: () => void;
  editLabel?: string;
  className?: string;
  children: ReactNode;
}

export function ClinicalCard({
  title,
  defaultExpanded = true,
  expanded,
  onToggle,
  onEdit,
  editLabel = 'Modifica',
  className,
  children,
}: ClinicalCardProps) {
  const reactId = useId();
  const titleId = `cc-${reactId}`;
  const [internalExpanded, setInternalExpanded] = useState<boolean>(defaultExpanded);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? !!expanded : internalExpanded;
  const collapsed = !isExpanded;

  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>(defaultExpanded ? 'auto' : 0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (isExpanded) {
      setContentHeight(el.scrollHeight);
      // After transition, set to auto so dynamic content reflows naturally
      const t = setTimeout(() => setContentHeight('auto'), 200);
      return () => clearTimeout(t);
    } else {
      setContentHeight(0);
    }
  }, [isExpanded, children]);

  function handleToggle() {
    const next = !isExpanded;
    if (!isControlled) setInternalExpanded(next);
    onToggle?.(next);
  }

  function onHeaderKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }

  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit?.();
  }

  const sectionClass =
    'clinical-card' +
    (collapsed ? ' clinical-card--collapsed' : '') +
    (className ? ` ${className}` : '');
  const contentStyle: React.CSSProperties = collapsed
    ? { height: 0 }
    : contentHeight === 'auto'
      ? {}
      : { height: contentHeight };

  return (
    <section className={sectionClass} role="region" aria-labelledby={titleId}>
      <div
        className="clinical-card__header"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={handleToggle}
        onKeyDown={onHeaderKeyDown}
      >
        <h3 id={titleId} className="clinical-card__title">
          {title}
        </h3>
        <div className="clinical-card__actions">
          {onEdit && (
            <button
              type="button"
              className="clinical-card__edit btn-link"
              onClick={handleEditClick}
            >
              {editLabel}
            </button>
          )}
          <button
            type="button"
            className="clinical-card__toggle"
            aria-label="Espandi / Comprimi"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <path
                d="M3 5l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="clinical-card__content" style={contentStyle}>
        <div ref={innerRef} className="clinical-card__content-inner">
          {children}
        </div>
      </div>
    </section>
  );
}
