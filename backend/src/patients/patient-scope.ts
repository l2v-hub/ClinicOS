import type { Operator } from '../ai/auth.js';
import { residentScopeModeForRole, residentScopeWhere } from '../access-scope/resident-access-scope.js';

// Thin compatibility layer: the rule lives in access-scope/resident-access-scope.ts (Phase 4).

export interface PatientScopeReader {
  patient: {
    findFirst(input: {
      where: { id: string; registeredById?: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}

export function hasGlobalPatientScope(role: string): boolean {
  return residentScopeModeForRole(role) === 'all';
}

/** Prisma-compatible ownership predicate. Empty only for facility-wide scope ('all'). */
export function patientScopeWhere(operator: Operator): { registeredById?: string } {
  return residentScopeWhere(operator);
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
