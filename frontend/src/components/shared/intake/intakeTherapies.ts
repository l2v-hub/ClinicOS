import type { TherapyFormValue } from '../../operator/cartella/TherapyFormFields';
import { VIA_OPTIONS } from '../../operator/cartella/TherapyFormFields';
import { dischargeRowToTherapyInput, type DischargeTherapyRow } from './dischargeTherapy';
import { therapyFormToInput } from './therapyFormPayload';

const hasText = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const validTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);
function validDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Field-only messages: safe for feedback, without copying clinical values into errors. */
export function therapyInputIssues(input: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (!hasText(input.farmacoNome)) issues.push('Indica il nome del farmaco');
  if (!validDate(input.dataInizio)) issues.push('Indica una data di inizio valida');
  if (
    input.dataFine &&
    (!validDate(input.dataFine) || String(input.dataFine) < String(input.dataInizio))
  )
    issues.push('La data di fine deve essere valida e non precedere l’inizio');
  if (!VIA_OPTIONS.includes(String(input.viaSomministrazione)))
    issues.push('Verifica la via di somministrazione');
  if (!['periodica', 'una_tantum', 'al_bisogno'].includes(String(input.tipo)))
    issues.push('Verifica il tipo di terapia');
  if (!['attiva', 'sospesa', 'conclusa'].includes(String(input.stato)))
    issues.push('Verifica lo stato della terapia');
  if (
    input.commercialStrengthValue !== undefined &&
    (!Number.isFinite(input.commercialStrengthValue) ||
      Number(input.commercialStrengthValue) <= 0 ||
      !hasText(input.commercialStrengthUnit))
  )
    issues.push('Verifica dosaggio commerciale e unità');
  if (input.giorniSettimana && !/^[1-7](,[1-7])*$/.test(String(input.giorniSettimana)))
    issues.push('Verifica i giorni della settimana');
  if (
    input.tipo === 'una_tantum' &&
    (!validDate(input.dataSomministrazione) || !validTime(input.orarioSomministrazione))
  )
    issues.push('Indica data e orario della somministrazione');
  if (input.tipo === 'periodica') {
    const schedules = Array.isArray(input.schedules) ? input.schedules : [];
    if (!schedules.length || schedules.length > 32) issues.push('Inserisci da 1 a 32 orari');
    const seen = new Set<string>();
    schedules.forEach((s, index) => {
      if (!s || !validTime(s.time))
        issues.push(`Orario ${index + 1}: indica un’ora valida (00:00–23:59)`);
      if (
        !s ||
        ![s.quantityNumerator, s.quantityDenominator].every(
          (v) => Number.isSafeInteger(v) && v > 0 && v <= 1000,
        )
      )
        issues.push(`Orario ${index + 1}: indica una quantità valida`);
      if (!s || !hasText(s.administrationUnit) || s.administrationUnit.length > 64)
        issues.push(`Orario ${index + 1}: scegli l’unità di somministrazione`);
      const key = `${String(s?.time).padStart(5, '0')}|${String(s?.administrationUnit).trim()}`;
      if (seen.has(key)) issues.push(`Orario ${index + 1}: elimina l’orario duplicato`);
      seen.add(key);
    });
  }
  return issues;
}

export function buildIntakeTherapyReview(data: Record<string, unknown>, operatorName?: string) {
  const imported = Array.isArray(data.terapiaImport) ? data.terapiaImport : [];
  const manual = Array.isArray(data.terapia) ? data.terapia : [];
  // The index is shared by recap, payload and server error messages.
  return [
    ...imported.map((row: DischargeTherapyRow) => ({ row, source: 'import' as const })),
    ...manual.map((row: TherapyFormValue) => ({ row, source: 'manual' as const })),
  ].map(({ row, source }, i) => {
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
      source === 'import' && (row as DischargeTherapyRow)?.stato === 'da_verificare';
    const issues = therapyInputIssues(input);
    if (requiresSourceReview)
      issues.push('Verifica i dati estratti confrontandoli con il documento');
    return {
      index: i + 1,
      source,
      input,
      issues,
      requiresSourceReview,
      name: hasText(input.farmacoNome) ? input.farmacoNome : 'Farmaco da indicare',
      times,
    };
  });
}
