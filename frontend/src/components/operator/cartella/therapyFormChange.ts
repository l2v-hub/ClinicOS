import type { TherapyFormValue } from './TherapyFormFields';
import { administrationUnitForForm, isPatchUnit } from './therapyDose';

/** Manual form changes may update units; choosing a package preserves the prescription. */
export function applyTherapyFormChange(
  value: TherapyFormValue,
  patch: Partial<TherapyFormValue>,
): TherapyFormValue {
  const next = { ...value, ...patch };
  if (patch.drugPackageRef !== undefined) next.drugPackageDetached = false;
  if (
    value.drugPackageRef &&
    patch.drugPackageRef === undefined &&
    patch.pharmaceuticalForm !== undefined &&
    patch.pharmaceuticalForm !== value.pharmaceuticalForm
  ) {
    next.drugPackageRef = null;
    next.drugPackageDetached = true;
  }
  if (patch.drugPackageRef !== undefined && patch.commercialStrengthValue === '') {
    next.commercialStrengthNeedsReview = Boolean(
      value.commercialStrengthValue.trim() || value.commercialStrengthNeedsReview,
    );
  }
  if (
    patch.farmacoNome !== undefined &&
    patch.farmacoNome !== value.farmacoNome &&
    patch.drugPackageRef === undefined
  )
    next.drugPackageRef = null;
  if (
    !patch.drugPackageRef &&
    patch.pharmaceuticalForm !== undefined &&
    patch.pharmaceuticalForm !== value.pharmaceuticalForm
  ) {
    const previousUnit = administrationUnitForForm(value.pharmaceuticalForm);
    const nextUnit = administrationUnitForForm(patch.pharmaceuticalForm);
    if (!patch.schedules) {
      next.schedules = value.schedules.map((s) =>
        !s.administrationUnit || s.administrationUnit === previousUnit
          ? { ...s, administrationUnit: nextUnit }
          : s,
      );
    }
    // Keep an existing fractional quantity visible for correction; never round a prescription.
    if (isPatchUnit(patch.pharmaceuticalForm)) next.allowedFractions = ['1'];
  }
  return next;
}
