export interface DeferredTherapy {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  times: string[];
  notes: string;
  reason: string;
}
export interface PatientIntakeReviewData {
  draftId: string | null;
  deferredTherapies: DeferredTherapy[];
  sourceDocumentIds: string[];
}
export function parsePatientIntakeReview(value: unknown): PatientIntakeReviewData {
  if (!value || typeof value !== 'object') throw new Error('Revisione ingresso non valida');
  const data = value as Partial<PatientIntakeReviewData>;
  if (
    (data.draftId !== null && typeof data.draftId !== 'string') ||
    !Array.isArray(data.deferredTherapies) ||
    !Array.isArray(data.sourceDocumentIds) ||
    !data.sourceDocumentIds.every((id) => typeof id === 'string') ||
    !data.deferredTherapies.every(
      (row) =>
        row &&
        ['name', 'dose', 'route', 'frequency', 'notes', 'reason'].every(
          (key) => typeof row[key as keyof DeferredTherapy] === 'string',
        ) &&
        Array.isArray(row.times) &&
        row.times.every((time) => typeof time === 'string'),
    )
  )
    throw new Error('Revisione ingresso non valida');
  return data as PatientIntakeReviewData;
}
