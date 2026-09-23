import type { TherapyFormValue } from '../../operator/cartella/TherapyFormFields';
import { VIA_OPTIONS } from '../../operator/cartella/TherapyFormFields';
import {
  dischargeRowToTherapyInput,
  dischargeRowToTherapyForm,
  type DischargeTherapyRow,
} from './dischargeTherapy';
import { therapyFormToInput } from './therapyFormPayload';
import { isPatchUnit } from '../../operator/cartella/therapyDose';
import type { TherapyFieldIssue } from '../../operator/cartella/therapyFieldFeedback';
import type { IntakeTherapyDiagnostic } from './intakeTherapyNavigation';

const hasText = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const validTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);

/** Bind the final payload to the exact full form persisted in its source draft. */
export function prepareIntakeConfirmData<T extends Record<string, unknown>>(data: T): T {
  if (!Array.isArray(data.terapiaImport)) return data;
  return {
    ...data,
    terapiaImport: data.terapiaImport.map((row: DischargeTherapyRow) =>
      row.excludedFromConfirm || row.reviewedTherapy
        ? row
        : {
            ...row,
            reviewedTherapy: dischargeRowToTherapyForm(row),
          },
    ),
  };
}
function validDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Field-only messages: safe for feedback, without copying clinical values into errors. */
export function therapyInputDiagnostics(input: Record<string, unknown>): TherapyFieldIssue[] {
  const issues: TherapyFieldIssue[] = [];
  const add = (field: TherapyFieldIssue['field'], message: string, scheduleIndex?: number) =>
    issues.push({ field, message, ...(scheduleIndex === undefined ? {} : { scheduleIndex }) });
  if (!hasText(input.farmacoNome)) add('farmacoNome', 'Indica il nome del farmaco');
  if (!validDate(input.dataInizio)) add('dataInizio', 'Indica una data di inizio valida');
  if (
    input.dataFine &&
    (!validDate(input.dataFine) || String(input.dataFine) < String(input.dataInizio))
  )
    add('dataFine', 'La data di fine deve essere valida e non precedere l’inizio');
  if (!VIA_OPTIONS.includes(String(input.viaSomministrazione)))
    add('viaSomministrazione', 'Verifica la via di somministrazione');
  if (!['periodica', 'una_tantum', 'al_bisogno'].includes(String(input.tipo)))
    add('tipo', 'Verifica il tipo di terapia');
  if (!['attiva', 'sospesa', 'conclusa'].includes(String(input.stato)))
    add('stato', 'Verifica lo stato della terapia');
  if (input.commercialStrengthValue !== undefined) {
    if (
      !Number.isFinite(input.commercialStrengthValue) ||
      Number(input.commercialStrengthValue) <= 0
    )
      add('commercialStrengthValue', 'Verifica dosaggio commerciale e unità');
    if (!hasText(input.commercialStrengthUnit))
      add('commercialStrengthUnit', 'Verifica dosaggio commerciale e unità');
  }
  if (input.giorniSettimana && !/^[1-7](,[1-7])*$/.test(String(input.giorniSettimana)))
    add('giorniSettimana', 'Verifica i giorni della settimana');
  if (input.tipo === 'una_tantum') {
    if (!validDate(input.dataSomministrazione))
      add('dataSomministrazione', 'Indica data e orario della somministrazione');
    if (!validTime(input.orarioSomministrazione))
      add('orarioSomministrazione', 'Indica data e orario della somministrazione');
  }
  if (input.tipo === 'periodica') {
    const schedules = Array.isArray(input.schedules) ? input.schedules : [];
    if (!schedules.length || schedules.length > 32) add('schedules', 'Inserisci da 1 a 32 orari');
    const seen = new Set<string>();
    schedules.forEach((s, index) => {
      if (!s || !validTime(s.time))
        add('time', `Orario ${index + 1}: indica un’ora valida (00:00–23:59)`, index);
      if (
        !s ||
        ![s.quantityNumerator, s.quantityDenominator].every(
          (v) => Number.isSafeInteger(v) && v > 0 && v <= 1000,
        )
      )
        add('quantity', `Orario ${index + 1}: indica una quantità valida`, index);
      if (!s || !hasText(s.administrationUnit) || s.administrationUnit.length > 64)
        add('administrationUnit', `Orario ${index + 1}: scegli l’unità di somministrazione`, index);
      if (
        s &&
        hasText(s.administrationUnit) &&
        isPatchUnit(s.administrationUnit) &&
        s.quantityNumerator % s.quantityDenominator !== 0
      )
        add('quantity', `Orario ${index + 1}: i cerotti non possono essere divisi`, index);
      const key = `${String(s?.time).padStart(5, '0')}|${String(s?.administrationUnit).trim()}`;
      if (seen.has(key)) add('time', `Orario ${index + 1}: elimina l’orario duplicato`, index);
      seen.add(key);
    });
  }
  return issues;
}

/** Compatibility wrapper for confirmation and callers that only need blocking messages. */
export function therapyInputIssues(input: Record<string, unknown>): string[] {
  return [...new Set(therapyInputDiagnostics(input).map((issue) => issue.message))];
}

export function buildIntakeTherapyReview(data: Record<string, unknown>, operatorName?: string) {
  const imported = Array.isArray(data.terapiaImport) ? data.terapiaImport : [];
  const manual = Array.isArray(data.terapia) ? data.terapia : [];
  // Display ordinals include excluded rows; correction targets use the original source index.
  return [
    ...imported.map((row: DischargeTherapyRow, sourceIndex) => ({
      row,
      sourceIndex,
      source: 'import' as const,
    })),
    ...manual.map((row: TherapyFormValue, sourceIndex) => ({
      row,
      sourceIndex,
      source: 'manual' as const,
    })),
  ].map(({ row, source, sourceIndex }, i) => {
    let input: Record<string, unknown>;
    try {
      input =
        source === 'import'
          ? dischargeRowToTherapyInput(row as DischargeTherapyRow, operatorName)
          : therapyFormToInput(row as TherapyFormValue, operatorName);
    } catch {
      input = {};
    }
    const schedules = Array.isArray(input.schedules) ? input.schedules : [];
    const times: string[] =
      input.tipo === 'una_tantum'
        ? [input.orarioSomministrazione].filter(hasText)
        : schedules.map((s) => s?.time).filter(hasText);
    const requiresSourceReview =
      source === 'import' &&
      ((row as DischargeTherapyRow)?.stato === 'da_verificare' ||
        (row as DischargeTherapyRow)?.sourceOutdated === true);
    const fields = therapyInputDiagnostics(input);
    if (requiresSourceReview)
      fields.push({
        field: 'sourceReview',
        message: 'Verifica i dati estratti confrontandoli con il documento',
      });
    const diagnostics: IntakeTherapyDiagnostic[] = fields.map((issue) => ({
      ...issue,
      type: source,
      index: sourceIndex,
    }));
    const issues = [...new Set(diagnostics.map((issue) => issue.message))];
    return {
      index: i + 1,
      source,
      input: { ...input, intakeSource: { type: source, index: sourceIndex } },
      excluded: source === 'import' && (row as DischargeTherapyRow)?.excludedFromConfirm === true,
      sourceIndex,
      issues,
      diagnostics,
      requiresSourceReview,
      name: hasText(input.farmacoNome) ? input.farmacoNome : 'Farmaco da indicare',
      times,
    };
  });
}
