import { useEffect, useRef, useState } from 'react';
import { useParameterEntryDraft } from '../../lib/useParameterEntryDraft';
import type { ParameterDraftStore } from '../../lib/parameterEntryDrafts';
import type { ParameterPagePatient } from '../../lib/patientParametersPage';
import { patientIdentifier, patientIdentityName } from '../../lib/patientIdentity';
import {
  PARAMETER_FIELDS,
  PARAMETER_OPTIONS,
  PARAMETER_READING_SAVED_EVENT,
  ParameterReadingSaveError,
  fetchParameterReadings,
  readingTime,
  type ParameterReadingRequest,
  type ParameterValues,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import {
  PAD_FIELDS,
  applyPadKey,
  nextPadField,
  padUpdate,
  padValue,
  previousText,
  previousValues,
  padInput,
  type PadField,
  type PreviousKey,
} from '../../lib/parameterPad';
import { NEWS2_LABELS, news2 } from '../../lib/news2';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { IcoCheck, IcoChevronRight } from '../../icons';

type PreviousState = Parameters<typeof previousText>[0];

const COSCIENZA_SHORT: Record<string, string> = {
  A: 'A · Vigile',
  C: 'C · Confuso',
  V: 'V · Alla voce',
  P: 'P · Al dolore',
  U: 'U · Non risponde',
};
const RISK_CLASS: Record<string, string> = {
  nessuno: 'ok',
  basso: 'low',
  'basso-singolo': 'single',
  medio: 'medium',
  alto: 'high',
};

interface Props {
  patient: ParameterPagePatient;
  draftStore: ParameterDraftStore;
  noteCount?: number;
  /** Riepilogo del giorno ancora in verifica (conteggio note non ancora noto). */
  summaryPending?: boolean;
  /** Il paziente del modulo non è fra i risultati della ricerca in corso. */
  outsideResults?: boolean;
  onOpenHistory: () => void;
  onSave: (request: ParameterReadingRequest) => Promise<PatientParameterReading>;
}

/** Rilevazione di un paziente: card dei valori, tastierino, NEWS2 in tempo reale, salvataggio. */
export function ParameterEntryPanel({
  patient,
  draftStore,
  noteCount,
  summaryPending = false,
  outsideResults = false,
  onOpenHistory,
  onSave,
}: Props) {
  const { store, draft } = useParameterEntryDraft(patient.id, draftStore);
  const { values, saving, error, uncertain, savedAt } = draft;
  // null: il fuoco è in un campo di testo (evacuazione, nota) e il tastierino non scrive.
  const [active, setActive] = useState<PadField | null>('fr');
  const inputs = useRef(new Map<PadField, HTMLInputElement>());
  const name = patientIdentityName(patient);
  const locked = saving || uncertain;
  const hasValues = PARAMETER_FIELDS.some((field) => values[field.key]?.trim());

  // Ultimi valori registrati (lettura reale), aggiornati dopo ogni salvataggio del paziente.
  const [previous, setPrevious] = useState<{ id: string; state: PreviousState }>({
    id: patient.id,
    state: { status: 'loading' },
  });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchParameterReadings(
      API_URL,
      patient.id,
      {},
      { headers: operatorHeaders(), signal: controller.signal },
    )
      .then((page) =>
        setPrevious({
          id: patient.id,
          state: {
            status: 'ready',
            values: previousValues(page.readings),
            hasMore: page.hasMore,
            count: page.readings.length,
          },
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setPrevious({ id: patient.id, state: { status: 'error' } });
      });
    return () => controller.abort();
  }, [patient.id, reload]);
  useEffect(() => {
    const onSaved = (event: Event) => {
      if ((event as CustomEvent<{ patientId?: string }>).detail?.patientId === patient.id)
        setReload((value) => value + 1);
    };
    window.addEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(PARAMETER_READING_SAVED_EVENT, onSaved);
  }, [patient.id]);
  const prevState: PreviousState =
    previous.id === patient.id ? previous.state : { status: 'loading' };

  function set(key: keyof ParameterValues, value: string) {
    store.update(patient.id, key, value);
  }
  function setPad(key: PadField, text: string) {
    const [field, value] = padUpdate(values, key, text);
    set(field, value);
  }
  function focusField(key: PadField) {
    setActive(key);
    inputs.current.get(key)?.focus();
  }
  function press(key: string) {
    if (locked || !active) return;
    const field = PAD_FIELDS.find((f) => f.key === active)!;
    setPad(active, applyPadKey(padValue(values, active), key, field.decimals));
  }
  async function save() {
    const token = store.begin(patient.id);
    if (!token) return;
    try {
      const saved = await onSave(token.request);
      store.succeed(token, saved.measuredAt);
      setActive('fr');
    } catch (cause) {
      const unknownOutcome = !(cause instanceof ParameterReadingSaveError) || cause.uncertain;
      store.fail(
        token,
        cause instanceof Error ? cause.message : 'Salvataggio non verificato. Riprova.',
        unknownOutcome,
      );
    }
  }
  function previousLine(key: PreviousKey) {
    return previousText(prevState, key);
  }
  const noteLine =
    noteCount !== undefined
      ? `${noteCount} ${noteCount === 1 ? 'nota salvata' : 'note salvate'} oggi`
      : summaryPending
        ? 'verifica note in corso'
        : 'conteggio note non disponibile';

  const score = news2(values);
  const anyNews2 = score.missing.length < 7;
  return (
    <>
      <section className="par-form" aria-label={`Rilevazione di ${name}`}>
        {outsideResults && (
          <p className="par-outside" role="status">
            {name} non è nei risultati della ricerca: questa rilevazione resta sua.
          </p>
        )}
        <div className="par-form__head">
          <div className="par-form__who">
            <h2 className="par-form__name">{name}</h2>
            <span className="par-cap">{patientIdentifier(patient)}</span>
          </div>
          <button type="button" className="ds-link" onClick={onOpenHistory}>
            Storico
          </button>
        </div>
        <div className="par-cards">
          {PAD_FIELDS.map((field) => {
            const value = padValue(values, field.key);
            const id = `par-${patient.id}-${field.key}`;
            return (
              <label
                key={field.key}
                htmlFor={id}
                className={`par-card${active === field.key ? ' par-card--active' : ''}`}
              >
                <span className="par-card__label">{field.label}</span>
                <span className="par-card__value">
                  <input
                    id={id}
                    ref={(el) => {
                      if (el) inputs.current.set(field.key, el);
                      else inputs.current.delete(field.key);
                    }}
                    className="par-card__input"
                    value={value}
                    placeholder="—"
                    inputMode={field.decimals ? 'decimal' : 'numeric'}
                    // Nessun maxLength: il browser non deve troncare un valore incollato o dettato.
                    disabled={locked}
                    aria-label={`${field.label} (${field.unit}) per ${name}`}
                    onFocus={() => setActive(field.key)}
                    onChange={(event) => {
                      const next = padInput(values, field.key, event.target.value);
                      if (!next) return;
                      set(next.field, next.value);
                      if (next.split) focusField('pad');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        const next = nextPadField(field.key);
                        if (next) focusField(next);
                        else void save();
                      }
                    }}
                  />
                  <span className="par-card__unit">{field.unit}</span>
                </span>
                <span className="par-cap">{previousLine(field.key)}</span>
              </label>
            );
          })}
        </div>
        <div className="par-choice">
          <span className="par-choice__label" id={`par-o2-${patient.id}`}>
            Ossigeno
          </span>
          <div className="ds-chip-group" role="group" aria-labelledby={`par-o2-${patient.id}`}>
            {PARAMETER_OPTIONS.o2!.map((option) => (
              <button
                type="button"
                key={option.value}
                className="ds-chip"
                aria-pressed={values.o2 === option.value}
                disabled={locked}
                onClick={() => set('o2', values.o2 === option.value ? '' : option.value)}
              >
                {option.value === 'si' ? 'Con O2' : 'In aria'}
              </button>
            ))}
          </div>
          <span className="par-cap">{previousLine('o2')}</span>
        </div>
        <div className="par-choice">
          <span className="par-choice__label" id={`par-acvpu-${patient.id}`}>
            Coscienza
          </span>
          <div className="ds-chip-group" role="group" aria-labelledby={`par-acvpu-${patient.id}`}>
            {PARAMETER_OPTIONS.coscienza!.map((option) => (
              <button
                type="button"
                key={option.value}
                className="ds-chip"
                title={option.label}
                aria-label={option.label}
                aria-pressed={values.coscienza === option.value}
                disabled={locked}
                onClick={() =>
                  set('coscienza', values.coscienza === option.value ? '' : option.value)
                }
              >
                {COSCIENZA_SHORT[option.value] ?? option.label}
              </button>
            ))}
          </div>
          <span className="par-cap">{previousLine('coscienza')}</span>
        </div>
        <div className="par-extra">
          <label className="par-field">
            <span className="par-choice__label">Evacuazione</span>
            <input
              className="form-input par-text"
              value={values.evacuazione ?? ''}
              maxLength={200}
              disabled={locked}
              aria-label={`Evacuazione per ${name}`}
              onFocus={() => setActive(null)}
              onChange={(event) => set('evacuazione', event.target.value)}
            />
          </label>
          <label className="par-field">
            <span className="par-choice__label">Nota · {noteLine}</span>
            <textarea
              className="form-input par-text"
              rows={2}
              maxLength={2000}
              value={values.note ?? ''}
              disabled={locked}
              aria-label={`Note per ${name}`}
              onFocus={() => setActive(null)}
              onChange={(event) => set('note', event.target.value)}
            />
          </label>
        </div>
      </section>
      <aside className="par-side" aria-label="Tastierino e salvataggio">
        <div className="par-pad" role="group" aria-label="Tastierino numerico">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'back'].map((key) => (
            <button
              type="button"
              key={key}
              className="par-pad__key"
              disabled={
                locked ||
                !active ||
                (key === ',' && !PAD_FIELDS.find((f) => f.key === active)?.decimals)
              }
              aria-label={key === 'back' ? 'Cancella' : key === ',' ? 'Virgola' : key}
              // Il tastierino non ruba il fuoco al campo attivo.
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => press(key)}
            >
              {key === 'back' ? '⌫' : key}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ds-btn ds-btn--secondary par-wide"
          disabled={locked}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            const next = active ? nextPadField(active) : null;
            focusField(next ?? 'fr');
          }}
        >
          Campo successivo
          <IcoChevronRight />
        </button>
        <div
          className={`par-news2${score.complete ? ` par-news2--${RISK_CLASS[score.risk!]}` : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="par-news2__title">NEWS2 in tempo reale</span>
          <span className="par-news2__score">{score.complete ? score.total : '—'}</span>
          <span className="par-news2__text">
            {score.complete
              ? score.response
              : anyNews2
                ? `Mancano: ${score.missing.map((key) => NEWS2_LABELS[key]).join(', ')}`
                : 'Inserisci i valori'}
          </span>
        </div>
        <button
          type="button"
          className="ds-btn ds-btn--primary par-wide"
          disabled={saving || !hasValues}
          aria-busy={saving}
          aria-label={`Salva parametri per ${name}`}
          onClick={() => void save()}
        >
          <IcoCheck />
          {saving ? 'Salvo…' : uncertain ? 'Riprova' : 'Salva parametri'}
        </button>
        {savedAt && (
          <p className="par-result" role="status">
            Rilevazione archiviata · {readingTime(savedAt)}
          </p>
        )}
        {error && (
          <div className="par-error" role="alert">
            {error}
            {uncertain && (
              <button className="ds-link" type="button" onClick={onOpenHistory}>
                Controlla lo storico
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
