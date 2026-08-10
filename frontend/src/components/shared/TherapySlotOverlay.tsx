import type { TherapySlot } from '../../types';
import { IcoPill } from '../../icons';

/** Card della fascia terapia sovrapposta alla vista giornaliera dell'agenda. */
export function TherapySlotCard({ slot, onClick }: { slot: TherapySlot; onClick: () => void }) {
  const { administered, notAdministered, pending, total } = slot.summary;
  const allDone = total > 0 && administered === total;
  return (
    <div
      className={`agt-therapy-slot${allDone ? ' agt-therapy-slot--completed' : ''}`}
      onClick={onClick}
    >
      <span className="agt-therapy-slot__icon">
        <IcoPill />
      </span>
      <span className="agt-therapy-slot__label">
        {slot.label} <span className="agt-therapy-slot__ora">· {slot.ora}</span>
      </span>
      <span className="agt-therapy-slot__count">
        {administered}/{total} erogate
      </span>
      <span className="agt-therapy-slot__progress">
        {notAdministered > 0 ? `${notAdministered} non erogate` : ''}
        {notAdministered > 0 && pending > 0 ? ' · ' : ''}
        {pending > 0 ? `${pending} da erogare` : ''}
      </span>
    </div>
  );
}

/** Versione compatta della stessa fascia per le celle della vista settimanale. */
export function TherapySlotDot({ slot, onClick }: { slot: TherapySlot; onClick: () => void }) {
  const { administered, notAdministered, pending, total } = slot.summary;
  const allDone = total > 0 && administered === total;
  const parts = [`${administered}/${total} erogate`];
  if (notAdministered > 0) parts.push(`${notAdministered} non erogate`);
  if (pending > 0) parts.push(`${pending} da erogare`);
  return (
    <div
      className={`agt-week-therapy-dot${allDone ? ' done' : ''}`}
      title={`${slot.label} · ${slot.ora}: ${parts.join(' · ')}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <IcoPill />
    </div>
  );
}
