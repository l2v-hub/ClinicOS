import type { PatientTherapyAPI } from '../../../types';
import type { TherapyFormValue } from './TherapyFormFields';
import { FRACTION_PRESETS, parseAllowedFractions } from './therapyDose';
import { schedulesFromTherapy } from './therapyFormRestore';
const todayStr = () => new Date().toISOString().slice(0, 10);

export function therapyToForm(t: PatientTherapyAPI): TherapyFormValue {
  return {
    farmacoNome: t.farmacoNome,
    drugPackageRef: t.drugPackageRef ?? null,
    pharmaceuticalForm: t.pharmaceuticalForm ?? 'compressa',
    commercialStrengthValue:
      t.commercialStrengthValue != null ? String(t.commercialStrengthValue) : '',
    commercialStrengthUnit: t.commercialStrengthUnit ?? 'mg',
    allowedFractions: Array.from(parseAllowedFractions(t.allowedFractions)),
    viaSomministrazione: t.viaSomministrazione,
    tipo: t.tipo,
    stato: t.stato,
    dataInizio: t.dataInizio,
    dataFine: t.dataFine ?? '',
    schedules: schedulesFromTherapy(t),
    giorniSettimana: t.giorniSettimana
      ? t.giorniSettimana
          .split(',')
          .map(Number)
          .filter((n) => n >= 1 && n <= 7)
      : [],
    prescrittore: t.prescrittore ?? '',
    note: t.note ?? '',
    dataSomministrazione: t.dataSomministrazione ?? todayStr(),
    orarioSomministrazione: t.orarioSomministrazione ?? '',
  };
}

export function formToPayload(form: TherapyFormValue, patientId: string, operatoreNome: string) {
  const strengthValue = form.commercialStrengthValue.trim()
    ? Number(form.commercialStrengthValue)
    : null;
  // Allowed fractions are stored ordered as they appear in presets (config persists per therapy/drug).
  const allowed = FRACTION_PRESETS.filter((p) => form.allowedFractions.includes(p.key)).map(
    (p) => p.key,
  );
  const schedules =
    form.tipo === 'periodica'
      ? form.schedules
          .filter((s) => /^\d{1,2}:\d{2}$/.test(s.time))
          .map((s) => ({
            time: s.time,
            quantityNumerator: s.quantityNumerator,
            quantityDenominator: s.quantityDenominator,
            administrationUnit: s.administrationUnit,
          }))
      : [];
  return {
    patientId,
    farmacoNome: form.farmacoNome,
    drugPackageRef: form.drugPackageRef || null,
    dosaggio: '', // derived server-side from strength + form
    viaSomministrazione: form.viaSomministrazione,
    tipo: form.tipo,
    stato: form.stato,
    dataInizio: form.dataInizio,
    dataFine: form.tipo === 'periodica' && form.dataFine ? form.dataFine : null,
    commercialStrengthValue: strengthValue,
    commercialStrengthUnit: form.commercialStrengthUnit || null,
    pharmaceuticalForm: form.pharmaceuticalForm || null,
    allowedFractions: allowed.length ? allowed.join(',') : '1',
    giorniSettimana:
      form.tipo === 'periodica' && form.giorniSettimana.length
        ? form.giorniSettimana.join(',')
        : null,
    schedules,
    prescrittore: form.prescrittore || null,
    operatoreInseritore: operatoreNome,
    note: form.note || null,
    dataSomministrazione:
      form.tipo === 'una_tantum' && form.dataSomministrazione ? form.dataSomministrazione : null,
    orarioSomministrazione:
      form.tipo === 'una_tantum' && form.orarioSomministrazione
        ? form.orarioSomministrazione
        : null,
  };
}
