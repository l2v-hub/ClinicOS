// Identity → Role → Capability policy: shared types (Phase 2).
//
// The policy is ONE versioned document (AuthzPolicyVersion.document): roles, the role × capability
// matrix and identity → role assignments. Roles are data, not code: the five initial roles plus the
// two legacy ones are only the baseline content, never an architectural limit.

export const EFFECTS = ['ALLOWED', 'READ_ONLY', 'ALLOWED_WITH_CONFIRMATION', 'DENIED'] as const;
export type Effect = (typeof EFFECTS)[number];

export interface RoleDefinition {
  id: string;
  label: string;
  description: string;
  /** Legacy roles exist for controlled migration of identities without an explicit assignment. */
  legacy?: boolean;
  /** Role string understood by the pre-existing services (data scope: admin|manager = facility-wide). */
  legacyRole: 'admin' | 'manager' | 'operatore';
  /** Which application shell the GUI opens for this role. */
  uiShell: 'admin' | 'operator';
}

export interface PolicyDocument {
  schema: 'clinicos.authz-policy/v1';
  /** Effect for any capability absent from a role's grants (production target: DENIED). */
  defaultEffect: Effect;
  roles: RoleDefinition[];
  /** roleId → capabilityId → effect. */
  grants: Record<string, Record<string, Effect>>;
  /** operatorId → roleId. Identities without an entry fall back to the legacy mapping. */
  assignments: Record<string, string>;
  /** Baseline notes: `roleId:capabilityId` → why the assignment is doubtful (shown in the UI). */
  review?: Record<string, string>;
}

export interface ActivePolicy {
  version: number;
  document: PolicyDocument;
  /** 'baseline' when no version was ever saved (implicit version 0). */
  source: 'database' | 'baseline';
  appliedAt: string | null;
}

export interface CapabilityRoute {
  method: string;
  path: string;
}

export interface CapabilityEntry {
  id: string;
  name: string;
  domain: string;
  type: 'read' | 'write' | 'action';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  exposure: string;
  technicalState: string;
  legacyRoles: string[];
  /** policy = governed by the matrix; public/service/identity = outside end-user role policy. */
  gate: 'policy' | 'public' | 'service' | 'identity';
  /** Channel/alias capabilities are governed by this functional capability. */
  governedBy: string | null;
  routes: CapabilityRoute[];
}

export interface Decision {
  capabilityId: string;
  roleId: string;
  effect: Effect;
  allowed: boolean;
  requiresConfirmation: boolean;
  /** Stable code when denied: capability_denied | read_only | unknown_capability | unknown_role. */
  code?: string;
}

/** Identity as resolved server-side for one request. */
export interface ResolvedIdentity {
  operatorId: string;
  name?: string;
  roleId: string;
  /** How the role was obtained: explicit policy assignment or legacy fallback. */
  roleSource: 'assignment' | 'legacy';
  /** Compat role string for pre-existing services (see RoleDefinition.legacyRole). */
  legacyRole: string;
  identitySource: 'simulator' | 'entra' | 'demo-header' | 'demo-production';
}
