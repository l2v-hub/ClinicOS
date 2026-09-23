import { useId } from 'react';
export function TransfersChoice<T extends string | boolean>({
  path,
  label,
  value,
  options,
  onChange,
  missing = false,
}: {
  path: string;
  label: string;
  value: T | null;
  options: readonly (readonly [T, string])[];
  onChange: (value: T | null) => void;
  missing?: boolean;
}) {
  const id = useId();
  return (
    <fieldset
      className={`transfers-choice${options.length <= 3 ? ' transfers-choice--compact' : ''}`}
      data-field-path={path}
      tabIndex={-1}
      aria-invalid={missing || undefined}
    >
      <legend>{label}</legend>
      <div className="assessment-options">
        {options.map(([key, text]) => (
          <label key={String(key)} className={value === key ? 'is-selected' : ''}>
            <input
              type="radio"
              name={id}
              value={String(key)}
              checked={value === key}
              onChange={() => onChange(key)}
            />
            <span>{text}</span>
          </label>
        ))}
      </div>
      {value !== null && (
        <button type="button" className="link-btn" onClick={() => onChange(null)}>
          Segna come non verificato
        </button>
      )}
      {missing && <p className="transfers-field-error">Verifica questo campo.</p>}
    </fieldset>
  );
}
