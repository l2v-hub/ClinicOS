export function WidgetToggle({
  title,
  open,
  bodyId,
  onToggle,
}: {
  title: string;
  open: boolean;
  bodyId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="ds-link widget-toggle"
      aria-expanded={open}
      aria-controls={bodyId}
      aria-label={`${open ? 'Chiudi' : 'Apri'} ${title}`}
      onClick={onToggle}
    >
      {open ? '▴' : '▾'}
    </button>
  );
}
