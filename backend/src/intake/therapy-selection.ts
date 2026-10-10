import { AiExtractionError } from '../ai/types.js';
import type { TherapyCreateInput } from '../therapies/therapy-create.js';
import { normalizeGlucoseScaleProtocol } from '../therapies/glucose-scale.js';

type Row = Record<string, unknown>;
type Source = { type: 'import' | 'manual'; index: number };
type ReviewedInput = TherapyCreateInput & { intakeSource?: Source };
const object = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.map(object) : []);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const FIELD_LABEL: Record<string, string> = {
  farmacoNome: 'nome del farmaco',
  dataInizio: 'data di inizio',
  dataFine: 'data di fine',
  viaSomministrazione: 'via di somministrazione',
  tipo: 'tipo di terapia',
  stato: 'stato',
  pharmaceuticalForm: 'forma farmaceutica',
  drugPackageRef: 'confezione',
  commercialStrengthUnit: 'unità del dosaggio',
  commercialStrengthValue: 'dosaggio',
  dataSomministrazione: 'data di somministrazione',
  orarioSomministrazione: 'orario di somministrazione',
  giorniSettimana: 'giorni della settimana',
  schedules: 'orari e quantità',
  doseMode: 'modalità dose',
  doseProtocol: 'schema glicemico',
};
const RETRY =
  'Attendi «Bozza salvata» (o riapri la scheda), verifica la riga nella sezione Terapia e riprova.';
/**
 * The confirmation differs from the saved draft (usually an autosave that did not land).
 * The message names the row as numbered in the intake page and, when known, the field —
 * never a clinical value.
 */
const mismatch = (row?: number, field?: string) =>
  new AiExtractionError(
    'config',
    row === undefined
      ? `Le terapie non corrispondono alla bozza salvata. ${RETRY}`
      : field
        ? `Terapia ${row}: il campo «${FIELD_LABEL[field] ?? field}» è diverso dalla bozza salvata. ${RETRY}`
        : `Terapia ${row}: non corrisponde alla bozza salvata. ${RETRY}`,
  );

function checkReviewedForm(source: Row, input: ReviewedInput, row: number) {
  const mode = source.doseMode === 'glucose_scale' ? 'glucose_scale' : 'fixed';
  if (mode !== (input.doseMode ?? 'fixed')) throw mismatch(row, 'doseMode');
  if (mode === 'glucose_scale') {
    const scaleRows = rows(source.glucoseScale).map((rule) => ({
      minMgDl: Number(rule.minMgDl),
      maxMgDl: rule.maxMgDl === '' || rule.maxMgDl === null ? null : Number(rule.maxMgDl),
      units: text(rule.units) === '' && typeof rule.units !== 'number' ? NaN : Number(rule.units),
    }));
    const saved = normalizeGlucoseScaleProtocol({ kind: 'blood_glucose', rules: scaleRows });
    const submitted = normalizeGlucoseScaleProtocol(input.doseProtocol);
    if (JSON.stringify(saved) !== JSON.stringify(submitted)) throw mismatch(row, 'doseProtocol');
  }
  for (const key of [
    'farmacoNome',
    'dataInizio',
    'dataFine',
    'viaSomministrazione',
    'tipo',
    'stato',
    'pharmaceuticalForm',
    'drugPackageRef',
    'commercialStrengthUnit',
    'dataSomministrazione',
    'orarioSomministrazione',
  ] as const) {
    // One-off dates are irrelevant outside a one-off prescription.
    if (
      ['dataSomministrazione', 'orarioSomministrazione'].includes(key) &&
      source.tipo !== 'una_tantum'
    )
      continue;
    if (text(source[key]) !== text(input[key])) throw mismatch(row, key);
  }
  if (Number(source.commercialStrengthValue || 0) !== Number(input.commercialStrengthValue || 0))
    throw mismatch(row, 'commercialStrengthValue');
  if (
    (Array.isArray(source.giorniSettimana) ? source.giorniSettimana.join(',') : '') !==
    (input.giorniSettimana ?? '')
  )
    throw mismatch(row, 'giorniSettimana');
  const project = (value: unknown) =>
    rows(value).map((s) => ({
      time: text(s.time),
      ...(mode === 'fixed'
        ? {
            quantityNumerator: s.quantityNumerator,
            quantityDenominator: s.quantityDenominator,
            administrationUnit: text(s.administrationUnit),
          }
        : {}),
    }));
  if (
    source.tipo === 'periodica' &&
    JSON.stringify(project(source.schedules)) !== JSON.stringify(project(input.schedules))
  )
    throw mismatch(row, 'schedules');
}

/** Validate the selection against the persisted review, never trust a client omission. */
export function validateDraftTherapySelection(data: Row, inputs: TherapyCreateInput[] = []) {
  const imported = rows(data.terapiaImport);
  const manual = rows(data.terapia);
  const selected = new Set<string>();
  // Same numbering as the intake page: imported rows first, then manual rows.
  const ordinal = (type: Source['type'], index: number) =>
    (type === 'import' ? 0 : imported.length) + index + 1;
  for (const raw of inputs) {
    const input = raw as ReviewedInput;
    const ref = input.intakeSource;
    // Keep complete legacy/manual API calls compatible when no rows are held in the draft.
    if (!imported.length && !manual.length && !ref) continue;
    if (
      !ref ||
      !['import', 'manual'].includes(ref.type) ||
      !Number.isInteger(ref.index) ||
      ref.index < 0
    )
      throw mismatch();
    const key = `${ref.type}:${ref.index}`;
    const row = ordinal(ref.type, ref.index);
    const source = (ref.type === 'import' ? imported : manual)[ref.index];
    if (!source || selected.has(key)) throw mismatch(row);
    if (source.excludedFromConfirm === true)
      throw new AiExtractionError(
        'config',
        `Terapia ${row}: è lasciata in bozza nella scheda salvata. ${RETRY}`,
      );
    selected.add(key);
    if (ref.type === 'import') {
      if (source.sourceOutdated === true || source.conflictDeferred === true)
        throw new AiExtractionError(
          'config',
          `Terapia ${row}: la fonte della terapia è cambiata o è stata rinviata. Verifica la riga oppure lasciala in bozza.`,
        );
      if (source.stato !== 'ok')
        throw new AiExtractionError(
          'config',
          `Terapia ${row}: verifica la terapia importata («Ho verificato questa terapia») oppure lasciala esplicitamente in bozza.`,
        );
      if (source.reviewedTherapy) checkReviewedForm(object(source.reviewedTherapy), input, row);
      else
        throw new AiExtractionError(
          'config',
          `Terapia ${row}: riapri la revisione della terapia importata e salva il riepilogo completo prima di confermare.`,
        );
    } else checkReviewedForm(source, input, row);
  }
  const omitted = (index: number, type: Source['type']) =>
    new AiExtractionError(
      'config',
      `Terapia ${ordinal(type, index)}: manca dalla conferma ma è inclusa nella bozza salvata. ${RETRY}`,
    );
  imported.forEach((row, index) => {
    if (row.excludedFromConfirm !== true && !selected.has(`import:${index}`))
      throw omitted(index, 'import');
  });
  manual.forEach((_, index) => {
    if (!selected.has(`manual:${index}`)) throw omitted(index, 'manual');
  });
  return {
    version: 1,
    selectedSources: [...selected],
    deferredImportIndexes: imported.flatMap((row, index) =>
      row.excludedFromConfirm === true ? [index] : [],
    ),
  };
}

export function deferredTherapies(data: Row) {
  return rows(data.terapiaImport)
    .filter((row) => row.excludedFromConfirm === true)
    .map((row) => ({
      name: text(row.farmacoNome) || 'Farmaco da verificare',
      dose: text(row.dosaggio),
      route: text(row.viaSomministrazione),
      frequency: Array.isArray(row.giorni) ? row.giorni.map(text).join(', ') : '',
      times: Array.isArray(row.orari) ? row.orari.map(text) : [],
      notes: text(row.originalText) || (row.structuredSource !== undefined
        ? `Dati estratti automaticamente — confronta il documento: ${JSON.stringify(row.structuredSource)}`
        : text(row.note)),
      reason: 'Lasciata in bozza: non prescritta e non programmata',
    }));
}
