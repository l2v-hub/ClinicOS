import { useState } from 'react';
import { IcoChevronDown, IcoExpand, IcoCompress, IcoEdit, IcoCheck, IcoX } from '../icons';

interface ExpCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  accent: string;
  cardType: 'primary' | 'secondary';
  focusedCard: string | null;
  onFocus: (id: string | null) => void;
  defaultOpen?: boolean;
  summary?: string;
  alertChip?: React.ReactNode;
  children: React.ReactNode;
  // Edit mode
  onEdit?: () => void;
  isEditing?: boolean;
  editContent?: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
}

export function ExpCard({
  id,
  title,
  icon,
  accent,
  cardType,
  focusedCard,
  onFocus,
  defaultOpen = false,
  summary,
  alertChip,
  children,
  onEdit,
  isEditing = false,
  editContent,
  onSave,
  onCancel,
}: ExpCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isFocused = focusedCard === id;
  const otherActive = focusedCard !== null && !isFocused;
  const showBody = isFocused || (!otherActive && open);

  const bodyContent = isEditing && editContent ? editContent : children;

  return (
    <div
      className={[
        'exp-card',
        `exp-card--${cardType}`,
        isFocused ? 'exp-card--focused' : '',
        otherActive ? 'exp-card--dimmed' : '',
        isEditing ? 'exp-card--editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--card-accent': accent } as React.CSSProperties}
    >
      <div className="exp-card__header">
        <button
          className="exp-card__collapse-btn"
          onClick={() => !otherActive && !isFocused && setOpen((p) => !p)}
          disabled={otherActive}
          aria-label={open ? 'Comprimi scheda' : 'Espandi scheda'}
        >
          <span className="exp-card__icon" style={{ color: accent }}>
            {icon}
          </span>
          <div className="exp-card__title-block">
            <span className="exp-card__title">{title}</span>
            {!showBody && summary && <span className="exp-card__summary">{summary}</span>}
          </div>
          {alertChip && <span className="exp-card__alert-chip">{alertChip}</span>}
          {!isFocused && !otherActive && (
            <span className={`exp-card__chevron${open ? ' open' : ''}`}>
              <IcoChevronDown />
            </span>
          )}
        </button>

        <div className="exp-card__header-actions">
          {/* Edit button — only when not editing and body is visible */}
          {onEdit && !isEditing && showBody && (
            <button
              className="exp-card__action-btn"
              onClick={onEdit}
              aria-label="Modifica"
              title="Modifica"
            >
              <IcoEdit />
            </button>
          )}

          {/* Save/Cancel — only when editing */}
          {isEditing && (
            <>
              <button
                className="exp-card__action-btn exp-card__action-btn--success"
                onClick={onSave}
                aria-label="Salva"
                title="Salva"
              >
                <IcoCheck />
              </button>
              <button
                className="exp-card__action-btn exp-card__action-btn--danger"
                onClick={onCancel}
                aria-label="Annulla"
                title="Annulla"
              >
                <IcoX />
              </button>
            </>
          )}

          {/* Focus/compress — not shown when editing */}
          {!isEditing && (
            <button
              className={`exp-card__focus-btn${isFocused ? ' active' : ''}`}
              onClick={() => onFocus(isFocused ? null : id)}
              aria-label={isFocused ? 'Esci dal focus' : 'Espandi al centro'}
              title={isFocused ? 'Esci dal focus' : 'Espandi al centro'}
            >
              {isFocused ? <IcoCompress /> : <IcoExpand />}
            </button>
          )}
        </div>
      </div>

      {showBody && <div className="exp-card__body">{bodyContent}</div>}
    </div>
  );
}
