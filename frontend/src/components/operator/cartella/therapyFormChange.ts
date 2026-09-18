import type { TherapyFormValue } from './TherapyFormFields';
import { administrationUnitForForm, isPatchUnit } from './therapyDose';

/** AIFA and manual form selection share the same unit update without guessing a dose. */
export function applyTherapyFormChange(
  value: TherapyFormValue,
  patch: Partial<TherapyFormValue>,
): TherapyFormValue {
  const next = { ...value, ...patch };
  if (
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
