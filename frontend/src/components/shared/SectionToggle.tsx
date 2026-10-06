interface SectionToggleProps {
  title: string;
  open: boolean;
  bodyId: string;
  onToggle: () => void;
}

/** Shared compact control for clinical and imported narrative sections. */
export function SectionToggle({ title, open, bodyId, onToggle }: SectionToggleProps) {
  return (
    <button
      type="button"
      className="ds-icon-btn"
      aria-label={`${open ? 'Comprimi' : 'Espandi'} ${title}`}
      aria-expanded={open}
      aria-controls={bodyId}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <span aria-hidden="true">{open ? '▾' : '▸'}</span>
    </button>
  );
}
