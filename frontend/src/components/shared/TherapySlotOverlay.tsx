import type { TherapySlot } from '../../types';
import { IcoPill } from '../../icons';

/** Card della fascia terapia sovrapposta alla vista giornaliera dell'agenda. */
export function TherapySlotCard({ slot, onClick }: { slot: TherapySlot; onClick: () => void }) {
  const { administered, notAdministered, pending, total } = slot.summary;
  const allDone = total > 0 && administered === total;
  const ariaSummary = [
    pending > 0 ? `${pending} da erogare` : null,
    notAdministered > 0
      ? `${notAdministered} ${notAdministered === 1 ? 'non erogata' : 'non erogate'}`
      : null,
    allDone ? 'completata' : null,
    total === 0 ? 'nessuna somministrazione' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      className={`agt-therapy-slot${allDone ? ' agt-therapy-slot--completed' : ''}`}
      onClick={onClick}
      aria-label={`${slot.label}, ore ${slot.ora}${ariaSummary ? `, ${ariaSummary}` : ''}. Apri dettaglio`}
    >
      <span className="agt-therapy-slot__icon" aria-hidden="true">
        <IcoPill />
      </span>
      <span className="agt-therapy-slot__label">
        {slot.label} <span className="agt-therapy-slot__ora">· {slot.ora}</span>
      </span>
      <span className="agt-therapy-slot__summary" aria-hidden="true">
        {pending > 0 && (
          <strong className="agt-therapy-slot__status agt-therapy-slot__status--pending">
            {pending} da erogare
          </strong>
        )}
        {notAdministered > 0 && (
          <strong className="agt-therapy-slot__status agt-therapy-slot__status--missed">
            {notAdministered} {notAdministered === 1 ? 'non erogata' : 'non erogate'}
          </strong>
        )}
        {allDone && (
          <strong className="agt-therapy-slot__status agt-therapy-slot__status--completed">
            Completate {administered}/{total}
          </strong>
        )}
        {total === 0 && <span className="agt-therapy-slot__empty">Nessuna somministrazione</span>}
      </span>
    </button>
  );
}

/** Versione compatta della stessa fascia per le celle della vista settimanale. */
export function TherapySlotDot({ slot, onClick }: { slot: TherapySlot; onClick: () => void }) {
  const { administered, notAdministered, pending, total } = slot.summary;
  const allDone = total > 0 && administered === total;
  const parts = [`${administered}/${total} erogate`];
  if (notAdministered > 0) parts.push(`${notAdministered} non erogate`);
  if (pending > 0) parts.push(`${pending} da erogare`);
  const ariaLabel = `${slot.label}, ore ${slot.ora}. ${parts.join('. ')}. Apri dettaglio`;
  return (
    <button
      type="button"
      className={`agt-week-therapy-dot${allDone ? ' done' : ''}`}
      title={`${slot.label} · ${slot.ora}: ${parts.join(' · ')}`}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IcoPill />
    </button>
  );
}
