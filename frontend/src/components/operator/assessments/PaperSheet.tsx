// Shared "paper table" renderer: the scale exactly as the paper module (header band, patient box,
// option table with every option and its points, live total, bands legend, signature).
// Used for compilation (interactive) and for preview/final (read-only). Tablet-first.
import { useId, type ReactNode } from 'react';
import type { PaperItem, PaperScale } from '../../../lib/assessments/paper/definitions';
import {
  paperBand,
  paperItems,
  type PaperAnswerValue,
  type PaperAnswers,
  type PaperResult,
} from '../../../lib/assessments/paper/engine';
import { groupsOf, partialTotal } from '../../../lib/assessments/paper/paperLayout';
import './Paper.css';

export interface PaperField {
  label: string;
  value: ReactNode;
}
export interface PaperSheetProps {
  scale: PaperScale;
  answers: PaperAnswers;
  fields: PaperField[];
  result: PaperResult | null;
  answeredCount: number;
  onChange?: (key: string, value: PaperAnswerValue) => void;
  disabled?: boolean;
  missing?: readonly string[];
  /** Extra content rendered inside the question cell of an item (MNA-SF calf measure). */
  itemExtra?: (item: PaperItem) => ReactNode;
  signatureName?: string;
  footerNote?: ReactNode;
  /** Frozen snapshot text of the selected options (shown instead of the definition text). */
  selectedText?: Record<string, string>;
  /** Interactive PAINAD only; read-only paper and other scales retain full layout. */
  compactCompilation?: boolean;
}

export function PaperSheet({
  scale,
  answers,
  fields,
  result,
  answeredCount,
  onChange,
  disabled,
  missing = [],
  itemExtra,
  signatureName,
  footerNote,
  selectedText,
  compactCompilation = false,
}: PaperSheetProps) {
  const label = (item: PaperItem, value: number | boolean, text: string) =>
    answers[item.key] === value ? (selectedText?.[item.key] ?? text) : text;
  const id = useId();
  const readOnly = !onChange;
  const compact = compactCompilation && !readOnly && scale.type === 'painad';
  const total = result?.total ?? partialTotal(scale, answers);
  const items = paperItems(scale);
  const band = result ? paperBand(scale, result.total) : null;
  const choose = (item: PaperItem, value: number | boolean) => {
    if (!onChange || disabled) return;
    onChange(item.key, answers[item.key] === value ? null : value);
  };
  const choice = (item: PaperItem, value: number | boolean, label: string) => {
    const checked = answers[item.key] === value;
    if (readOnly)
      return (
        <span
          className={`paper-mark${checked ? ' is-checked' : ''}`}
          role="img"
          aria-label={checked ? `Selezionato: ${label}` : 'Non selezionato'}
        >
          {checked ? '✓' : ''}
        </span>
      );
    return (
      <input
        type="radio"
        className="paper-check"
        name={`${id}-${item.key}`}
        aria-label={`${item.number ? `${item.number} ` : ''}${item.subLabel ?? item.label}: ${label}`}
        checked={checked}
        readOnly={readOnly}
        disabled={disabled || readOnly}
        data-field-path={item.key}
        aria-invalid={missing.includes(item.key) || undefined}
        onChange={() => choose(item, value)}
        onClick={(event) => {
          event.stopPropagation();
          if (checked) choose(item, value);
        }}
      />
    );
  };
  const rowProps = (item: PaperItem, value: number | boolean) => ({
    className: [
      answers[item.key] === value ? 'is-selected' : '',
      readOnly ? '' : 'is-choosable',
      missing.includes(item.key) ? 'is-missing' : '',
    ]
      .filter(Boolean)
      .join(' '),
    onClick: readOnly ? undefined : () => choose(item, value),
  });
  const parts = result?.parts ?? null;
  const totalBox = (
    <div className={`paper-total paper-total--${scale.type}`} role="status" aria-live="polite">
      {scale.totalParts?.map((part) => {
        const section = scale.sections.find((candidate) => candidate.id === part.id)!;
        const partial = section.items.reduce(
          (sum, item) =>
            sum + (item.options.find((option) => option.value === answers[item.key])?.points ?? 0),
          0,
        );
        return (
          <p key={part.id}>
            <strong>{part.label}</strong>{' '}
            <span className="paper-total__value">
              {parts?.find((value) => value.id === part.id)?.total ?? partial}
            </span>{' '}
            / {part.maximum}
          </p>
        );
      })}
      <p className="paper-total__main">
        <strong>{scale.totalLabel}</strong>{' '}
        <span className="paper-total__value" data-testid="paper-total">
          {total}
        </span>{' '}
        / {scale.maximum}
      </p>
      {items.some((item) => item.key === 'distress') && answers.frequency !== 0 && (
        <p>
          <strong>Stress del caregiver:</strong>{' '}
          {typeof answers.distress === 'number' ? answers.distress : '—'} / 5
        </p>
      )}
      <p className="paper-total__state">
        {result
          ? `${result.label}`
          : `Compilazione in corso: ${answeredCount} di ${items.length} voci · punteggio parziale`}
      </p>
    </div>
  );
  const bands = (
    <section
      className={`paper-bands paper-bands--${scale.bandsStyle}`}
      aria-label={scale.bandsTitle}
    >
      {scale.bandsTitle && <h4>{scale.bandsTitle}</h4>}
      {scale.scoringNotes?.map((note) => (
        <p key={note} className="paper-bands__note">
          {note}
        </p>
      ))}
      {scale.bandsStyle === 'table' ? (
        <table className="paper-bands__table">
          <thead>
            <tr>
              {scale.bandColumns?.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scale.bands.map((entry) => (
              <tr key={entry.id} className={band?.id === entry.id ? 'is-current' : ''}>
                <th scope="row">{entry.range}</th>
                <td>{entry.title}</td>
                <td>{entry.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul>
          {scale.bands.map((entry) => (
            <li key={entry.id} className={band?.id === entry.id ? 'is-current' : ''}>
              <span className={`paper-badge paper-badge--${entry.tone}`}>{entry.range}</span>{' '}
              {entry.title && <strong>{entry.title}</strong>} {entry.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
  return (
    <article
      className={`paper-sheet paper-sheet--${scale.type} paper-sheet--${scale.layout}${compact ? ' paper-sheet--compact-compilation' : ''}`}
      aria-label={scale.title}
    >
      <header className={`paper-head paper-head--${scale.header}`}>
        <h3>{scale.title}</h3>
        <p>{scale.subtitle}</p>
      </header>
      {!compact && <section className="paper-fields" aria-label={scale.patientBoxTitle ?? 'Anagrafica'}>
        {scale.patientBoxTitle && <h4>{scale.patientBoxTitle}</h4>}
        <dl>
          {fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}:</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>}
      {scale.instruction && (
        <p className="paper-instruction">
          <strong>{scale.instruction.label}</strong> {scale.instruction.text}
        </p>
      )}
      {scale.intro && <p className="paper-instruction">{scale.intro}</p>}
      {scale.sections.map((section) => (
        <section key={section.id} className="paper-section">
          <h4 className={`paper-section__title paper-section__title--${scale.sectionStyle}`}>
            {section.title}
          </h4>
          {section.note && <p className="paper-section__note">{section.note}</p>}
          {scale.layout === 'table' && (
            <div className="paper-scroll">
              <table className="paper-table">
                <thead>
                  <tr>
                    {scale.columns.map((column) => (
                      <th key={column} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupsOf(section.items).map((group) => {
                    const span = group.reduce((sum, item) => sum + item.options.length, 0);
                    const head = group[0];
                    return group.map((item, itemIndex) =>
                      item.options.map((option, optionIndex) => (
                        <tr
                          key={`${item.key}-${String(option.value)}`}
                          {...rowProps(item, option.value)}
                        >
                          {itemIndex === 0 && optionIndex === 0 && (
                            <>
                              <td rowSpan={span} className="paper-table__num">
                                {head.number}
                              </td>
                              <th rowSpan={span} scope="rowgroup" className="paper-table__param">
                                {head.label}
                                {head.note && <small>{head.note}</small>}
                              </th>
                            </>
                          )}
                          <td className="paper-table__desc">
                            {optionIndex === 0 && item.subLabel && (
                              <span className="paper-table__sub">{item.subLabel}</span>
                            )}
                            {label(item, option.value, option.label)}
                          </td>
                          <td className="paper-table__pts">{option.points}</td>
                          <td className="paper-table__sel">
                            {choice(item, option.value, option.label)}
                          </td>
                        </tr>
                      )),
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {scale.layout === 'grid' && (
            <div className="paper-scroll">
              <table className="paper-table paper-table--grid">
                <thead>
                  <tr>
                    {scale.columns.map((column) => (
                      <th key={column} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item) => {
                    const chosen = item.options.find(
                      (option) => option.value === answers[item.key],
                    );
                    return (
                      <tr key={item.key} className={missing.includes(item.key) ? 'is-missing' : ''}>
                        <th scope="row">
                          {item.number}. {item.label}
                        </th>
                        {item.options.map((option) => (
                          <td key={String(option.value)} {...rowProps(item, option.value)}>
                            <span className="paper-cell">
                              {choice(item, option.value, option.label)}
                              <span>{label(item, option.value, option.label)}</span>
                            </span>
                          </td>
                        ))}
                        <td className="paper-table__pts">{chosen ? chosen.points : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {scale.layout === 'stacked' && (
            <div className="paper-scroll">
              <table
                className={`paper-table paper-table--stacked${scale.columns.length === 2 ? ' paper-table--two' : ''}`}
              >
                {scale.columns.length === 2 && (
                  <thead>
                    <tr>
                      {scale.columns.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {section.items.map((item) => {
                    const chosen = item.options.find(
                      (option) => option.value === answers[item.key],
                    );
                    const inactive =
                      (item.dependsOn && answers[item.dependsOn] === 0) ||
                      (item.group &&
                        items.some(
                          (other) =>
                            other.group === item.group &&
                            other.key !== item.key &&
                            answers[other.key] !== null,
                        ));
                    return (
                      <tr
                        key={item.key}
                        className={[
                          missing.includes(item.key) ? 'is-missing' : '',
                          inactive ? 'is-inactive' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <th scope="row">
                          {item.number ? `${item.number}. ` : ''}
                          {item.label}
                          {item.note && <small>{item.note}</small>}
                          {itemExtra?.(item)}
                        </th>
                        <td>
                          <ul className="paper-options">
                            {item.options.map((option) => (
                              <li key={String(option.value)} {...rowProps(item, option.value)}>
                                {choice(item, option.value, option.label)}
                                <span>
                                  {String(option.value)} = {label(item, option.value, option.label)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        {scale.columns.length === 3 && (
                          <td className="paper-table__pts">
                            <strong>Punti:</strong> {chosen ? chosen.points : '____'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {scale.columns.length === 2 && (
                    <tr className="paper-table__total-row">
                      <th scope="row">Punteggio Totale</th>
                      <td>
                        <strong>
                          {scale.totalLabel} {total} / {scale.maximum}
                        </strong>
                        <br />
                        {(band ?? scale.bands[scale.bands.length - 1]).text}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {scale.layout === 'yesno' && (
            <ol className="paper-yesno">
              {section.items.map((item) => (
                <li key={item.key} className={missing.includes(item.key) ? 'is-missing' : ''}>
                  <span className="paper-yesno__num">{item.number}.</span>
                  <span className="paper-yesno__text">{item.label}</span>
                  {item.options.map((option) => (
                    <span
                      key={String(option.value)}
                      {...rowProps(item, option.value)}
                      role="presentation"
                    >
                      <span className="paper-cell">
                        {choice(item, option.value, option.label)}
                        <span>{label(item, option.value, option.label)}</span>
                      </span>
                    </span>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
      {scale.signature ? (
        <>
          {bands}
          <div className="paper-closing">
            {totalBox}
            <div className="paper-signature">
              <strong>Firma dell'Operatore / Valutatore:</strong>
              <span>{signatureName ?? ''}</span>
              <span className="paper-signature__line" aria-hidden="true" />
            </div>
          </div>
        </>
      ) : scale.type === 'painad' ? (
        <>
          {totalBox}
          {bands}
        </>
      ) : scale.columns.length === 2 && scale.layout === 'stacked' ? (
        <>{totalBox}</>
      ) : (
        <>
          {totalBox}
          {bands}
        </>
      )}
      {footerNote}
      {scale.footer && <p className="paper-footer">{scale.footer}</p>}
    </article>
  );
}
