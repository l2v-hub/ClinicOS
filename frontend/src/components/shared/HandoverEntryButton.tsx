import { IcoConsegne } from '../../icons';
import './HandoverEntryButton.css';

export function HandoverEntryButton({
  count,
  state,
  onOpen,
}: {
  count: number | null;
  state: 'loading' | 'ready' | 'error';
  onOpen: () => void;
}) {
  const description =
    count === null
      ? state === 'error'
        ? 'conteggio non disponibile'
        : 'conteggio in aggiornamento'
      : `${count} ${count === 1 ? 'consegna critica' : 'consegne critiche'} da prendere in carico`;
  return (
    <button
      type="button"
      className={`topbar-search topbar-handovers${count ? ' has-critical' : ''}`}
      title={`Consegne · ${description}`}
      aria-label={`Apri consegne: ${description}`}
      onClick={onOpen}
    >
      <IcoConsegne />
      {(count === null || count > 0) && (
        <span className="topbar-handovers__badge" aria-hidden="true">
          {count === null ? (state === 'error' ? '?' : '…') : count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
