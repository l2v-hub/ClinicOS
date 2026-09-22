import { AiExtractionError } from '../ai/types.js';
import type { TherapyCreateInput } from '../therapies/therapy-create.js';

type Row = Record<string, unknown>;
type Source = { type: 'import' | 'manual'; index: number };
type ReviewedInput = TherapyCreateInput & { intakeSource?: Source };
const object = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.map(object) : []);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const mismatch = () =>
  new AiExtractionError(
    'config',
    'Le terapie non corrispondono alla bozza salvata. Riapri lo step Clinica, verifica le righe e riprova.',
  );

function checkReviewedForm(source: Row, input: ReviewedInput) {
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
    if (text(source[key]) !== text(input[key])) throw mismatch();
  }
  if (Number(source.commercialStrengthValue || 0) !== Number(input.commercialStrengthValue || 0))
    throw mismatch();
  if (
    (Array.isArray(source.giorniSettimana) ? source.giorniSettimana.join(',') : '') !==
    (input.giorniSettimana ?? '')
  )
    throw mismatch();
  const project = (value: unknown) =>
    rows(value).map((s) => ({
      time: text(s.time),
      quantityNumerator: s.quantityNumerator,
      quantityDenominator: s.quantityDenominator,
      administrationUnit: text(s.administrationUnit),
    }));
  if (
    source.tipo === 'periodica' &&
    JSON.stringify(project(source.schedules)) !== JSON.stringify(project(input.schedules))
  )
    throw mismatch();
}

/** Validate the selection against the persisted review, never trust a client omission. */
export function validateDraftTherapySelection(data: Row, inputs: TherapyCreateInput[] = []) {
  const imported = rows(data.terapiaImport);
  const manual = rows(data.terapia);
  const selected = new Set<string>();
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
    const source = (ref.type === 'import' ? imported : manual)[ref.index];
    if (!source || selected.has(key) || source.excludedFromConfirm === true) throw mismatch();
    selected.add(key);
    if (ref.type === 'import') {
      if (source.stato !== 'ok')
        throw new AiExtractionError(
          'config',
          'Verifica la terapia importata oppure lasciala esplicitamente in bozza.',
        );
      if (source.reviewedTherapy) checkReviewedForm(object(source.reviewedTherapy), input);
      else
        throw new AiExtractionError(
          'config',
          'Riapri la revisione della terapia importata e salva il riepilogo completo prima di confermare.',
        );
    } else checkReviewedForm(source, input);
  }
  imported.forEach((row, index) => {
    if (row.excludedFromConfirm !== true && !selected.has(`import:${index}`)) throw mismatch();
  });
  manual.forEach((_, index) => {
    if (!selected.has(`manual:${index}`)) throw mismatch();
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
      notes: text(row.originalText) || text(row.note),
      reason: 'Lasciata in bozza: non prescritta e non programmata',
    }));
}
