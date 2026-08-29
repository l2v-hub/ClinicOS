import type { Operator } from '../ai/auth.js';

export interface PatientScopeReader {
  patient: {
    findFirst(input: {
      where: { id: string; registeredById?: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}

const GLOBAL_PATIENT_ROLES = new Set(['admin', 'manager']);

export function hasGlobalPatientScope(role: string): boolean {
  return GLOBAL_PATIENT_ROLES.has(role.trim().toLowerCase());
}

/** Prisma-compatible ownership predicate. Empty only for facility-wide roles. */
export function patientScopeWhere(operator: Operator): { registeredById?: string } {
  return hasGlobalPatientScope(operator.role) ? {} : { registeredById: operator.id };
}

export async function patientIsInOperatorScope(
  patientId: string,
  operator: Operator,
  reader: PatientScopeReader,
): Promise<boolean> {
  if (!patientId) return false;
  const patient = await reader.patient.findFirst({
    where: {
      id: patientId,
      ...patientScopeWhere(operator),
    },
    select: { id: true },
  });
  return patient !== null;
}
