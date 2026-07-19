import { useEffect, useRef } from 'react';
import { IcoWarning, IcoX, IcoCheck } from '../../icons';

interface Props {
  /** Render nothing when false. */
  open: boolean;
  title: string;
  /** Body text (or rich node) explaining the consequence. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' = red destructive confirm (default); 'primary' = blue confirm. */
  tone?: 'danger' | 'primary';
  /** Disables buttons while the action runs. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable themed confirmation modal — replaces native window.confirm() for CRUD
 * delete/irreversible actions. Reuses the app modal shell (.modal-overlay/.modal-box).
 * Closes on ESC or overlay click; focuses the confirm button on open.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Elimina',
  cancelLabel = 'Annulla',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => !busy && onCancel()}>
      <div
        className="modal-box modal-box--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__head">
          <span className={`confirm-dialog__icon confirm-dialog__icon--${tone}`} aria-hidden="true">
            <IcoWarning />
          </span>
          <h3 className="confirm-dialog__title" id="confirm-dialog-title">
            {title}
          </h3>
        </div>

        <p className="confirm-dialog__message" id="confirm-dialog-message">
          {message}
        </p>

        <div className="confirm-dialog__actions">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>
            <IcoX /> {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            disabled={busy}
            onClick={onConfirm}
          >
            <IcoCheck /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
