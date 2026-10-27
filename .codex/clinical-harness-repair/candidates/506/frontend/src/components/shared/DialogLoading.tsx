import { AccessibleDialogSurface } from './AccessibleDialogSurface';
import { useId } from 'react';

export function DialogLoading({ onClose, presentation }: {
  onClose: () => void;
  presentation?: 'dialog' | 'page';
}) {
  const titleId = useId();
  return (
    <AccessibleDialogSurface labelledBy={titleId} onClose={onClose} presentation={presentation}>
      <h2 id={titleId}>Apertura modulo…</h2>
      <p role="status">Caricamento in corso.</p>
      <button type="button" className="btn-secondary" data-dialog-initial-focus onClick={onClose}>
        Annulla
      </button>
    </AccessibleDialogSurface>
  );
}
