import type {
  DerivedCapability,
  Effect,
  PolicyCapability,
  PolicyDocument,
} from '../../../lib/authzPolicyApi';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { EffectSelect } from './EffectSelect';
import { CapabilityTags, DoubtMarker } from './CapabilityTags';
import {
  SENSITIVITY_LABEL,
  TYPE_LABEL,
  cellKey,
  domainLabel,
  effectOf,
  followersOf,
  isEffectivelyAllowed,
  type DomainGroup,
} from './rolePermissionsModel';

interface CapabilityViewProps {
  capabilityId: string | null;
  onCapabilityChange: (capabilityId: string) => void;
  groups: DomainGroup[];
  capabilities: PolicyCapability[];
  derived: DerivedCapability[];
  draft: PolicyDocument;
  review: Record<string, string>;
  changedCells: Set<string>;
  onChange: (roleId: string, capabilityId: string, effect: Effect) => void;
}

export function CapabilityView({
  capabilityId,
  onCapabilityChange,
  groups,
  capabilities,
  derived,
  draft,
  review,
  changedCells,
  onChange,
}: CapabilityViewProps) {
  const visible = groups.flatMap((group) => group.capabilities);
  const cap =
    capabilities.find((item) => item.id === capabilityId) ?? visible[0] ?? capabilities[0] ?? null;
  const followers = cap ? followersOf(cap.id, derived) : [];

  return (
    <div className="rp-stack">
      <label className="rp-filters__field rp-capability-picker">
        <span className="rp-filters__label">Capability</span>
        <select
          className="form-select"
          value={cap?.id ?? ''}
          onChange={(event) => onCapabilityChange(event.target.value)}
        >
          {cap && !visible.some((item) => item.id === cap.id) && (
            <option value={cap.id}>{cap.name} (fuori dai filtri)</option>
          )}
          {groups.map((group) => (
            <optgroup key={group.domain} label={group.label}>
              {group.capabilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {!cap ? (
        <p className="cr-empty">Nessuna capability.</p>
      ) : (
        <>
          <ClinicalCard title={cap.name}>
            <div className="rp-role-summary">
              <CapabilityTags cap={cap} />
              <dl className="rp-facts">
                <div>
                  <dt>Codice</dt>
                  <dd className="rp-mono">{cap.id}</dd>
                </div>
                <div>
                  <dt>Dominio</dt>
                  <dd>{domainLabel(cap.domain)}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{TYPE_LABEL[cap.type]}</dd>
                </div>
                <div>
                  <dt>Sensibilità</dt>
                  <dd>{SENSITIVITY_LABEL[cap.sensitivity]}</dd>
                </div>
                <div>
                  <dt>Esposizione</dt>
                  <dd>{cap.exposure}</dd>
                </div>
                <div>
                  <dt>Ruoli legacy</dt>
                  <dd>{cap.legacyRoles.length ? cap.legacyRoles.join(', ') : 'tutti'}</dd>
                </div>
              </dl>
            </div>
          </ClinicalCard>

          <ClinicalCard title="Effetto per ruolo">
            <div className="clinicos-table-wrap">
              <table className="clinicos-table rp-list-table">
                <thead>
                  <tr>
                    <th scope="col">Ruolo</th>
                    <th scope="col">Effetto</th>
                    <th scope="col">Esito</th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.roles.map((role) => {
                    const key = cellKey(role.id, cap.id);
                    const effect = effectOf(draft, role.id, cap.id);
                    const allowed = isEffectivelyAllowed(effect, cap.type);
                    const note = review[key];
                    return (
                      <tr key={role.id} className={role.legacy ? 'rp-row--legacy' : undefined}>
                        <th scope="row" className="rp-matrix__cap">
                          <span className="rp-cap-name">{role.label}</span>
                          {role.legacy && <span className="rp-legacy-tag">legacy</span>}
                        </th>
                        <td>
                          <EffectSelect
                            roleId={role.id}
                            capabilityId={cap.id}
                            value={effect}
                            type={cap.type}
                            changed={changedCells.has(key)}
                            label={`${role.label} – ${cap.name}`}
                            onChange={onChange}
                          />
                        </td>
                        <td>
                          <span className={`rp-outcome rp-outcome--${allowed ? 'yes' : 'no'}`}>
                            {allowed
                              ? effect === 'ALLOWED_WITH_CONFIRMATION'
                                ? 'Consentito, chiede conferma'
                                : 'Consentito'
                              : 'Non consentito'}
                          </span>
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

          <ClinicalCard title={`Capability derivate che la seguono (${followers.length})`}>
            {followers.length === 0 ? (
              <p className="cr-empty">
                Nessuna capability derivata: nessun canale (es. azioni Agnos) segue questa voce.
              </p>
            ) : (
              <ul className="rp-derived-list">
                {followers.map((item) => (
                  <li key={item.id}>
                    <span className="rp-cap-name">{item.name}</span>
                    <span className="rp-cap-id">{item.id}</span>
                    <span className="rp-tag">{domainLabel(item.domain)}</span>
                  </li>
                ))}
              </ul>
            )}
          </ClinicalCard>
        </>
      )}
    </div>
  );
}
