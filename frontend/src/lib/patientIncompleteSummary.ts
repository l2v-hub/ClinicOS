import { intakeCompletionPending } from './patientListView';
import type { Demographics } from './patientDemographics';

/** Return the loaded patients whose identity still needs operator attention. */
export function filterIncompletePatients<T extends Demographics>(patients: T[]): T[] {
  return patients.filter(intakeCompletionPending);
}
