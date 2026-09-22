import { useId, useState } from 'react';
import { CampoFarmaco } from './CampoFarmaco';
import { needsCommercialStrengthReview } from './drugPackageSelection';
import {
  FRACTION_PRESETS,
  PHARMA_FORMS,
  STRENGTH_UNITS,
  isPatchUnit,
  type ScheduleRow,
} from './therapyDose';
import { applyTherapyFormChange } from './therapyFormChange';
import { TherapyScheduleEditor } from './TherapyScheduleEditor';
import { TherapyFormPreview } from './TherapyFormPreview';
import { therapyFieldFeedback, type TherapyFieldIssue } from './therapyFieldFeedback';
import './TherapyFormFields.css';

// ── Constants ─────────────────────────────────────────────────────────────────

export const VIA_OPTIONS = [
  'orale',
  'IM',
  'SC',
  'IV',
  'sublinguale',
  'topico',
  'al bisogno',
  'transdermica',
  'inalatoria',
  'rettale',
  'oftalmica',
  'otologica',
  'nasale',
  'vaginale',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TherapyFormValue {
  farmacoNome: string;
  drugPackageRef?: string | null;
  drugPackageDetached?: boolean;
  /** Informational reminder when changing a product clears its previous strength. */
  commercialStrengthNeedsReview?: boolean;
  pharmaceuticalForm: string;
  commercialStrengthValue: string;
  commercialStrengthUnit: string;
  allowedFractions: string[];
  viaSomministrazione: string;
  tipo: 'periodica' | 'una_tantum' | 'al_bisogno';
  stato: 'attiva' | 'sospesa' | 'conclusa';
  dataInizio: string;
  dataFine: string;
  schedules: ScheduleRow[];
  giorniSettimana: number[]; // #241: ISO weekdays 1=Lun … 7=Dom; empty = tutti i giorni
  prescrittore: string;
  note: string;
  dataSomministrazione: string;
  orarioSomministrazione: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// #241: ISO weekdays (1=Lun … 7=Dom) for the intermittent-posology selector.
const WEEKDAYS: ReadonlyArray<{ n: number; l: string }> = [
  { n: 1, l: 'Lun' },
  { n: 2, l: 'Mar' },
  { n: 3, l: 'Mer' },
  { n: 4, l: 'Gio' },
  { n: 5, l: 'Ven' },
  { n: 6, l: 'Sab' },
  { n: 7, l: 'Dom' },
];

export function emptyTherapyForm(): TherapyFormValue {
  return {
    farmacoNome: '',
    drugPackageRef: null,
    pharmaceuticalForm: 'compressa',
    commercialStrengthValue: '',
    commercialStrengthUnit: 'mg',
    allowedFractions: ['1'],
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: todayStr(),
    dataFine: '',
    schedules: [
      {
        time: '08:00',
        quantityNumerator: 1,
        quantityDenominator: 1,
        administrationUnit: 'compressa',
      },
    ],
    giorniSettimana: [],
    prescrittore: '',
    note: '',
    dataSomministrazione: todayStr(),
    orarioSomministrazione: '',
  };
}

interface TherapyFormFieldsProps {
  value: TherapyFormValue;
  onChange: (next: TherapyFormValue) => void;
  operatoreNome?: string;
  issues?: readonly TherapyFieldIssue[];
}

const THERAPY_TYPES = [
  { value: 'periodica', label: 'Periodica', hint: 'A orari e giorni stabiliti' },
  { value: 'una_tantum', label: 'Una tantum', hint: 'Una sola somministrazione' },
  { value: 'al_bisogno', label: 'Al bisogno', hint: 'Secondo le indicazioni' },
] as const;

export function TherapyFormFields({ value, onChange, issues }: TherapyFormFieldsProps) {
  const id = useId();
  const feedback = therapyFieldFeedback(id, issues);
  // Keep pending custom quantities across changes of therapy type.
  const [customQty, setCustomQty] = useState<Record<number, string>>({});
  const update = (patch: Partial<TherapyFormValue>) =>
    onChange(applyTherapyFormChange(value, patch));
  const toggleAllowedFraction = (key: string) => {
    if (key === '1') return;
    update({
      allowedFractions: value.allowedFractions.includes(key)
        ? value.allowedFractions.filter((k) => k !== key)
        : [...value.allowedFractions, key],
    });
  };
  const hasFractions =
    value.allowedFractions.some((key) => key !== '1') ||
    value.schedules.some((s) => s.quantityDenominator !== 1);

  return (
    <div className="therapy-form">
      <section className="therapy-form__section" aria-labelledby={`${id}-medicine`}>
        <h3 id={`${id}-medicine`}>
          <span aria-hidden="true">1</span> Farmaco
        </h3>
        <CampoFarmaco
          valore={value.farmacoNome}
          forma={value.pharmaceuticalForm}
          drugPackageRef={value.drugPackageRef}
          packageDetached={value.drugPackageDetached}
          onCambia={update}
          validation={feedback.attributes('farmacoNome')}
        />
        {feedback.error('farmacoNome')}
        {value.farmacoNome && needsCommercialStrengthReview(value) && (
          <p className="form-hint" role="status">
            Il dosaggio commerciale precedente è stato rimosso: verifica quello del nuovo prodotto.
            Quantità e orari della prescrizione sono conservati.
          </p>
        )}
        <div className="therapy-form__grid">
          <div className="form-group">
            <label htmlFor={`${id}-form`}>Forma farmaceutica</label>
            <select
              id={`${id}-form`}
              className="form-select"
              value={value.pharmaceuticalForm}
              onChange={(e) => update({ pharmaceuticalForm: e.target.value })}
            >
              <option value="">Seleziona forma</option>
              {PHARMA_FORMS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor={`${id}-strength`}>Dosaggio commerciale</label>
            <div className="therapy-form__strength">
              <input
                id={`${id}-strength`}
                {...feedback.attributes('commercialStrengthValue')}
                className="form-input"
                type="number"
                min="0"
                step="any"
                value={value.commercialStrengthValue}
                placeholder="es. 100"
                onChange={(e) => update({ commercialStrengthValue: e.target.value })}
              />
              <select
                className="form-select"
                aria-label="Unità dosaggio commerciale"
                {...feedback.attributes('commercialStrengthUnit')}
                value={value.commercialStrengthUnit}
                onChange={(e) => update({ commercialStrengthUnit: e.target.value })}
              >
                <option value="">Unità</option>
                {STRENGTH_UNITS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {feedback.error('commercialStrengthValue')}
            {feedback.error('commercialStrengthUnit')}
          </div>
          <div className="form-group">
            <label htmlFor={`${id}-route`}>Via di somministrazione</label>
            <select
              id={`${id}-route`}
              {...feedback.attributes('viaSomministrazione')}
              className="form-select"
              value={value.viaSomministrazione}
              onChange={(e) => update({ viaSomministrazione: e.target.value })}
            >
              {!VIA_OPTIONS.includes(value.viaSomministrazione) && (
                <option value={value.viaSomministrazione}>Seleziona via</option>
              )}
              {VIA_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {feedback.error('viaSomministrazione')}
          </div>
        </div>
      </section>

      <section className="therapy-form__section" aria-labelledby={`${id}-timing`}>
        <h3 id={`${id}-timing`}>
          <span aria-hidden="true">2</span> Programmazione
        </h3>
        <div
          className="therapy-form__types"
          role="group"
          aria-label="Tipo terapia"
          tabIndex={-1}
          {...feedback.attributes('tipo')}
        >
          {THERAPY_TYPES.map((type) => (
            <label
              key={type.value}
              className={`therapy-form__type${value.tipo === type.value ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name={`${id}-type`}
                value={type.value}
                checked={value.tipo === type.value}
                onChange={() => update({ tipo: type.value })}
              />
              <span>
                <strong>{type.label}</strong>
                <small>{type.hint}</small>
              </span>
            </label>
          ))}
        </div>
        {feedback.error('tipo')}
        <div className="therapy-form__grid">
          <div className="form-group">
            <label htmlFor={`${id}-start`}>Data inizio *</label>
            <input
              id={`${id}-start`}
              {...feedback.attributes('dataInizio')}
              className="form-input"
              type="date"
              value={value.dataInizio}
              onChange={(e) => update({ dataInizio: e.target.value })}
            />
            {feedback.error('dataInizio')}
          </div>
          {(value.tipo === 'periodica' || issues?.some((issue) => issue.field === 'dataFine')) && (
            <div className="form-group">
              <label htmlFor={`${id}-end`}>
                Data fine <span className="therapy-form__optional">(facoltativa)</span>
              </label>
              <input
                id={`${id}-end`}
                {...feedback.attributes('dataFine')}
                className="form-input"
                type="date"
                value={value.dataFine}
                onChange={(e) => update({ dataFine: e.target.value })}
              />
              {feedback.error('dataFine')}
            </div>
          )}
          {value.tipo === 'una_tantum' && (
            <>
              <div className="form-group">
                <label htmlFor={`${id}-once-date`}>Data somministrazione</label>
                <input
                  id={`${id}-once-date`}
                  {...feedback.attributes('dataSomministrazione')}
                  className="form-input"
                  type="date"
                  value={value.dataSomministrazione}
                  onChange={(e) => update({ dataSomministrazione: e.target.value })}
                />
                {feedback.error('dataSomministrazione')}
              </div>
              <div className="form-group">
                <label htmlFor={`${id}-once-time`}>Orario somministrazione</label>
                <input
                  id={`${id}-once-time`}
                  {...feedback.attributes('orarioSomministrazione')}
                  className="form-input"
                  type="time"
                  value={value.orarioSomministrazione}
                  onChange={(e) => update({ orarioSomministrazione: e.target.value })}
                />
                {feedback.error('orarioSomministrazione')}
              </div>
            </>
          )}
          <div className="form-group">
            <label htmlFor={`${id}-status`}>Stato terapia</label>
            <select
              id={`${id}-status`}
              {...feedback.attributes('stato')}
              className="form-select"
              value={value.stato}
              onChange={(e) => update({ stato: e.target.value as TherapyFormValue['stato'] })}
            >
              <option value="attiva">Attiva</option>
              <option value="sospesa">Sospesa</option>
              <option value="conclusa">Conclusa</option>
            </select>
            {feedback.error('stato')}
          </div>
        </div>
        {(value.tipo === 'periodica' ||
          issues?.some((issue) => issue.field === 'giorniSettimana')) && (
          <div className="therapy-form__weekdays">
            <span className="therapy-form__field-label">Ripeti</span>
            <div
              className="weekday-toggle"
              role="group"
              aria-label="Giorni della settimana"
              data-testid="therapy-weekdays"
              tabIndex={-1}
              {...feedback.attributes('giorniSettimana')}
            >
              <button
                type="button"
                aria-pressed={value.giorniSettimana.length === 0}
                className={`btn-sm ${value.giorniSettimana.length === 0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => update({ giorniSettimana: [] })}
              >
                Tutti i giorni
              </button>
              {WEEKDAYS.map((w) => {
                const on = value.giorniSettimana.includes(w.n);
                return (
                  <button
                    type="button"
                    key={w.n}
                    aria-pressed={on}
                    data-testid={`weekday-${w.n}`}
                    className={`btn-sm ${on ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() =>
                      update({
                        giorniSettimana: on
                          ? value.giorniSettimana.filter((x) => x !== w.n && x >= 1 && x <= 7)
                          : [...value.giorniSettimana.filter((x) => x >= 1 && x <= 7), w.n].sort(
                              (a, b) => a - b,
                            ),
                      })
                    }
                  >
                    {w.l}
                  </button>
                );
              })}
            </div>
            {feedback.error('giorniSettimana')}
          </div>
        )}
      </section>

      {value.tipo === 'periodica' && (
        <section className="therapy-form__section" aria-labelledby={`${id}-doses`}>
          <h3 id={`${id}-doses`}>
            <span aria-hidden="true">3</span> Orari e dosi
          </h3>
          {!isPatchUnit(value.pharmaceuticalForm) && (
            <details className="therapy-form__disclosure" open={hasFractions || undefined}>
              <summary>
                Divisibilità <span>Frazioni consentite</span>
              </summary>
              <div className="therapy-form__disclosure-body">
                <p className="form-hint">
                  Abilita solo le frazioni previste dalla prescrizione e consentite per il farmaco.
                </p>
                <div className="fraction-allow" role="group" aria-label="Frazioni consentite">
                  {FRACTION_PRESETS.map((p) => {
                    const active = value.allowedFractions.includes(p.key);
                    const isWhole = p.key === '1';
                    return (
                      <button
                        key={p.key}
                        type="button"
                        aria-pressed={active}
                        className={`frac-toggle${active ? ' frac-toggle--on' : ''}${isWhole ? ' frac-toggle--locked' : ''}`}
                        disabled={isWhole}
                        title={
                          isWhole
                            ? 'Dose intera sempre disponibile'
                            : `${active ? 'Disabilita' : 'Abilita'} ${p.key}`
                        }
                        onClick={() => toggleAllowedFraction(p.key)}
                      >
                        {p.label} <span className="frac-toggle__sub">{p.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </details>
          )}
          <TherapyScheduleEditor
            value={value}
            onChange={onChange}
            customQty={customQty}
            setCustomQty={setCustomQty}
            issues={issues}
          />
        </section>
      )}

      <details
        className="therapy-form__disclosure therapy-form__notes"
        open={Boolean(value.note || value.prescrittore || value.tipo === 'al_bisogno') || undefined}
      >
        <summary>
          Prescrittore e note{' '}
          <span>
            {value.tipo === 'al_bisogno' ? 'Indicazioni al bisogno' : 'Dettagli aggiuntivi'}
          </span>
        </summary>
        <div className="therapy-form__disclosure-body therapy-form__note-grid">
          <div className="form-group">
            <label htmlFor={`${id}-prescriber`}>Prescrittore</label>
            <input
              id={`${id}-prescriber`}
              className="form-input"
              value={value.prescrittore}
              placeholder="Dr. ..."
              onChange={(e) => update({ prescrittore: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${id}-notes`}>Note e indicazioni</label>
            <textarea
              id={`${id}-notes`}
              className="form-input"
              rows={3}
              value={value.note}
              onChange={(e) => update({ note: e.target.value })}
            />
          </div>
        </div>
      </details>
      <TherapyFormPreview value={value} />
    </div>
  );
}
