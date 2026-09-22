export type TherapyField =
  | 'farmacoNome'
  | 'dataInizio'
  | 'dataFine'
  | 'viaSomministrazione'
  | 'tipo'
  | 'stato'
  | 'commercialStrengthValue'
  | 'commercialStrengthUnit'
  | 'giorniSettimana'
  | 'dataSomministrazione'
  | 'orarioSomministrazione'
  | 'schedules'
  | 'time'
  | 'quantity'
  | 'administrationUnit'
  | 'sourceReview';

export interface TherapyFieldIssue {
  field: TherapyField;
  scheduleIndex?: number;
  message: string;
}

export interface TherapyFieldAttributes {
  'data-therapy-field': TherapyField;
  'data-therapy-schedule'?: number;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/** Share the same field identity between inline feedback and intake correction links. */
export function therapyFieldFeedback(id: string, issues: readonly TherapyFieldIssue[] = []) {
  const matching = (field: TherapyField, scheduleIndex?: number) =>
    issues.filter((issue) => issue.field === field && issue.scheduleIndex === scheduleIndex);
  const errorId = (field: TherapyField, scheduleIndex?: number) =>
    `${id}-error-${field}${scheduleIndex === undefined ? '' : `-${scheduleIndex}`}`;
  return {
    attributes(field: TherapyField, scheduleIndex?: number): TherapyFieldAttributes {
      const invalid = matching(field, scheduleIndex).length > 0;
      return {
        'data-therapy-field': field,
        'data-therapy-schedule': scheduleIndex,
        'aria-invalid': invalid || undefined,
        'aria-describedby': invalid ? errorId(field, scheduleIndex) : undefined,
      };
    },
    error(field: TherapyField, scheduleIndex?: number) {
      const messages = matching(field, scheduleIndex).map((issue) => issue.message);
      return messages.length ? (
        <p id={errorId(field, scheduleIndex)} className="therapy-form__error">
          {messages.join('; ')}.
        </p>
      ) : null;
    },
  };
}
