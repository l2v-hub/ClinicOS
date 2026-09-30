import { memo, useState } from 'react';
import type {
  Effect,
  PolicyCapability,
  PolicyDocument,
  RoleDefinition,
} from '../../../lib/authzPolicyApi';
import { EffectSelect } from './EffectSelect';
import { CapabilityTags, DoubtMarker } from './CapabilityTags';
import { cellKey, effectOf, type DomainGroup } from './rolePermissionsModel';

interface MatrixViewProps {
  groups: DomainGroup[];
  roles: RoleDefinition[];
  draft: PolicyDocument;
  review: Record<string, string>;
  changedCells: Set<string>;
  /** Con filtri attivi i gruppi partono aperti, altrimenti chiusi. */
  filtering: boolean;
  onChange: (roleId: string, capabilityId: string, effect: Effect) => void;
}

/** Firma di riga: effetto + flag modificato per ruolo. Tiene il memo della riga economico. */
function rowSignature(
  roles: RoleDefinition[],
  draft: PolicyDocument,
  capabilityId: string,
  changedCells: Set<string>,
): string {
  return roles
    .map(
      (role) =>
        `${effectOf(draft, role.id, capabilityId)}${changedCells.has(cellKey(role.id, capabilityId)) ? '*' : ''}`,
    )
    .join('|');
}

export function MatrixView({
  groups,
  roles,
  draft,
  review,
  changedCells,
  filtering,
  onChange,
}: MatrixViewProps) {
  // I gruppi "invertiti" rispetto allo stato di partenza valgono solo per la modalità in cui sono
  // stati scelti (con o senza filtri): cambiare modalità riparte pulito senza effetti.
  const [toggled, setToggled] = useState<{ filtering: boolean; domains: Set<string> }>({
    filtering,
    domains: new Set(),
  });
  const toggledDomains = toggled.filtering === filtering ? toggled.domains : new Set<string>();
  const isOpen = (domain: string) =>
    filtering ? !toggledDomains.has(domain) : toggledDomains.has(domain);

  function toggle(domain: string) {
    const next = new Set(toggledDomains);
    if (next.has(domain)) next.delete(domain);
    else next.add(domain);
    setToggled({ filtering, domains: next });
  }

  function setAll(open: boolean) {
    const domains = new Set(filtering === open ? [] : groups.map((group) => group.domain));
    setToggled({ filtering, domains });
  }

  if (groups.length === 0) {
    return <p className="cr-empty">Nessuna capability corrisponde ai filtri.</p>;
  }

  return (
    <div className="rp-matrix">
      <div className="rp-matrix__tools">
        <button type="button" className="btn-secondary" onClick={() => setAll(true)}>
          Espandi tutti
        </button>
        <button type="button" className="btn-secondary" onClick={() => setAll(false)}>
          Comprimi tutti
        </button>
      </div>
      <div className="clinicos-table-wrap rp-matrix__wrap">
        <table className="clinicos-table rp-matrix__table">
          <thead>
            <tr>
              <th scope="col" className="rp-matrix__cap-col">
                Capability
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  scope="col"
                  className={`rp-matrix__role-col${role.legacy ? ' rp-col--legacy' : ''}`}
                  title={role.description}
                >
                  <span className="rp-matrix__role-label">{role.label}</span>
                  {role.legacy && <span className="rp-legacy-tag">legacy</span>}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => {
            const open = isOpen(group.domain);
            const changed = group.capabilities.filter((cap) =>
              roles.some((role) => changedCells.has(cellKey(role.id, cap.id))),
            ).length;
            const doubtful = group.capabilities.filter((cap) =>
              roles.some((role) => review[cellKey(role.id, cap.id)]),
            ).length;
            return (
              <tbody key={group.domain} className="rp-matrix__group">
                <tr className="rp-group-row">
                  <th scope="rowgroup" colSpan={roles.length + 1}>
                    <button
                      type="button"
                      className="rp-group-toggle"
                      aria-expanded={open}
                      onClick={() => toggle(group.domain)}
                    >
                      <span
                        className={`rp-chevron${open ? ' rp-chevron--open' : ''}`}
                        aria-hidden="true"
                      />
                      <span className="rp-group-toggle__label">{group.label}</span>
                      <span className="rp-count">{group.capabilities.length}</span>
                      {doubtful > 0 && (
                        <span className="rp-count rp-count--doubt">{doubtful} dubbie</span>
                      )}
                      {changed > 0 && (
                        <span className="rp-count rp-count--changed">{changed} modificate</span>
                      )}
                    </button>
                  </th>
                </tr>
                {open &&
                  group.capabilities.map((cap) => (
                    <MatrixRow
                      key={cap.id}
                      cap={cap}
                      roles={roles}
                      signature={rowSignature(roles, draft, cap.id, changedCells)}
                      review={review}
                      onChange={onChange}
                    />
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}

interface MatrixRowProps {
  cap: PolicyCapability;
  roles: RoleDefinition[];
  signature: string;
  review: Record<string, string>;
  onChange: (roleId: string, capabilityId: string, effect: Effect) => void;
}

const MatrixRow = memo(function MatrixRow({
  cap,
  roles,
  signature,
  review,
  onChange,
}: MatrixRowProps) {
  const cells = signature.split('|');
  return (
    <tr>
      <th scope="row" className="rp-matrix__cap">
        <span className="rp-cap-name">{cap.name}</span>
        <span className="rp-cap-id">{cap.id}</span>
        <CapabilityTags cap={cap} />
      </th>
      {roles.map((role, index) => {
        const raw = cells[index] ?? '';
        const changed = raw.endsWith('*');
        const effect = (changed ? raw.slice(0, -1) : raw) as Effect;
        const note = review[cellKey(role.id, cap.id)];
        return (
          <td key={role.id} className={`rp-matrix__cell${role.legacy ? ' rp-col--legacy' : ''}`}>
            <span className="rp-cell">
              <EffectSelect
                roleId={role.id}
                capabilityId={cap.id}
                value={effect}
                type={cap.type}
                changed={changed}
                label={`${role.label} – ${cap.name}`}
                onChange={onChange}
              />
              {note && <DoubtMarker note={note} />}
            </span>
          </td>
        );
      })}
    </tr>
  );
});

