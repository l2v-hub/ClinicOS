// Proposte dei documenti sui campi (`_fieldProposals`): l'AI ha letto un valore diverso da quello
// scritto dall'operatore. Il campo non cambia finché l'operatore non sceglie; con proposte aperte
// "Crea paziente" resta bloccato. Le proposte di terapia (`_importProposals`) hanno la loro UI.
import {
  fieldLabel,
  formatFieldValue,
  proposalsLeftText,
  readPath,
  type FieldProposal,
} from './intakeDocuments';

interface Props {
  proposals: FieldProposal[];
  data: Record<string, unknown>;
  /** Proposta con la decisione in corso. */
  deciding: string | null;
  disabled: boolean;
  error: string | null;
  onDecide: (proposal: FieldProposal, action: 'apply' | 'keep') => void;
}

export function IntakeFieldProposals({
  proposals,
  data,
  deciding,
  disabled,
  error,
  onDecide,
}: Props) {
  if (!proposals.length && !error) return null;
  return (
    <section
      className="ds-card intake-section intake-proposals"
      data-testid="intake-field-proposals"
      aria-labelledby="intake-proposals-title"
    >
      <header className="intake-section__head">
        <h3 id="intake-proposals-title" className="intake-section__title">
          Proposte dei documenti
        </h3>
        {proposals.length > 0 && (
          <span className="ds-badge ds-badge--warning" data-testid="intake-field-proposals-count">
            {proposalsLeftText(proposals.length)}
          </span>
        )}
      </header>
      {proposals.length > 0 && (
        <p className="intake-section__hint">
          L’AI ha letto valori diversi da quelli che hai scritto: il campo resta com’è finché non
          scegli. Finché restano proposte, «Crea paziente» è bloccato.
        </p>
      )}
      {error && (
        <p className="import-modal__error" role="alert" data-testid="intake-field-proposals-error">
          {error}
        </p>
      )}
      <ul className="intake-proposals__list">
        {proposals.map((p) => {
          const label = fieldLabel(p.path);
          const busy = deciding === p.id;
          return (
            <li
              key={p.id}
              className="intake-proposals__item"
              data-testid="intake-field-proposal"
              data-proposal-path={p.path}
            >
              <p className="intake-proposals__field">{label}</p>
              <p className="intake-proposals__value">
                L’AI ha letto <strong>{formatFieldValue(p.path, p.value)}</strong>
              </p>
              <p className="intake-proposals__current">
                Il tuo valore: {formatFieldValue(p.path, readPath(data, p.path))}
              </p>
              <div className="intake-proposals__actions">
                <button
                  type="button"
                  className="ds-btn ds-btn--primary ds-btn--wrap"
                  data-testid="intake-proposal-apply"
                  aria-label={`Usa questo valore per ${label}`}
                  disabled={disabled || !!deciding}
                  onClick={() => onDecide(p, 'apply')}
                >
                  {busy ? 'Salvataggio…' : 'Usa questo valore'}
                </button>
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary ds-btn--wrap"
                  data-testid="intake-proposal-keep"
                  aria-label={`Tieni il mio valore per ${label}`}
                  disabled={disabled || !!deciding}
                  onClick={() => onDecide(p, 'keep')}
                >
                  Tieni il mio
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
