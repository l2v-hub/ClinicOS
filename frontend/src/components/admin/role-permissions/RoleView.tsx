import { useMemo } from 'react';
import type {
  Effect,
  PolicyCapability,
  PolicyDocument,
  PolicyIdentity,
} from '../../../lib/authzPolicyApi';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { EffectSelect } from './EffectSelect';
import { CapabilityTags, DoubtMarker } from './CapabilityTags';
import {
  EFFECT_LABEL,
  EFFECT_OPTIONS,
  cellKey,
  effectCounts,
  effectOf,
  identitiesOfRole,
  type DomainGroup,
} from './rolePermissionsModel';

interface RoleViewProps {
  roleId: string;
  onRoleChange: (roleId: string) => void;
  draft: PolicyDocument;
  groups: DomainGroup[];
  allCapabilities: PolicyCapability[];
  identities: PolicyIdentity[];
  review: Record<string, string>;
  changedCells: Set<string>;
  filtering: boolean;
  onChange: (roleId: string, capabilityId: string, effect: Effect) => void;
}

export function RoleView({
  roleId,
  onRoleChange,
  draft,
  groups,
  allCapabilities,
  identities,
  review,
  changedCells,
  filtering,
  onChange,
}: RoleViewProps) {
  const role = draft.roles.find((item) => item.id === roleId) ?? draft.roles[0];
  const counts = useMemo(
    () => (role ? effectCounts(draft, role.id, allCapabilities) : null),
    [draft, role, allCapabilities],
  );
  const members = useMemo(
    () => (role ? identitiesOfRole(draft, identities, role.id) : []),
    [draft, identities, role],
  );
  if (!role || !counts) return <p className="cr-empty">Nessun ruolo definito.</p>;

  return (
    <div className="rp-stack">
      <div className="ds-chip-group rp-picker" role="group" aria-label="Scegli il ruolo">
        {draft.roles.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ds-chip"
            aria-pressed={item.id === role.id}
            onClick={() => onRoleChange(item.id)}
          >
            {item.label}
            {item.legacy && <span className="rp-legacy-tag">legacy</span>}
          </button>
        ))}
      </div>

      <ClinicalCard title={`Ruolo: ${role.label}`}>
        <div className="rp-role-summary">
          <p className="rp-role-summary__desc">{role.description || 'Nessuna descrizione.'}</p>
          <dl className="rp-facts">
            <div>
              <dt>Codice</dt>
              <dd className="rp-mono">{role.id}</dd>
            </div>
            <div>
              <dt>Interfaccia</dt>
              <dd>{role.uiShell === 'admin' ? 'Amministrazione' : 'Operatore'}</dd>
            </div>
            <div>
              <dt>Ambito dati (legacy)</dt>
              <dd>{role.legacyRole}</dd>
            </div>
            {EFFECT_OPTIONS.map((effect) => (
              <div key={effect}>
                <dt>{EFFECT_LABEL[effect]}</dt>
                <dd>
                  <span className={`rp-effect-badge rp-effect-badge--${effect}`}>
                    {counts[effect]}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <h4 className="rp-subtitle">Identità con questo ruolo ({members.length})</h4>
            {members.length === 0 ? (
              <p className="cr-empty">Nessuna identità.</p>
            ) : (
              <ul className="rp-identity-list">
                {members.map(({ identity, source }) => (
                  <li key={identity.id}>
                    <span>{identity.name}</span>
                    {source === 'legacy' && <span className="rp-tag">ripiego legacy</span>}
                    {identity.simulated && <span className="rp-tag rp-tag--sim">simulata</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ClinicalCard>

      {groups.length === 0 ? (
        <p className="cr-empty">Nessuna capability corrisponde ai filtri.</p>
      ) : (
        groups.map((group) => (
          <ClinicalCard
            key={`${group.domain}-${filtering ? 'f' : 'n'}`}
            title={`${group.label} (${group.capabilities.length})`}
            defaultExpanded={filtering}
          >
            <div className="clinicos-table-wrap">
              <table className="clinicos-table rp-list-table">
                <thead>
                  <tr>
                    <th scope="col">Capability</th>
                    <th scope="col">Effetto</th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {group.capabilities.map((cap) => {
                    const key = cellKey(role.id, cap.id);
                    const note = review[key];
                    return (
                      <tr key={cap.id}>
                        <th scope="row" className="rp-matrix__cap">
                          <span className="rp-cap-name">{cap.name}</span>
                          <span className="rp-cap-id">{cap.id}</span>
                          <CapabilityTags cap={cap} />
                        </th>
                        <td>
                          <EffectSelect
                            roleId={role.id}
                            capabilityId={cap.id}
                            value={effectOf(draft, role.id, cap.id)}
                            type={cap.type}
                            changed={changedCells.has(key)}
                            label={`${role.label} – ${cap.name}`}
                            onChange={onChange}
                          />
                        </td>
                        <td>
                          {note ? (
                            <span className="rp-note">
                              <DoubtMarker note={note} /> {note}
                            </span>
                          ) : (
                            <span className="rp-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ClinicalCard>
        ))
      )}
    </div>
  );
}
