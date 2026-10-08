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
  optionalFields = [],
}: {
  value: Demographics;
  onEdit?: (field: DemographicField) => void;
  busy?: boolean;
  /** Context-specific required identity; full profile completeness remains the default. */
  optionalFields?: readonly DemographicField[];
}) {
  const fields = incompleteDemographicFields(value).filter(
    (field) => !optionalFields.includes(field),
  );
  if (!fields.length) return null;
  return (
    <aside className="demographics-status" aria-label="Completezza anagrafica">
      <strong>Anagrafica da completare</strong>
      <span>Dati da completare: </span>
      <ul>
        {fields.map((field) => (
          <li key={field}>
            {onEdit ? (
              <button
                type="button"
                className="ds-link"
                onClick={() => onEdit(field)}
                disabled={busy}
              >
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
