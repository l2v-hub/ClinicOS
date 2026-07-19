// REQ-039: authentication + authorization context for the AI Data Gateway. Pure + testable.
//
// Internal endpoints are reachable ONLY with the runtime service token AND a user context. The
// backend (not the model) decides tenant + patient access. ClinicOS is single-tenant today, so the
// gateway pins every call to one configured tenant and REJECTS any other tenant id — this gives
// real isolation now and a clean seam if multi-tenancy is added later.

import { GatewayError, type UserContext } from './types.js';

/** The single tenant this deployment serves. Overridable per-env; never blank. */
export function defaultTenant(env: NodeJS.ProcessEnv = process.env): string {
  return (env.AI_DEFAULT_TENANT || 'clinicos').trim() || 'clinicos';
}

/** Verify the caller presented the runtime service token. The frontend NEVER calls these routes. */
export function checkServiceToken(
  authorization: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const token = (env.AI_RUNTIME_SERVICE_TOKEN || '').trim();
  if (!token) return false; // not configured → closed by default
  return authorization === `Bearer ${token}`;
}

function csv(v: string | undefined): string[] {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build the user context from request headers. Throws `unauthorized` when identity is missing. */
export function parseUserContext(
  headers: Record<string, string | undefined>,
  env: NodeJS.ProcessEnv = process.env,
): UserContext {
  const get = (k: string) => headers[k] ?? headers[k.toLowerCase()];
  const userId = (get('X-AI-User-Id') || '').trim();
  if (!userId) throw new GatewayError('unauthorized', 'Missing user context');
  const tenantId = (get('X-AI-Tenant-Id') || defaultTenant(env)).trim();
  const roles = csv(get('X-AI-Roles')).map((r) => r.toLowerCase());
  const permittedRaw = get('X-AI-Permitted-Patients');
  // Header ABSENT → operator scope (null). Header PRESENT (even empty) → explicit allow-list.
  const permittedPatientIds = permittedRaw === undefined ? null : csv(permittedRaw);
  const requestId = (get('X-AI-Request-Id') || `req-${userId}`).trim();
  return { userId, tenantId, roles, permittedPatientIds, requestId };
}

/** Reject a call whose tenant is not the one this deployment serves (multi-tenant isolation). */
export function assertTenant(ctx: UserContext, env: NodeJS.ProcessEnv = process.env): void {
  if (ctx.tenantId !== defaultTenant(env)) {
    throw new GatewayError('tenant_isolation', 'Tenant not accessible');
  }
}

/** Whether the caller may read this specific patient. */
export function isPatientAllowed(ctx: UserContext, patientId: string): boolean {
  if (ctx.permittedPatientIds === null) return true; // operator scope (single tenant)
  return ctx.permittedPatientIds.includes(patientId);
}

/** Throw `forbidden` unless the caller may read this patient. */
export function assertPatientAllowed(ctx: UserContext, patientId: string): void {
  if (!isPatientAllowed(ctx, patientId))
    throw new GatewayError('forbidden', 'Patient not accessible');
}

/** Cross-patient search is opt-in (env) AND role-gated — never on by default. */
export function canCrossPatientSearch(
  ctx: UserContext,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const enabled = (env.AI_CROSS_PATIENT_SEARCH_ENABLED || 'false').trim() === 'true';
  const privileged = ctx.roles.some((r) => r === 'manager' || r === 'admin');
  return enabled && privileged;
}

/** Facility/operational reads (rooms, beds, occupancy, facility-wide agenda) are a deployment-level
 *  trust decision, independent of the (unverified, self-asserted) role header — so it is gated ONLY
 *  by an env flag, never by role. Off by default (no regression). */
export function canFacilityRead(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AI_FACILITY_QUERIES_ENABLED || 'false').trim() === 'true';
}

/** Restrict a candidate patient-id list to those the caller may see. */
export function filterAllowedPatients(ctx: UserContext, ids: string[]): string[] {
  return ids.filter((id) => isPatientAllowed(ctx, id));
}
