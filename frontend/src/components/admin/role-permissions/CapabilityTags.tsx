import type { PolicyCapability } from '../../../lib/authzPolicyApi';
import { SENSITIVITY_LABEL, TYPE_LABEL } from './rolePermissionsModel';

/** Etichette compatte: tipo, sensibilità (alta/critica evidenziate in ambra), tool Agnos. */
export function CapabilityTags({ cap }: { cap: PolicyCapability }) {
  return (
    <span className="rp-tags">
      <span className={`rp-tag rp-tag--${cap.type}`}>{TYPE_LABEL[cap.type]}</span>
      <span className={`rp-tag rp-tag--sens-${cap.sensitivity}`}>
        {SENSITIVITY_LABEL[cap.sensitivity]}
      </span>
      {cap.tool && (
        <span className="rp-tag rp-tag--tool" title="Esposta come tool ad Agnos">
          Tool Agnos
        </span>
      )}
    </span>
  );
}

/** Marcatore di cella dubbia: la nota è nel tooltip e nel nome accessibile. */
export function DoubtMarker({ note }: { note: string }) {
  return (
    <span
      className="rp-doubt"
      role="img"
      tabIndex={0}
      title={note}
      aria-label={`Da verificare: ${note}`}
    >
      ?
    </span>
  );
}
