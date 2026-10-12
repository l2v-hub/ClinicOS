// In cima al Turno (#445): solo ciò su cui si agisce, come pulsanti che portano al punto esatto.
// Niente contatori a zero né spiegazioni; un dato che non è arrivato si dice, non si tace.
import type { TurnoActionChip } from '../../lib/turnoChips';

export function TurnoActionChips({ chips }: { chips: TurnoActionChip[] }) {
  if (chips.length === 0) return null;
  return (
    <ul className="turno-action-chips" aria-label="Da fare subito">
      {chips.map((chip) => (
        <li key={chip.id}>
          {chip.onOpen ? (
            <button
              type="button"
              className={`turno-action-chip turno-action-chip--${chip.tone}`}
              onClick={chip.onOpen}
            >
              {chip.label}
            </button>
          ) : (
            <span className={`turno-action-chip turno-action-chip--${chip.tone}`} role="status">
              {chip.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
