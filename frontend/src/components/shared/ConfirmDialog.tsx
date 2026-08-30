import { useId, type ReactNode } from 'react';
import { IcoWarning, IcoX, IcoCheck } from '../../icons';
import { AccessibleDialogSurface } from './AccessibleDialogSurface';

interface Props {
  /** Render nothing when false. */
  open: boolean;
  title: string;
  /** Body text (or rich node) explaining the consequence. */
  message: ReactNode;
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
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const messageId = `${dialogId}-message`;

  if (!open) return null;

  return (
    <AccessibleDialogSurface
      labelledBy={titleId}
      describedBy={messageId}
      onClose={onCancel}
      className="modal-box--confirm"
      dismissible={!busy}
      dialogRole="alertdialog"
    >
      <div className="confirm-dialog__head">
        <span className={`confirm-dialog__icon confirm-dialog__icon--${tone}`} aria-hidden="true">
          <IcoWarning />
        </span>
        <h3 className="confirm-dialog__title" id={titleId}>
          {title}
        </h3>
      </div>

      <p className="confirm-dialog__message" id={messageId}>
        {message}
      </p>

      <div className="confirm-dialog__actions">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>
          <IcoX /> {cancelLabel}
        </button>
        <button
          type="button"
          data-dialog-initial-focus
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
          disabled={busy}
          onClick={onConfirm}
        >
          <IcoCheck /> {confirmLabel}
        </button>
      </div>
    </AccessibleDialogSurface>
  );
}
