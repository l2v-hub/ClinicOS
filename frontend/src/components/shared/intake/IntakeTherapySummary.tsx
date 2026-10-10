import type { TherapyField } from '../../operator/cartella/therapyFieldFeedback';
import type { TherapyFormValue } from '../../operator/cartella/TherapyFormFields';
import type { ScheduleRow } from '../../operator/cartella/therapyDose';
import type { TherapyCorrectionTarget } from './intakeTherapyNavigation';
import type { buildIntakeTherapyReview } from './intakeTherapies';
import { TherapyImportSource } from './TherapyImportSource';
import './IntakeTherapySummary.css';
import { glucoseScaleRows } from '../../operator/cartella/glucoseScale';

type Review = ReturnType<typeof buildIntakeTherapyReview>[number];
interface Props {
  therapy: Review;
  busy: boolean;
  onCorrect?: (target?: TherapyCorrectionTarget) => void;
}
const text = (value: unknown, empty = 'Non indicato') =>
  value === undefined || value === null || value === '' ? empty : String(value);
const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Display the actual draft values beside their diagnostics, including invalid inputs. */
export function IntakeTherapySummary({ therapy: t, busy, onCorrect }: Props) {
  const f = t.form;
  const input: Record<string, unknown> = t.input;
  const value = (field: keyof TherapyFormValue) => f?.[field] ?? input[field];
  const field = (
    label: string,
    fieldName: TherapyField | undefined,
    shown: unknown,
    scheduleIndex?: number,
  ) => {
    const issues = t.diagnostics.filter(
      (issue) => issue.field === fieldName && issue.scheduleIndex === scheduleIndex,
    );
    return (
      <dl
        className={`intake-therapy-summary__field${issues.length ? ' is-invalid' : ''}`}
        data-summary-field={fieldName}
        data-summary-schedule={scheduleIndex}
        key={`${fieldName ?? label}-${scheduleIndex ?? ''}`}
      >
        <dt>
          {label}
          {issues.length > 0 && (
            <span className="intake-therapy-summary__error-label"> · Da correggere</span>
          )}
        </dt>
        <dd>{text(shown)}</dd>
        {issues.map((issue, i) => (
          <dd className="intake-therapy-summary__error" key={i}>
            {onCorrect ? (
              <button
                type="button"
                className="intake-therapy-summary__fix"
                disabled={busy}
                aria-label={`Correggi ${label} della terapia ${t.index}: ${t.name}`}
                onClick={() => onCorrect(issue)}
              >
                {issue.message} →
              </button>
            ) : (
              issue.message
            )}
          </dd>
        ))}
      </dl>
    );
  };
  const schedules: ScheduleRow[] = Array.isArray(f?.schedules)
    ? f.schedules
    : Array.isArray(input.schedules)
      ? (input.schedules as ScheduleRow[])
      : [];
  const scale = input.doseMode === 'glucose_scale';
  const rules = glucoseScaleRows(input.doseProtocol);
  return (
    <article className="intake-therapy-summary" data-testid={`intake-therapy-${t.index}`}>
      <header className="intake-therapy-summary__header">
        <strong>
          {t.index}. {t.name}
        </strong>
        <span
          className={
            t.issues.length
              ? 'intake-therapy-summary__status is-invalid'
              : 'intake-therapy-summary__status'
          }
        >
          {t.issues.length ? 'Campi da correggere' : 'Dati completi'}
        </span>
      </header>
      <div className="intake-therapy-summary__grid">
        {field('Farmaco', 'farmacoNome', value('farmacoNome'))}
        {field('Forma', undefined, value('pharmaceuticalForm'))}
        {field('Dosaggio commerciale', 'commercialStrengthValue', value('commercialStrengthValue'))}
        {field('Unità del dosaggio', 'commercialStrengthUnit', value('commercialStrengthUnit'))}
        {field('Via di somministrazione', 'viaSomministrazione', value('viaSomministrazione'))}
        {field('Tipo di terapia', 'tipo', value('tipo'))}
        {scale && field('Dosaggio', 'doseMode', 'Schema glicemico — dose dopo la rilevazione')}
        {scale &&
          field(
            'Schema glicemico',
            'glucoseScale',
            rules.length
              ? rules
                  .map(
                    (rule) =>
                      `${rule.minMgDl}–${rule.maxMgDl || 'oltre'} mg/dL → ${rule.units} unità`,
                  )
                  .join('; ')
              : 'Schema da completare',
          )}
        {field('Data di inizio', 'dataInizio', value('dataInizio'))}
        {(Boolean(value('dataFine')) || t.diagnostics.some((d) => d.field === 'dataFine')) &&
          field('Data di fine', 'dataFine', value('dataFine'))}
        {field('Stato', 'stato', value('stato'))}
        {value('tipo') === 'periodica' &&
          field(
            'Giorni',
            'giorniSettimana',
            Array.isArray(f?.giorniSettimana) && f.giorniSettimana.length
              ? f.giorniSettimana.map((day) => days[day - 1] ?? String(day)).join(', ')
              : t.diagnostics.some((d) => d.field === 'giorniSettimana')
                ? text(value('giorniSettimana'))
                : 'Tutti i giorni',
          )}
        {value('tipo') === 'una_tantum' && (
          <>
            {field(
              'Data della somministrazione',
              'dataSomministrazione',
              value('dataSomministrazione'),
            )}
            {field(
              'Ora della somministrazione',
              'orarioSomministrazione',
              value('orarioSomministrazione'),
            )}
          </>
        )}
        {value('tipo') === 'periodica' && (
          <>
            {(!schedules.length || t.diagnostics.some((d) => d.field === 'schedules')) &&
              field(
                'Orari di somministrazione',
                'schedules',
                schedules.length ? `${schedules.length} orari inseriti` : 'Nessun orario inserito',
              )}
            {schedules.map((schedule, i) => (
              <div className="intake-therapy-summary__schedule" key={i}>
                {field(`Ora ${i + 1}`, 'time', schedule?.time, i)}
                {!scale &&
                  field(
                    `Quantità ${i + 1}`,
                    'quantity',
                    schedule
                      ? `${text(schedule.quantityNumerator)} / ${text(schedule.quantityDenominator)}`
                      : undefined,
                    i,
                  )}
                {scale && <p className="form-hint">Rileva la glicemia prima di somministrare.</p>}
                {field(
                  `Unità di somministrazione ${i + 1}`,
                  'administrationUnit',
                  schedule?.administrationUnit,
                  i,
                )}
              </div>
            ))}
          </>
        )}
        {Boolean(value('prescrittore')) && field('Prescrittore', undefined, value('prescrittore'))}
        {Boolean(value('note')) && field('Note', undefined, value('note'))}
        {(t.originalText || t.structuredSource !== undefined || t.requiresSourceReview) && (
          <div className="intake-therapy-summary__source">
            {field(
              t.originalText || t.structuredSource === undefined ? 'Testo estratto dalla lettera' : 'Verifica della fonte estratta',
              'sourceReview',
              t.originalText || (t.structuredSource === undefined ? 'Testo originale non disponibile' : 'Confronta con il documento prima di confermare'),
            )}
            <TherapyImportSource row={{ ...t, originalText: '' }} />
          </div>
        )}
      </div>
    </article>
  );
}
