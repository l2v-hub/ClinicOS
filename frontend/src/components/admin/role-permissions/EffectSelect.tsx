import { memo } from 'react';
import type { CapabilityType, Effect } from '../../../lib/authzPolicyApi';
import { EFFECT_LABEL, EFFECT_OPTIONS } from './rolePermissionsModel';

interface EffectSelectProps {
  roleId: string;
  capabilityId: string;
  value: Effect;
  type: CapabilityType;
  changed: boolean;
  /** Nome accessibile: ruolo + capability. */
  label: string;
  onChange: (roleId: string, capabilityId: string, effect: Effect) => void;
}

/** Selettore compatto dell'effetto per una cella ruolo × capability (colore = effetto). */
export const EffectSelect = memo(function EffectSelect({
  roleId,
  capabilityId,
  value,
  type,
  changed,
  label,
  onChange,
}: EffectSelectProps) {
  const readOnlyOnWrite = value === 'READ_ONLY' && type !== 'read';
  return (
    <select
      className={`rp-effect rp-effect--${value}${changed ? ' rp-effect--changed' : ''}${readOnlyOnWrite ? ' rp-effect--inert' : ''}`}
      value={value}
      aria-label={label}
      title={
        readOnlyOnWrite
          ? 'Sola lettura su una capability non di lettura: equivale a negato'
          : EFFECT_LABEL[value]
      }
      onChange={(event) => onChange(roleId, capabilityId, event.target.value as Effect)}
    >
      {EFFECT_OPTIONS.map((effect) => (
        <option key={effect} value={effect}>
          {effect === 'READ_ONLY' && type !== 'read'
            ? `${EFFECT_LABEL[effect]} (= negato)`
            : EFFECT_LABEL[effect]}
        </option>
      ))}
    </select>
  );
});

export function EffectBadge({ effect }: { effect: Effect | null }) {
  if (!effect) return <span className="rp-effect-badge rp-effect-badge--none">—</span>;
  return (
    <span className={`rp-effect-badge rp-effect-badge--${effect}`}>{EFFECT_LABEL[effect]}</span>
  );
}
