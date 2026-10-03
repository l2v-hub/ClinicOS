import type { Operator } from '../ai/auth.js';
import {
  residentScopeIsFacilityWide,
  residentScopeModeForRole,
  residentScopeWhere,
} from '../access-scope/resident-access-scope.js';

// Thin compatibility layer: the rule lives in access-scope/resident-access-scope.ts (Phase 4).

export interface PatientScopeReader {
  patient: {
    findFirst(input: {
      where: { id: string; registeredById?: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}

/**
 * Management-level reach ('all': admin / manager). Also used as a privilege marker (roster default,
 * handover author/assignee visibility, AI context) — never use it to decide which RESIDENTS an
 * identity reaches: that is hasFacilityPatientScope / patientScopeWhere (#389).
 */
export function hasGlobalPatientScope(role: string): boolean {
  return residentScopeModeForRole(role) === 'all';
}

/** The identity reaches every resident of the facility (no registrant filter). */
export function hasFacilityPatientScope(role: string): boolean {
  return residentScopeIsFacilityWide(role);
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
