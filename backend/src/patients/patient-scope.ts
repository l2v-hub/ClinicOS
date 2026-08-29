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

export async function patientIsInOperatorScope(
  patientId: string,
  operator: Operator,
  reader: PatientScopeReader,
): Promise<boolean> {
  if (!patientId) return false;
  const patient = await reader.patient.findFirst({
    where: {
      id: patientId,
      ...(!hasGlobalPatientScope(operator.role) && { registeredById: operator.id }),
    },
    select: { id: true },
  });
  return patient !== null;
}
