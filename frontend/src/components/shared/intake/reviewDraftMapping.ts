import type { ConfirmPatient } from '../ImportReviewFull';

// F5 #124: map the reviewed import data (patient + cartella from the ImportReviewFull
// screen) into an intake-draft patch. The new-patient path in DischargeImportModal
// creates a draft from the extraction job, then PATCHes it with this payload before
// handing off to IntakeWorkspace so the wizard opens prefilled with the reviewed data.
//
// IntakeWorkspace.handleConfirm consumes exactly these keys:
//   - data.anagrafica              → the Anagrafica step (patient demographics)
//   - data._reviewCartella         → merged into the confirm cartella as the baseline
//   - data._confirmAllergyConflict → carries the operator's allergy-conflict override
export function reviewToDraftPatch(
  patient: ConfirmPatient,
  cartella: Record<string, unknown>,
  opts: { confirmAllergyConflict: boolean },
): Record<string, unknown> {
  const anagrafica: Record<string, unknown> = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    ...(patient.sex !== undefined && { sex: patient.sex }),
    ...(patient.codiceFiscale !== undefined && { codiceFiscale: patient.codiceFiscale }),
    ...(patient.phone !== undefined && { phone: patient.phone }),
    ...(patient.email !== undefined && { email: patient.email }),
    ...(patient.address !== undefined && { address: patient.address }),
    ...(patient.emergencyContactName !== undefined && { emergencyContactName: patient.emergencyContactName }),
    ...(patient.emergencyContactPhone !== undefined && { emergencyContactPhone: patient.emergencyContactPhone }),
  };

  return {
    anagrafica,
    _reviewCartella: cartella,
    _confirmAllergyConflict: opts.confirmAllergyConflict,
  };
}
