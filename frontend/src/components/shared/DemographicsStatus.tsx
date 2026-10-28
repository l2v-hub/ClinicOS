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
  compact = false,
}: {
  value: Demographics;
  onEdit?: (field: DemographicField) => void;
  busy?: boolean;
  /** Context-specific required identity; full profile completeness remains the default. */
  optionalFields?: readonly DemographicField[];
  compact?: boolean;
}) {
  const fields = incompleteDemographicFields(value).filter(
    (field) => !optionalFields.includes(field),
  );
  if (!fields.length) return null;
  if (compact) {
    const missing = fields.map((field) => DEMOGRAPHIC_LABELS[field]).join(', ');
    return (
      <span className="demographics-status-compact">
        {onEdit ? (
          <button
            type="button"
            className="ds-link"
            disabled={busy}
            aria-label={`Completa anagrafica: ${missing}`}
            title={`Dati da completare: ${missing}`}
            onClick={() => onEdit(fields[0])}
          >
            Completa
          </button>
        ) : (
          `Mancano ${missing}`
        )}
      </span>
    );
  }
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
