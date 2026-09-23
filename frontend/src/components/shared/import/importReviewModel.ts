import { reviewedIdentityPatch } from '../../../lib/intakeDemographics';
import type { ConfirmPatient } from '../ImportReviewFull';
import { sectionsFromNarrative } from '../sections/deriveSections';
import type { SectionsResult } from '../sections/types';
import type { ConflictDecision, ImportResult } from './importSessionTypes';

export function completeConflictDecisions(result: ImportResult, decisions: ConflictDecision[]) {
  const map = new Map(decisions.map((decision) => [decision.conflictId, decision]));
  return (
    decisions.length === result._conflicts.length &&
    map.size === decisions.length &&
    result._conflicts.every((conflict) => {
      const decision = map.get(conflict.id);
      return (
        decision?.action === 'defer' ||
        (decision?.action === 'select' &&
          conflict.candidates.some((candidate) => candidate.id === decision.candidateId))
      );
    })
  );
}

export function effectiveImportSections(result: ImportResult): SectionsResult {
  const narrative = result._narrative ? sectionsFromNarrative(result._narrative) : null;
  const sections = result._sections;
  const hasText = (value?: SectionsResult | null) =>
    value?.sections?.some((item) => item.rawText?.trim());
  const selected = hasText(narrative)
    ? narrative!
    : hasText(sections)
      ? sections!
      : (narrative ??
        sections ?? { sections: [], allergies: { status: 'not_documented' as const } });
  const demographics = { ...selected.demographics };
  // Match the server's pageDraftNarrative identity projection without changing source text.
  const fields: Record<string, string> = {
    'anagrafica.nome': 'firstName',
    'anagrafica.cognome': 'lastName',
    'anagrafica.dataNascita': 'dateOfBirth',
    'anagrafica.sesso': 'sex',
    'anagrafica.telefono': 'phone',
    'anagrafica.email': 'email',
    'anagrafica.indirizzo': 'address',
    'cartella.codiceFiscale': 'codiceFiscale',
  };
  for (const conflict of result._conflicts) {
    const field = fields[conflict.field];
    if (!field) continue;
    const decision = result._review.decisions.find((item) => item.conflictId === conflict.id);
    const candidate =
      decision?.action === 'select'
        ? conflict.candidates.find((item) => item.id === decision.candidateId)
        : undefined;
    demographics[field] = String(candidate?.value ?? '');
  }
  return { ...selected, demographics };
}
/** Only the first handoff applies the operator's review. Reopening an existing draft never reseeds it. */
export function reviewedDraftPatch(
  data: Record<string, unknown>,
  patient: ConfirmPatient,
  cartella: Record<string, unknown>,
) {
  const notEmpty = (value?: string) => !!value?.trim();
  return {
    anagrafica: {
      ...((data.anagrafica as Record<string, unknown>) ?? {}),
      ...(notEmpty(patient.firstName) ? { firstName: patient.firstName } : {}),
      ...(notEmpty(patient.lastName) ? { lastName: patient.lastName } : {}),
      ...reviewedIdentityPatch(patient),
      ...(notEmpty(patient.sex) ? { sex: patient.sex } : {}),
      ...(notEmpty(patient.email) ? { email: patient.email } : {}),
      ...(notEmpty(patient.address) ? { address: patient.address } : {}),
      ...(notEmpty(patient.emergencyContactName)
        ? { referenteNome: patient.emergencyContactName }
        : {}),
      ...(notEmpty(patient.emergencyContactPhone)
        ? { referenteTelefono: patient.emergencyContactPhone }
        : {}),
    },
    ...(cartella.documentSections === undefined
      ? {}
      : { documentSections: cartella.documentSections }),
    ...(cartella._allergyNarrative === undefined
      ? {}
      : { _allergyNarrative: cartella._allergyNarrative }),
    ...(cartella._importSections === undefined
      ? {}
      : { _importSections: cartella._importSections }),
  };
}
