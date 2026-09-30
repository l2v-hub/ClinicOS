// Resident Access Scope (Phase 4, .ai-architecture/phase-4-assistant/RESIDENT_ACCESS_SCOPE.md).
//
// WHICH residents an identity may reach, as a dimension SEPARATE from the role/capability policy
// (WHAT it may do). Every patient-scoped read/write already funnels through
// patients/patient-scope.ts; that module now delegates here, so this is the single rule.
//
// Behaviour preserved (never widened automatically):
//   legacy roles admin | manager → 'all'; every other identity → 'registered_by_me'
//   (the historical ownership rule `Patient.registeredById = operator.id`).
// Future modes are declared (assigned_to_me, ward, team, facility, patient_assignment) but not yet
// backed by data: a config naming one is IGNORED for that role (the current rule stays), so no
// path can widen visibility and every call site (Prisma or raw SQL) applies the same rule.
//
// Config (optional): RESIDENT_SCOPE_CONFIG='{"byLegacyRole":{"operatore":"registered_by_me"}}'.

import type { Operator } from '../ai/auth.js';

export type ResidentScopeMode =
  | 'all'
  | 'registered_by_me'
  | 'assigned_to_me'
  | 'ward'
  | 'team'
  | 'facility'
  | 'patient_assignment';

export const IMPLEMENTED_SCOPE_MODES: ReadonlySet<ResidentScopeMode> = new Set([
  'all',
  'registered_by_me',
]);

export interface ResidentScopeConfig {
  byLegacyRole: Record<string, ResidentScopeMode>;
  fallback: ResidentScopeMode;
}

/** Today's behaviour, made explicit. */
export const DEFAULT_RESIDENT_SCOPE_CONFIG: ResidentScopeConfig = {
  byLegacyRole: { admin: 'all', manager: 'all' },
  fallback: 'registered_by_me',
};

let cachedRaw: string | undefined;
let cachedConfig: ResidentScopeConfig = DEFAULT_RESIDENT_SCOPE_CONFIG;

export function residentScopeConfig(env: NodeJS.ProcessEnv = process.env): ResidentScopeConfig {
  const raw = env.RESIDENT_SCOPE_CONFIG?.trim();
  if (!raw) return DEFAULT_RESIDENT_SCOPE_CONFIG;
  if (raw === cachedRaw) return cachedConfig;
  cachedRaw = raw;
  try {
    const parsed = JSON.parse(raw) as {
      byLegacyRole?: Record<string, unknown>;
      fallback?: unknown;
    };
    const byLegacyRole: Record<string, ResidentScopeMode> = {
      ...DEFAULT_RESIDENT_SCOPE_CONFIG.byLegacyRole,
    };
    for (const [role, mode] of Object.entries(parsed.byLegacyRole ?? {})) {
      // Only implemented modes take effect; anything else keeps the current rule for that role.
      if (typeof mode === 'string' && IMPLEMENTED_SCOPE_MODES.has(mode as ResidentScopeMode)) {
        byLegacyRole[role.trim().toLowerCase()] = mode as ResidentScopeMode;
      }
    }
    const fallback =
      typeof parsed.fallback === 'string' &&
      IMPLEMENTED_SCOPE_MODES.has(parsed.fallback as ResidentScopeMode)
        ? (parsed.fallback as ResidentScopeMode)
        : DEFAULT_RESIDENT_SCOPE_CONFIG.fallback;
    cachedConfig = { byLegacyRole, fallback };
  } catch {
    // Malformed config: keep the documented default rather than widening or locking everyone out.
    cachedConfig = DEFAULT_RESIDENT_SCOPE_CONFIG;
  }
  return cachedConfig;
}

export function residentScopeModeForRole(role: string): ResidentScopeMode {
  const config = residentScopeConfig();
  return config.byLegacyRole[role.trim().toLowerCase()] ?? config.fallback;
}

export interface ResidentScope {
  mode: ResidentScopeMode;
  /** true when the mode is backed by data today; false → fail closed. */
  supported: boolean;
}

export function residentScopeFor(operator: Pick<Operator, 'role'>): ResidentScope {
  const mode = residentScopeModeForRole(operator.role);
  return { mode, supported: IMPLEMENTED_SCOPE_MODES.has(mode) };
}

/** Sentinel owner id that matches no patient (unsupported mode → nobody reachable). */
export const NO_RESIDENT = '__resident_scope_unsupported__';

/** Prisma `where` fragment on Patient. Empty only for 'all'. */
export function residentScopeWhere(operator: Pick<Operator, 'id' | 'role'>): {
  registeredById?: string;
} {
  const scope = residentScopeFor(operator);
  if (!scope.supported) return { registeredById: NO_RESIDENT };
  return scope.mode === 'all' ? {} : { registeredById: operator.id };
}

export type ResidentOperation = 'select' | 'read' | 'skill' | 'write' | 'tool';

export interface ResidentOperationContext {
  operation: ResidentOperation;
  skillId?: string;
  tool?: string;
}

export interface ResidentAccessDecision {
  allowed: boolean;
  mode: ResidentScopeMode;
  reason?: 'resident_out_of_scope' | 'resident_not_found' | 'scope_mode_not_supported';
}

export interface ResidentReader {
  patient: {
    findFirst(input: {
      where: { id: string; registeredById?: string };
      select: { id: true; firstName?: true; lastName?: true };
    }): Promise<{ id: string; firstName?: string; lastName?: string } | null>;
  };
}

async function defaultReader(): Promise<ResidentReader> {
  const { prisma } = await import('../lib/prisma.js');
  return prisma as unknown as ResidentReader;
}

/**
 * can_access_resident(identity, resident_id, operation_context). The same predicate for selection,
 * read, skill and write: the operation is recorded for audit/diagnostics, never widens access.
 */
export async function canAccessResident(
  operator: Pick<Operator, 'id' | 'role'>,
  residentId: string,
  _context: ResidentOperationContext,
  reader?: ResidentReader,
): Promise<ResidentAccessDecision> {
  const scope = residentScopeFor(operator);
  if (!scope.supported)
    return { allowed: false, mode: scope.mode, reason: 'scope_mode_not_supported' };
  if (!residentId || residentId.length > 128 || residentId.includes(','))
    return { allowed: false, mode: scope.mode, reason: 'resident_not_found' };
  const db = reader ?? (await defaultReader());
  const row = await db.patient.findFirst({
    where: { id: residentId, ...residentScopeWhere(operator) },
    select: { id: true },
  });
  return row
    ? { allowed: true, mode: scope.mode }
    : { allowed: false, mode: scope.mode, reason: 'resident_out_of_scope' };
}

/** Minimal display metadata (name) of a resident the identity may reach; null otherwise. */
export async function describeResident(
  operator: Pick<Operator, 'id' | 'role'>,
  residentId: string,
  reader?: ResidentReader,
): Promise<{ id: string; label: string } | null> {
  const scope = residentScopeFor(operator);
  if (!scope.supported || !residentId || residentId.includes(',')) return null;
  const db = reader ?? (await defaultReader());
  const row = await db.patient.findFirst({
    where: { id: residentId, ...residentScopeWhere(operator) },
    select: { id: true, firstName: true, lastName: true },
  });
  return row ? { id: row.id, label: `${row.lastName ?? ''} ${row.firstName ?? ''}`.trim() } : null;
}
