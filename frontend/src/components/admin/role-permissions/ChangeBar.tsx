interface ChangeBarProps {
  grants: number;
  assignments: number;
  note: string;
  onNoteChange: (note: string) => void;
  busy: boolean;
  impactLoading: boolean;
  onPreview: () => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
  onSaveApply: () => void;
}

/** Barra fissa delle modifiche in sospeso sulla bozza locale. */
export function ChangeBar({
  grants,
  assignments,
  note,
  onNoteChange,
  busy,
  impactLoading,
  onPreview,
  onDiscard,
  onSaveDraft,
  onSaveApply,
}: ChangeBarProps) {
  const total = grants + assignments;
  return (
    <div className="rp-changebar" role="region" aria-label="Modifiche in sospeso">
      <div className="rp-changebar__count" aria-live="polite">
        <strong>{total}</strong> {total === 1 ? 'modifica in sospeso' : 'modifiche in sospeso'}
        <span className="rp-muted">
          {grants} permessi · {assignments} assegnazioni
        </span>
      </div>
      <label className="rp-changebar__note">
        <span className="ds-sr-only">Nota della versione</span>
        <input
          type="text"
          className="form-input"
          placeholder="Nota (motivo della modifica)"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </label>
      <div className="rp-changebar__actions">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onDiscard}>
          Annulla modifiche
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || impactLoading}
          onClick={onPreview}
        >
          {impactLoading ? 'Calcolo…' : 'Anteprima impatto'}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onSaveDraft}>
          Salva bozza
        </button>
        <button type="button" className="btn-primary" disabled={busy} onClick={onSaveApply}>
          Salva e applica
        </button>
      </div>
    </div>
  );
}
