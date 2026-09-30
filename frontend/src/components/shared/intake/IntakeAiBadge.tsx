import { useContext } from 'react';
import { IcoAI } from '../../../icons';
import { IntakeAiSourceContext } from './intakeAiOrigin';
import { AI_CHIP_TITLE, originChip, readFieldOrigin } from './intakeDocumentPages';

/**
 * Etichetta accanto all'etichetta di un campo scritto dall'AI (ds-badge, tinta AI). Con la lettera
 * di origine nota ("L1", "L1 + L2", "L1 · p. 2") è un pulsante che apre il documento a fianco;
 * altrimenti resta l'etichetta "AI".
 */
export function AiBadge({ paths = [] }: { paths?: readonly string[] }) {
  const source = useContext(IntakeAiSourceContext);
  const chip = originChip(
    source.job,
    paths.map((path) => readFieldOrigin(source.data, path)),
  );
  const content = (
    <>
      <span className="intake-ai-badge__icon" aria-hidden="true">
        <IcoAI />
      </span>
      <span className="ds-badge__text" aria-hidden="true">
        {chip.label}
      </span>
    </>
  );
  const open = source.open;
  const target = chip.target;
  if (!open || !target)
    return (
      <span
        className="ds-badge ds-badge--ai intake-ai-badge"
        data-testid="intake-ai-badge"
        data-ai-source={chip.label}
      >
        {content}
        <span className="ds-sr-only">{AI_CHIP_TITLE}</span>
      </span>
    );
  return (
    <button
      type="button"
      className="ds-badge ds-badge--ai intake-ai-badge"
      data-testid="intake-ai-badge"
      data-ai-source={chip.label}
      aria-label={chip.ariaLabel}
      onClick={(event) => open(target, event.currentTarget)}
    >
      {content}
    </button>
  );
}
