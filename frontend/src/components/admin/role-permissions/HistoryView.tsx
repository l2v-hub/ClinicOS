import { useState } from 'react';
import type { PolicyVersion, RoleDefinition } from '../../../lib/authzPolicyApi';
import { EffectBadge } from './EffectSelect';
import { roleLabel } from './rolePermissionsModel';

interface HistoryViewProps {
  versions: PolicyVersion[];
  error: string | null;
  activeVersion: number;
  roles: RoleDefinition[];
  capabilityName: (id: string) => string;
  identityName: (id: string) => string;
  busy: boolean;
  onApplyDraft: (version: PolicyVersion) => void;
}

const STATUS: Record<PolicyVersion['status'], { label: string; tone: string }> = {
  active: { label: 'Attiva', tone: 'ds-badge--ok' },
  draft: { label: 'Bozza', tone: 'ds-badge--warning' },
  superseded: { label: 'Sostituita', tone: '' },
};

const PAGE = 60;

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export function HistoryView({
  versions,
  error,
  activeVersion,
  roles,
  capabilityName,
  identityName,
  busy,
  onApplyDraft,
}: HistoryViewProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);

  if (error) return <p className="rp-banner rp-banner--warning">{error}</p>;
  if (versions.length === 0) {
    return (
      <p className="cr-empty">
        Nessuna versione salvata: è attiva la configurazione iniziale (versione 0).
      </p>
    );
  }

  return (
    <ul className="rp-history">
      {versions.map((version) => {
        const expanded = open === version.version;
        const summary = version.changeSummary;
        const status = STATUS[version.status] ?? { label: version.status, tone: '' };
        const stale = version.status === 'draft' && version.basedOnVersion !== activeVersion;
        const panelId = `rp-version-${version.version}`;
        return (
          <li key={version.version} className={`rp-history__item${expanded ? ' is-open' : ''}`}>
            <div className="rp-history__head">
              <button
                type="button"
                className="rp-group-toggle rp-history__toggle"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => {
                  setOpen(expanded ? null : version.version);
                  setLimit(PAGE);
                }}
              >
                <span
                  className={`rp-chevron${expanded ? ' rp-chevron--open' : ''}`}
                  aria-hidden="true"
                />
                <span className="rp-history__version">v{version.version}</span>
                <span className={`ds-badge ${status.tone}`}>{status.label}</span>
                <span className="rp-history__meta">
                  {version.createdByName ?? version.createdById}
                  {version.createdByRole ? ` · ${roleLabel(roles, version.createdByRole)}` : ''}
                  {' · '}
                  {formatDate(version.createdAt)}
                </span>
                {summary && (
                  <span className="rp-history__counts">
                    {summary.counts.grants} permessi · {summary.counts.roles} ruoli ·{' '}
                    {summary.counts.assignments} assegnazioni
                  </span>
                )}
              </button>
              {version.status === 'draft' && (
                <button
                  type="button"
                  className="ds-btn ds-btn--primary"
                  disabled={busy || stale}
                  title={
                    stale
                      ? `Bozza basata su v${version.basedOnVersion}, ma la policy attiva è v${activeVersion}`
                      : undefined
                  }
                  onClick={() => onApplyDraft(version)}
                >
                  Applica bozza
                </button>
              )}
            </div>
            {version.note && <p className="rp-history__note">{version.note}</p>}
            {stale && (
              <p className="rp-muted">
                Bozza obsoleta: basata su v{version.basedOnVersion}, attiva v{activeVersion}.
              </p>
            )}
            {expanded && (
              <div id={panelId} className="rp-history__body">
                <dl className="rp-facts">
                  <div>
                    <dt>Basata su</dt>
                    <dd>{version.basedOnVersion == null ? '—' : `v${version.basedOnVersion}`}</dd>
                  </div>
                  <div>
                    <dt>Applicata</dt>
                    <dd>{formatDate(version.appliedAt)}</dd>
                  </div>
                  {summary?.defaultEffect && (
                    <div>
                      <dt>Effetto di default</dt>
                      <dd>
                        <EffectBadge effect={summary.defaultEffect.before} /> →{' '}
                        <EffectBadge effect={summary.defaultEffect.after} />
                      </dd>
                    </div>
                  )}
                </dl>
                {summary &&
                  (summary.rolesAdded.length > 0 ||
                    summary.rolesRemoved.length > 0 ||
                    summary.rolesChanged.length > 0) && (
                    <p className="rp-history__roles">
                      {summary.rolesAdded.length > 0 && (
                        <span>Ruoli aggiunti: {summary.rolesAdded.join(', ')}. </span>
                      )}
                      {summary.rolesRemoved.length > 0 && (
                        <span>Ruoli rimossi: {summary.rolesRemoved.join(', ')}. </span>
                      )}
                      {summary.rolesChanged.length > 0 && (
                        <span>Ruoli modificati: {summary.rolesChanged.join(', ')}.</span>
                      )}
                    </p>
                  )}
                {summary && summary.grants.length > 0 && (
                  <div className="clinicos-table-wrap">
                    <table className="clinicos-table rp-list-table">
                      <thead>
                        <tr>
                          <th scope="col">Ruolo</th>
                          <th scope="col">Capability</th>
                          <th scope="col">Prima</th>
                          <th scope="col">Dopo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.grants.slice(0, limit).map((change) => (
                          <tr key={`${change.roleId}:${change.capabilityId}`}>
                            <td>{roleLabel(roles, change.roleId)}</td>
                            <td title={change.capabilityId}>
                              {capabilityName(change.capabilityId)}
                            </td>
                            <td>
                              <EffectBadge effect={change.before} />
                            </td>
                            <td>
                              <EffectBadge effect={change.after} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {summary && summary.grants.length > limit && (
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    onClick={() => setLimit((value) => value + PAGE)}
                  >
                    Mostra altre {Math.min(PAGE, summary.grants.length - limit)} modifiche
                  </button>
                )}
                {summary && summary.assignments.length > 0 && (
                  <ul className="rp-identity-list">
                    {summary.assignments.map((change) => (
                      <li key={change.operatorId}>
                        <span>{identityName(change.operatorId)}</span>
                        <span className="rp-muted">
                          {change.before ? roleLabel(roles, change.before) : 'legacy'} →{' '}
                          {change.after ? roleLabel(roles, change.after) : 'legacy'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {summary &&
                  summary.counts.grants + summary.counts.roles + summary.counts.assignments ===
                    0 && <p className="cr-empty">Nessuna modifica registrata.</p>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
