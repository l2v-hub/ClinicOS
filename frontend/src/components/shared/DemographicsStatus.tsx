import {
  DEMOGRAPHIC_LABELS,
  incompleteDemographicFields,
  type DemographicField,
  type Demographics,
} from '../../lib/patientDemographics';
import './DemographicsStatus.css';

export function DemographicsStatus({
  value,
  onEdit,
  busy = false,
}: {
  value: Demographics;
  onEdit?: (field: DemographicField) => void;
  busy?: boolean;
}) {
  const fields = incompleteDemographicFields(value);
  if (!fields.length) return null;
  return (
    <aside className="demographics-status" aria-label="Completezza anagrafica">
      <strong>Anagrafica da completare</strong>
      <span>Dati da completare: </span>
      <ul>
        {fields.map((field) => (
          <li key={field}>
            {onEdit ? (
              <button type="button" onClick={() => onEdit(field)} disabled={busy}>
                {DEMOGRAPHIC_LABELS[field]}
              </button>
            ) : (
              DEMOGRAPHIC_LABELS[field]
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
