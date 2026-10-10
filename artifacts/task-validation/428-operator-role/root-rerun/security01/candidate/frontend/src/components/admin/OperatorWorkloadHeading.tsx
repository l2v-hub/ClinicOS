import type { Operatore } from '../../types';
import { IcoUser } from '../../icons';
import { operatorProfileLabel } from '../../lib/operatorRolePresentation';

export function OperatorWorkloadHeading({ op }: { op: Operatore }) {
  return (
    <div className="op-workload-card__header">
      <span className="dashboard-person-icon" style={{ color: op.colore }} aria-hidden="true">
        <IcoUser />
      </span>
      <div className="op-workload-card__info">
        <span className="op-workload-card__name">
          {op.cognome} {op.nome}
        </span>
        <span className="op-workload-card__role">{operatorProfileLabel(op)}</span>
        <span className="op-workload-card__role">{op.reparto}</span>
      </div>
      <span className={`stato-pill stato-pill--${op.stato}`}>{op.stato}</span>
    </div>
  );
}
