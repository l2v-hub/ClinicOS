import { IcoAI } from '../../../icons';

/** Etichetta "AI" accanto all'etichetta di un campo scritto dall'AI (ds-badge, tinta AI). */
export function AiBadge({ title = 'Valore letto dall’AI dai documenti' }: { title?: string }) {
  return (
    <span className="ds-badge ds-badge--ai intake-ai-badge" data-testid="intake-ai-badge">
      <span className="intake-ai-badge__icon" aria-hidden="true">
        <IcoAI />
      </span>
      <span className="ds-badge__text" aria-hidden="true">
        AI
      </span>
      <span className="ds-sr-only">{title}</span>
    </span>
  );
}
