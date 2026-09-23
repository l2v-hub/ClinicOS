import { useId } from 'react';
import type {
  MnaAnswers,
  MnaInputPath,
  MnaLocalInputs,
  MnaMeasurementKey,
} from '../../../lib/assessments/mnaTypes';
import { MNA_ITEMS, MNA_MEASUREMENT_LABELS } from '../../../lib/assessments/mnaItems';
import { mnaBmiOrNull } from '../../../lib/assessments/mnaInputValidation';
import {
  mnaInputErrors,
  mnaInputValue,
  updateMnaInput,
  displayMnaBmi,
} from '../../../lib/assessments/mnaLocalInputs';
import { mnaSnapshotItems } from '../../../lib/assessments/mnaDefinition';
import { TransfersChoice } from './TransfersChoice';

export function MnaAnthropometry({
  id,
  answers,
  inputs,
  missing,
  onChange,
}: {
  id: 'F' | 'Q' | 'R';
  answers: MnaAnswers;
  inputs?: MnaLocalInputs;
  missing: string[];
  onChange: (fields: { answers: MnaAnswers; mnaInputs?: MnaLocalInputs }) => void;
}) {
  const uid = useId();
  const item = MNA_ITEMS.find((item) => item.id === id)!;
  const keys: MnaMeasurementKey[] =
    id === 'F'
      ? ['weightKg', 'heightCm']
      : id === 'Q'
        ? ['armCircumferenceCm']
        : ['calfCircumferenceCm'];
  const completeMeasurements = keys.every((key) => answers.measurements[key] !== null);
  const errors = mnaInputErrors(answers, inputs);
  const inputInvalid = keys.some((key) => errors[`measurements.${key}`]);
  const selected = answers[id];
  const derived = inputInvalid ? null : mnaSnapshotItems(answers).find((item) => item.id === id)!;
  const bmi = inputInvalid ? null : mnaBmiOrNull(answers.measurements);
  return (
    <section className="mna-anthropometry">
      <h4>
        {id}. {item.label}
      </h4>
      <div className="mna-measurements">
        {keys.map((key) => (
          <div key={key}>
            {(['measurements', 'measurementDates'] as const).map((kind) => {
              const path: MnaInputPath = `${kind}.${key}`;
              const error = errors[path];
              const unit = key === 'weightKg' ? 'kg' : 'cm';
              return (
                <label key={kind} htmlFor={`${uid}-${path}`}>
                  {kind === 'measurements'
                    ? `${MNA_MEASUREMENT_LABELS[key]} (${unit})`
                    : `Data rilevazione ${MNA_MEASUREMENT_LABELS[key].toLowerCase()} · facoltativa`}
                  <input
                    id={`${uid}-${path}`}
                    className="form-input"
                    type="text"
                    inputMode={kind === 'measurements' ? 'decimal' : undefined}
                    placeholder={kind === 'measurementDates' ? 'AAAA-MM-GG' : undefined}
                    autoComplete="off"
                    data-field-path={path}
                    aria-invalid={!!error || missing.includes(path) || undefined}
                    aria-describedby={error ? `${uid}-${path}-error` : undefined}
                    value={mnaInputValue(answers, inputs, path)}
                    onChange={(event) =>
                      onChange(updateMnaInput(answers, inputs, path, event.target.value))
                    }
                  />
                  {error && (
                    <span id={`${uid}-${path}-error`} className="mna-field-error" role="alert">
                      {error}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <p className="assessment-hint">
        Dati inseriti manualmente per questa valutazione. Lascia vuota la data se sconosciuta.
      </p>
      <div className="mna-methods" role="group" aria-label={`Metodo ${id}`}>
        <label>
          <input
            type="radio"
            name={`${uid}-method`}
            checked={selected.method === 'measured'}
            onChange={() => onChange({ answers: { ...answers, [id]: { method: 'measured' } } })}
          />
          Da misure
        </label>
        <label>
          <input
            type="radio"
            name={`${uid}-method`}
            checked={selected.method === 'category'}
            disabled={completeMeasurements}
            onChange={() =>
              onChange({ answers: { ...answers, [id]: { method: 'category', category: null } } })
            }
          />
          Categoria dichiarata
        </label>
      </div>
      {selected.method === 'category' ? (
        <TransfersChoice
          path={`${id}.category`}
          label="Categoria dichiarata"
          value={selected.category}
          options={item.options.map(
            (option) =>
              [
                String(option.value),
                `${option.description} · ${option.score.toLocaleString('it-IT')} punti`,
              ] as const,
          )}
          missing={missing.includes(`${id}.category`)}
          onChange={(category) =>
            onChange({
              answers: { ...answers, [id]: { method: 'category', category } } as MnaAnswers,
            })
          }
        />
      ) : (
        <div role="status" className="mna-derived">
          {inputInvalid ? (
            'Correggi la misura indicata: il risultato non è disponibile.'
          ) : (
            <>
              {id === 'F' && (
                <p>
                  IMC:{' '}
                  {bmi === null
                    ? 'non calcolabile finché peso e altezza non sono completi'
                    : `${displayMnaBmi(bmi)} kg/m²`}
                </p>
              )}
              <p>
                {derived?.description
                  ? `${derived.description} · ${derived.score?.toLocaleString('it-IT')} punti`
                  : 'Misure da completare.'}
              </p>
            </>
          )}
          {completeMeasurements && (
            <p>
              La fascia deriva dalle misure presenti. Per usare una categoria dichiarata, modifica o
              rimuovi esplicitamente le misure necessarie.
            </p>
          )}
        </div>
      )}
      {id === 'Q' && (
        <p className="assessment-hint">
          Q corretto: CB &lt; 21 cm = 0; 21–22 cm inclusi = 0,5; CB &gt; 22 cm = 1.
        </p>
      )}
    </section>
  );
}
