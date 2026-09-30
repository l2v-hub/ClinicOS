import { useMemo, useState } from 'react';
import type { PolicyDocument, PolicyIdentity } from '../../../lib/authzPolicyApi';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { identityRole, legacyRoleIdFor, roleLabel } from './rolePermissionsModel';

interface IdentitiesViewProps {
  identities: PolicyIdentity[];
  draft: PolicyDocument;
  changedIdentities: Set<string>;
  onAssign: (operatorId: string, roleId: string | null) => void;
}

export function IdentitiesView({
  identities,
  draft,
  changedIdentities,
  onAssign,
}: IdentitiesViewProps) {
  const [text, setText] = useState('');
  const [onlySimulated, setOnlySimulated] = useState(false);
  const rows = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return identities
      .filter((identity) => !onlySimulated || identity.simulated)
      .filter(
        (identity) =>
          !needle ||
          identity.name.toLowerCase().includes(needle) ||
          identity.id.toLowerCase().includes(needle) ||
          identity.ruolo.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [identities, text, onlySimulated]);

  return (
    <ClinicalCard title={`Identità (${identities.length})`}>
      <div className="rp-filters" role="search" aria-label="Filtra identità">
        <label className="rp-filters__field rp-filters__field--grow">
          <span className="rp-filters__label">Cerca</span>
          <input
            type="search"
            className="form-input"
            placeholder="Nome, codice o qualifica"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className="rp-filters__chips">
          <button
            type="button"
            className="ds-chip"
            aria-pressed={onlySimulated}
            onClick={() => setOnlySimulated((value) => !value)}
          >
            Solo simulate
          </button>
        </div>
        <span className="rp-filters__count" aria-live="polite">
          {rows.length} di {identities.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="cr-empty">Nessuna identità.</p>
      ) : (
        <div className="clinicos-table-wrap">
          <table className="clinicos-table rp-list-table">
            <thead>
              <tr>
                <th scope="col">Identità</th>
                <th scope="col">Qualifica</th>
                <th scope="col">Ruolo storico</th>
                <th scope="col">Stato</th>
                <th scope="col">Ruolo assegnato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((identity) => {
                const resolved = identityRole(draft, identity);
                const assigned = draft.assignments[identity.id] ?? '';
                const fallback = roleLabel(draft.roles, legacyRoleIdFor(identity.legacyRole));
                const changed = changedIdentities.has(identity.id);
                return (
                  <tr key={identity.id}>
                    <th scope="row" className="rp-matrix__cap">
                      <span className="rp-cap-name">{identity.name}</span>
                      <span className="rp-cap-id">{identity.id}</span>
                      {identity.simulated && (
                        <span className="rp-tags">
                          <span className="rp-tag rp-tag--sim">Simulata</span>
                        </span>
                      )}
                    </th>
                    <td>{identity.ruolo || '—'}</td>
                    <td>{identity.legacyRole}</td>
                    <td>
                      <span className={`rp-tag${identity.active ? ' rp-tag--active' : ''}`}>
                        {identity.active ? 'Attiva' : 'Disattivata'}
                      </span>
                    </td>
                    <td>
                      <div className="rp-assign">
                        <select
                          className={`form-select rp-assign__select${changed ? ' rp-assign__select--changed' : ''}`}
                          value={assigned}
                          aria-label={`Ruolo di ${identity.name}`}
                          onChange={(event) => onAssign(identity.id, event.target.value || null)}
                        >
                          <option value="">Legacy: {fallback}</option>
                          {draft.roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {resolved.source === 'legacy' && (
                          <span className="rp-muted">
                            legacy: {identity.legacyRole} →{' '}
                            {roleLabel(draft.roles, resolved.roleId)}
                          </span>
                        )}
                        {changed && <span className="rp-count rp-count--changed">modificata</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ClinicalCard>
  );
}
