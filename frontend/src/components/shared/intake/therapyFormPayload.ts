import type { TherapyFormValue } from '../../operator/cartella/TherapyFormFields';
import { FRACTION_PRESETS } from '../../operator/cartella/therapyDose';

/** One lossless confirmation mapper for manual and reviewed imported therapies. */
export function therapyFormToInput(
  f: TherapyFormValue,
  operatoreNome?: string,
): Record<string, unknown> {
  const allowed = FRACTION_PRESETS.filter((p) => f.allowedFractions?.includes(p.key));
  return {
    farmacoNome: f.farmacoNome,
    drugPackageRef: f.drugPackageRef || null,
    dataInizio: f.dataInizio,
    ...(f.dataFine ? { dataFine: f.dataFine } : {}),
    viaSomministrazione: f.viaSomministrazione,
    tipo: f.tipo,
    stato: f.stato,
    ...(f.commercialStrengthValue?.trim()
      ? { commercialStrengthValue: Number(f.commercialStrengthValue) }
      : {}),
    ...(f.commercialStrengthUnit ? { commercialStrengthUnit: f.commercialStrengthUnit } : {}),
    ...(f.pharmaceuticalForm ? { pharmaceuticalForm: f.pharmaceuticalForm } : {}),
    allowedFractions: allowed.length ? allowed.map((p) => p.key).join(',') : '1',
    // Invalid rows must reach preflight, never disappear through a filter.
    schedules:
      f.tipo === 'periodica' && Array.isArray(f.schedules)
        ? f.schedules.map((s) => ({ ...s }))
        : [],
    giorniSettimana: Array.isArray(f.giorniSettimana) ? f.giorniSettimana.join(',') : '',
    ...(f.prescrittore ? { prescrittore: f.prescrittore } : {}),
    ...(operatoreNome ? { operatoreInseritore: operatoreNome } : {}),
    ...(f.note ? { note: f.note } : {}),
    ...(f.tipo === 'una_tantum'
      ? {
          dataSomministrazione: f.dataSomministrazione,
          orarioSomministrazione: f.orarioSomministrazione,
        }
      : {}),
  };
}
