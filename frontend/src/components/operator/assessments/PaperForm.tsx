// Compilation of a paper-version scale (Barthel, Tinetti v2, GDS-15 v2, MNA-SF, UCLA-NPI sleep)
// and of PAINAD: the paper sheet itself is the form.
import { useEffect, useRef, useState } from 'react';
import type {
  AssessmentDraft,
  AssessmentDraftStore,
} from '../../../lib/assessments/assessmentDraftStore';
import type { PaperItem, PaperScale } from '../../../lib/assessments/paper/definitions';
import {
  MEASURE_LIMITS,
  answeredPaperCount,
  bmiPoints,
  calfPoints,
  mnaBmi,
  paperResult,
  type PaperAnswerValue,
  type PaperAnswers,
} from '../../../lib/assessments/paper/engine';
import type { PatientIdentityData } from '../../../lib/patientIdentity';
import { AssessmentDateFields } from './AssessmentDateFields';
import { PaperSheet } from './PaperSheet';
import { partialTotal } from '../../../lib/assessments/paper/paperLayout';
import { measureText, paperFields } from './paperFields';
import { assessmentEditable } from '../../../lib/assessments/assessmentTime';
import './PainadCompilation.css';

type MeasureKey = 'weightKg' | 'heightM' | 'calfCm';
const parseMeasure = (raw: string): number | null | 'invalid' => {
  const value = raw.trim();
  if (!value) return null;
  if (!/^\d+([.,]\d+)?$/.test(value)) return 'invalid';
  return Number(value.replace(',', '.'));
};

export function PaperForm({
  draft,
  store,
  scale,
  patient,
  operatorName,
  onSave,
  onPreview,
  focusCompilation = false,
}: {
  draft: AssessmentDraft;
  store: AssessmentDraftStore;
  scale: PaperScale;
  patient: PatientIdentityData;
  operatorName: string;
  onSave: () => void;
  onPreview: () => void;
  focusCompilation?: boolean;
}) {
  const root = useRef<HTMLFormElement>(null);
  const focused = focusCompilation && scale.type === 'painad';
  const focusedKey = useRef<string | null>(null);
  const answers = draft.fields.answers as PaperAnswers;
  const locked = draft.busy || !!draft.pending;
  const result = paperResult(scale, answers);
  const count = answeredPaperCount(scale, answers);
  const missing = draft.failure?.missingPaths ?? [];
  const [raw, setRaw] = useState<Partial<Record<MeasureKey, string>>>(() =>
    Object.fromEntries(
      (scale.measures ?? []).map((key) => [
        key,
        typeof answers[key] === 'number' ? String(answers[key]).replace('.', ',') : '',
      ]),
    ),
  );
  const measureErrors = Object.fromEntries(
    (scale.measures ?? []).flatMap((key) => {
      const parsed = parseMeasure(raw[key] ?? '');
      const limit = MEASURE_LIMITS[key];
      if (parsed === 'invalid') return [[key, `${limit.label}: inserisci un numero (es. 1,65).`]];
      if (parsed !== null && (parsed < limit.min || parsed > limit.max))
        return [[key, `${limit.label}: valore ammesso ${limit.min}–${limit.max}.`]];
      return [];
    }),
  ) as Partial<Record<MeasureKey, string>>;
  const invalidMeasures = Object.keys(measureErrors).length > 0;
  const update = (next: PaperAnswers) => store.update(draft.key, { answers: next });
  /** MNA-SF: with weight and height F1 follows the BMI; with only the calf F2 follows it. */
  const derive = (next: PaperAnswers): PaperAnswers => {
    if (!scale.measures) return next;
    const bmi = mnaBmi(next.weightKg as number | null, next.heightM as number | null);
    if (bmi !== null) return { ...next, f1: bmiPoints(bmi), f2: null };
    if (typeof next.calfCm === 'number' && next.f1 === null)
      return { ...next, f2: calfPoints(next.calfCm) };
    return next;
  };
  const change = (key: string, value: PaperAnswerValue) => {
    let next: PaperAnswers = { ...answers, [key]: value };
    const item = scale.sections
      .flatMap((section) => section.items)
      .find((entry) => entry.key === key);
    if (item?.group && value !== null)
      for (const other of scale.sections.flatMap((section) => section.items))
        if (other.group === item.group && other.key !== key) next = { ...next, [other.key]: null };
    if (key === 'frequency' && value === 0) next = { ...next, severity: null, distress: null };
    update(derive(next));
  };
  const changeMeasure = (key: MeasureKey, value: string) => {
    setRaw((previous) => ({ ...previous, [key]: value }));
    const parsed = parseMeasure(value);
    const limit = MEASURE_LIMITS[key];
    if (parsed === 'invalid' || (parsed !== null && (parsed < limit.min || parsed > limit.max)))
      return;
    update(derive({ ...answers, [key]: parsed }));
  };
  useEffect(() => {
    const path = draft.failure?.missingPaths?.[0];
    if (!path) return;
    const field = [
      ...(root.current?.querySelectorAll<HTMLElement>('[data-field-path]') ?? []),
    ].find((element) => element.dataset.fieldPath === path);
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [draft.failure]);
  useEffect(() => {
    if (!focused || !root.current) return;
    const form = root.current;
    const toolbar = form.querySelector<HTMLElement>('.painad-compilation-toolbar');
    const topbar = document.querySelector<HTMLElement>('.compact-topbar');
    const identity = form.closest('.assessment-workspace')?.querySelector<HTMLElement>('.assessment-patient');
    const measure = () => {
      const offset = (window.innerWidth <= 1023 ? (topbar?.getBoundingClientRect().height ?? 0) : 0) + (identity?.offsetHeight ?? 0);
      form.style.setProperty('--painad-top-offset', `${offset}px`);
      form.style.setProperty('--painad-focus-offset', `${offset + (toolbar?.offsetHeight ?? 0) + 24}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (toolbar) observer.observe(toolbar);
    if (topbar) observer.observe(topbar);
    if (identity) observer.observe(identity);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [focused]);
  useEffect(() => {
    if (!focused || locked || focusedKey.current === draft.key) return;
    focusedKey.current = draft.key;
    // Do not steal focus from validation errors or on each response/save render.
    if (draft.failure?.missingPaths?.length) return;
    const first = root.current?.querySelector<HTMLInputElement>('input[data-field-path="respiration"]:not(:disabled)');
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [focused, draft.key, locked, draft.failure]);
  const measureInput = (key: MeasureKey, label: string) => (
    <span className="paper-measure">
      <input
        className="form-input"
        inputMode="decimal"
        aria-label={label}
        data-field-path={key}
        value={raw[key] ?? ''}
        disabled={locked}
        aria-invalid={!!measureErrors[key] || undefined}
        onChange={(event) => changeMeasure(key, event.target.value)}
      />
      {measureErrors[key] && <span role="alert">{measureErrors[key]}</span>}
    </span>
  );
  const assessedAt = (() => {
    try {
      return assessmentEditable(draft.fields, false, draft.type).assessedAt;
    } catch {
      return '';
    }
  })();
  const bmi = mnaBmi(answers.weightKg as number | null, answers.heightM as number | null);
  const itemExtra = (item: PaperItem) =>
    item.key === 'f1' && scale.measures ? (
      <span className="paper-measure">
        BMI calcolato:{' '}
        <strong>{bmi === null ? '—' : measureText(Math.round(bmi * 10) / 10, 1)}</strong>
      </span>
    ) : item.key === 'f2' && scale.measures ? (
      <span className="paper-measure">
        Circonferenza (cm): {measureInput('calfCm', 'Circonferenza del polpaccio (cm)')}
      </span>
    ) : null;
  return (
    <form
      ref={root}
      className={`assessment-form paper-form${focused ? ' paper-form--focused' : ''}`}
      aria-busy={draft.busy}
      onInvalidCapture={(event) => {
        if (!focused || !(event.target instanceof HTMLElement)) return;
        const metadata = event.target.closest<HTMLDetailsElement>('.painad-metadata');
        if (!metadata) return;
        metadata.open = true;
        event.target.focus({ preventScroll: true });
        event.target.scrollIntoView({ block: 'center', behavior: 'instant' });
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalidMeasures) onSave();
      }}
    >
      {focused && <div className="painad-compilation-toolbar" role="region" aria-label="Azioni compilazione PAINAD">
        <div role="status" aria-live="polite">
          <strong>Bozza in modifica · {count} di 5 risposte</strong>
          <span>{result ? 'Compilazione completa · da verificare' : `Compilazione in corso · punteggio parziale ${partialTotal(scale, answers)} / ${scale.maximum}`}</span>
        </div>
        <div className="assessment-actions">
          <button type="submit" className="btn-secondary" disabled={locked || !draft.dirty || invalidMeasures}>{draft.busy ? 'Salvataggio…' : 'Salva bozza'}</button>
          <button type="button" className="btn-primary" disabled={locked || !result || invalidMeasures} onClick={onPreview}>Salva e verifica anteprima</button>
        </div>
      </div>}
      {focused ? <details className="painad-metadata" open={draft.predecessorId ? true : undefined}>
        <summary>Data e compilatore · {operatorName}</summary>
        <AssessmentDateFields draft={draft} store={store} />
        <p className="assessment-hint">La bozza resta disponibile dopo il ricaricamento in questa scheda. Salvala sul server per ritrovarla dopo l’accesso successivo.</p>
      </details> : <AssessmentDateFields draft={draft} store={store} />}
      <PaperSheet
        scale={scale}
        compactCompilation={focused}
        answers={answers}
        result={result}
        answeredCount={count}
        onChange={change}
        disabled={locked}
        missing={missing}
        itemExtra={itemExtra}
        signatureName={operatorName}
        fields={paperFields(scale, {
          patient,
          assessedAt,
          authorName: operatorName,
          total: `${result?.total ?? partialTotal(scale, answers)} / ${scale.maximum}`,
          measures: {
            weight: measureInput('weightKg', 'Peso (kg)'),
            height: measureInput('heightM', 'Altezza (m)'),
          },
        })}
      />
      {!focused && <div className="assessment-actions">
        <button
          type="submit"
          className="btn-secondary"
          disabled={locked || !draft.dirty || invalidMeasures}
        >
          {draft.busy ? 'Salvataggio…' : 'Salva bozza'}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={locked || !result || invalidMeasures}
          onClick={onPreview}
        >
          Salva e verifica anteprima
        </button>
      </div>}
    </form>
  );
}
