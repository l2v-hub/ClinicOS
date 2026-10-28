import type { FarmacoTrovato } from './farmacoDocumento';
import { normalizza } from './farmacoCorrispondenza';
import { PHARMA_FORMS, isInhalerForm } from './therapyDose';
import type { TherapyFormValue } from './TherapyFormFields';

/** Broad form for the form control; the exact formulation stays attached to the AIC. */
export function formaDellaMaschera(formaAifa: string | null | undefined): string | undefined {
  if (!formaAifa) return undefined;
  if (isInhalerForm(formaAifa)) return 'inalatore';
  const rules: [RegExp, string][] = [
    [/compress|cpr/, 'compressa'],
    [/capsul/, 'capsula'],
    [/sciroppo/, 'sciroppo'],
    [/iniett|infusion|fiala|fiale/, 'fiala'],
    [/bustin|granulat|polvere/, 'bustina'],
    [/gocce|goccia/, 'gocce'],
    [/cerotto|transdermic/, 'cerotto'],
    [/crema|unguento|pomata|gel/, 'crema'],
    [/flacone|soluzion|sospension/, 'flacone'],
  ];
  const match = rules.find(([rule]) => rule.test(normalizza(formaAifa)))?.[1];
  return match && PHARMA_FORMS.includes(match) ? match : undefined;
}

export function selectDrugPackage(
  farmaco: FarmacoTrovato,
  currentForm: string,
): Partial<TherapyFormValue> {
  const strengths = (farmaco.principiAttivi ?? []).filter(
    (p) =>
      p.quantita != null &&
      Number.isFinite(p.quantita) &&
      p.quantita > 0 &&
      p.unita &&
      ['mg', 'g', 'mcg', 'UI', 'ml', '%'].includes(p.unita),
  );
  const strength =
    strengths.length === 1 && farmaco.principiAttivi?.length === 1 ? strengths[0] : null;
  return {
    farmacoNome: farmaco.denominazione,
    drugPackageRef: farmaco.aic,
    pharmaceuticalForm: formaDellaMaschera(farmaco.forma) ?? currentForm,
    // Prefill only one unambiguous structured active-ingredient strength. Never
    // parse a product name or retain the previous package's strength.
    commercialStrengthValue: strength ? String(strength.quantita) : '',
    ...(strength
      ? { commercialStrengthUnit: strength.unita!, commercialStrengthNeedsReview: false }
      : {}),
  };
}

export function freeTextDrug(name: string): Partial<TherapyFormValue> {
  return {
    farmacoNome: name.trim(),
    drugPackageRef: null,
    commercialStrengthValue: '',
  };
}

export function needsCommercialStrengthReview(value: TherapyFormValue): boolean {
  return Boolean(
    value.commercialStrengthNeedsReview &&
    (!value.commercialStrengthValue.trim() ||
      !Number.isFinite(Number(value.commercialStrengthValue)) ||
      Number(value.commercialStrengthValue) <= 0 ||
      !value.commercialStrengthUnit),
  );
}
