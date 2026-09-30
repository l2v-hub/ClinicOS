import type { PolicyImpactResponse, RoleDefinition } from '../../../lib/authzPolicyApi';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { roleLabel } from './rolePermissionsModel';

interface ImpactProps {
  impact: PolicyImpactResponse;
  roles: RoleDefinition[];
  capabilityName: (id: string) => string;
  identityName: (id: string) => string;
}

function NameList({ ids, name }: { ids: string[]; name: (id: string) => string }) {
  if (ids.length === 0) return <span className="rp-muted">—</span>;
  return (
    <span className="rp-name-list">
      {ids.map((id) => (
        <span key={id} className="rp-tag" title={id}>
          {name(id)}
        </span>
      ))}
    </span>
  );
}

/** Anteprima impatto: per ruolo capability ottenute/perse, tool visti da Agnos, identità coinvolte. */
export function ImpactPanel({ impact, roles, capabilityName, identityName }: ImpactProps) {
  return (
    <ClinicalCard title="Anteprima impatto" className="rp-impact">
      {impact.warnings.length > 0 && (
        <ul className="rp-banner rp-banner--warning rp-warnings" aria-label="Avvisi">
          {impact.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {impact.roles.length === 0 ? (
        <p className="cr-empty">Le modifiche non cambiano cosa possono fare i ruoli.</p>
      ) : (
        <div className="clinicos-table-wrap">
          <table className="clinicos-table rp-list-table rp-impact__table">
            <thead>
              <tr>
                <th scope="col">Ruolo</th>
                <th scope="col">Ottiene</th>
                <th scope="col">Perde</th>
                <th scope="col">Conferma cambiata</th>
                <th scope="col">Tool Agnos</th>
                <th scope="col">Identità</th>
              </tr>
            </thead>
            <tbody>
              {impact.roles.map((entry) => (
                <tr key={entry.roleId}>
                  <th scope="row" className="rp-matrix__cap">
                    <span className="rp-cap-name">{roleLabel(roles, entry.roleId)}</span>
                  </th>
                  <td>
                    <NameList ids={entry.gained} name={capabilityName} />
                  </td>
                  <td>
                    <NameList ids={entry.lost} name={capabilityName} />
                  </td>
                  <td>
                    <NameList ids={entry.confirmationChanged} name={capabilityName} />
                  </td>
                  <td>
                    {entry.toolsGained.length + entry.toolsLost.length === 0 ? (
                      <span className="rp-muted">—</span>
                    ) : (
                      <span className="rp-name-list">
                        {entry.toolsGained.map((id) => (
                          <span key={`+${id}`} className="rp-tag rp-tag--gain" title={id}>
                            + {capabilityName(id)}
                          </span>
                        ))}
                        {entry.toolsLost.map((id) => (
                          <span key={`-${id}`} className="rp-tag rp-tag--loss" title={id}>
                            − {capabilityName(id)}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>
                    <NameList ids={entry.identities} name={identityName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ClinicalCard>
  );
}

/** Riepilogo testuale (solo elementi inline: finisce dentro il <p> di ConfirmDialog). */
export function ImpactSummaryInline({
  impact,
  roles,
  changes,
}: {
  impact: PolicyImpactResponse | null;
  roles: RoleDefinition[];
  changes: { grants: number; assignments: number };
}) {
  return (
    <span className="rp-confirm-summary">
      <span className="rp-confirm-summary__line">
        {changes.grants} permessi e {changes.assignments} assegnazioni cambiano. La nuova versione
        diventa subito attiva per tutte le sessioni aperte, alla prossima operazione protetta.
      </span>
      {impact?.roles.map((entry) => (
        <span key={entry.roleId} className="rp-confirm-summary__line">
          <strong>{roleLabel(roles, entry.roleId)}</strong>: +{entry.gained.length} / −
          {entry.lost.length} capability
          {entry.toolsGained.length + entry.toolsLost.length > 0 &&
            `, tool Agnos +${entry.toolsGained.length} / −${entry.toolsLost.length}`}
          {entry.identities.length > 0 && `, ${entry.identities.length} identità`}
        </span>
      ))}
      {impact?.warnings.map((warning) => (
        <span key={warning} className="rp-confirm-summary__line rp-confirm-summary__warning">
          {warning}
        </span>
      ))}
      {!impact && (
        <span className="rp-confirm-summary__line rp-muted">
          Anteprima impatto non disponibile.
        </span>
      )}
    </span>
  );
}
