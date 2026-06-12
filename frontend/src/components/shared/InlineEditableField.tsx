import { useEffect, useRef, useState } from 'react';
import { IcoSave, IcoX, IcoEdit } from '../../icons';

export type InlineFieldType = 'text' | 'textarea' | 'select' | 'number';

export interface InlineOption {
  value: string;
  label: string;
}

interface Props {
  /** Field label (left column). Static, never editable. */
  label: string;
  /** Raw editable value. */
  value: string;
  /** Optional formatted text shown in view mode (defaults to value). */
  display?: string;
  type?: InlineFieldType;
  /** Options for type="select". */
  options?: InlineOption[];
  placeholder?: string;
  /** View text when value is empty. */
  emptyText?: string;
  /**
   * "row" = label→value row (default). "block" = full-width paragraph value
   * (no label column), for long free-text cards like Anamnesi.
   */
  variant?: 'row' | 'block';
  /**
   * Persist the new value. Return false (or throw) to signal failure:
   * the field stays in edit mode and shows an error.
   */
  onSave: (next: string) => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
}

/**
 * Uniform inline-editable label→value row.
 * Click the value to edit; a floppy/Salva icon persists via onSave.
 * On failure the field stays editable and shows an error (value is never lost).
 */
export function InlineEditableField({
  label,
  value,
  display,
  type = 'text',
  options,
  placeholder,
  emptyText = '—',
  variant = 'row',
  onSave,
  disabled = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  // Keep draft in sync when the underlying value changes while not editing.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange?.(len, len);
      }
    }
  }, [editing]);

  function startEdit() {
    if (disabled) return;
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const ok = await onSave(draft);
      if (ok === false) {
        setError('Salvataggio non riuscito. Riprova.');
      } else {
        setEditing(false);
      }
    } catch {
      setError('Salvataggio non riuscito. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      void save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  const isBlock = variant === 'block';

  if (editing) {
    return (
      <div className={isBlock ? 'inline-edit-block inline-edit-block--editing' : 'pic-row pic-row--editing'}>
        {!isBlock && <span className="pic-row__lbl">{label}</span>}
        <div className="inline-edit__control">
          {type === 'textarea' ? (
            <textarea
              ref={el => { inputRef.current = el; }}
              className="form-input inline-edit__input"
              rows={3}
              value={draft}
              placeholder={placeholder}
              disabled={saving}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            />
          ) : type === 'select' ? (
            <select
              ref={el => { inputRef.current = el; }}
              className="form-input inline-edit__input"
              value={draft}
              disabled={saving}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            >
              {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              ref={el => { inputRef.current = el; }}
              type={type === 'number' ? 'number' : 'text'}
              className="form-input inline-edit__input"
              value={draft}
              placeholder={placeholder}
              disabled={saving}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            />
          )}
          <div className="inline-edit__actions">
            <button
              type="button"
              className="inline-edit__btn inline-edit__btn--save"
              title="Salva"
              aria-label="Salva"
              disabled={saving}
              onClick={() => void save()}
            >
              <IcoSave />
            </button>
            <button
              type="button"
              className="inline-edit__btn inline-edit__btn--cancel"
              title="Annulla"
              aria-label="Annulla"
              disabled={saving}
              onClick={cancel}
            >
              <IcoX />
            </button>
          </div>
        </div>
        {error && <span className="inline-edit__error">{error}</span>}
      </div>
    );
  }

  const text = display ?? value;
  const isEmpty = !text;

  if (isBlock) {
    return (
      <div className="inline-edit-block">
        <button
          type="button"
          className={`inline-edit-block__value inline-edit__value${isEmpty ? ' inline-edit__value--empty' : ''}`}
          onClick={startEdit}
          disabled={disabled}
          title={disabled ? undefined : 'Clicca per modificare'}
          aria-label={label}
        >
          <span>{isEmpty ? emptyText : text}</span>
          {!disabled && <span className="inline-edit__pencil" aria-hidden="true"><IcoEdit /></span>}
        </button>
      </div>
    );
  }

  return (
    <div className="pic-row">
      <span className="pic-row__lbl">{label}</span>
      <button
        type="button"
        className={`pic-row__val inline-edit__value${isEmpty ? ' inline-edit__value--empty' : ''}`}
        onClick={startEdit}
        disabled={disabled}
        title={disabled ? undefined : 'Clicca per modificare'}
      >
        <span>{isEmpty ? emptyText : text}</span>
        {!disabled && <span className="inline-edit__pencil" aria-hidden="true"><IcoEdit /></span>}
      </button>
    </div>
  );
}
