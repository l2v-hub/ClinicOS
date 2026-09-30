// Per-request authorization context: identity (from the auth gate) → role (from the ACTIVE policy)
// → decisions. Attached once per request by ensureAuthorization (after requireOperator); the route
// gate, the Tool Layer, /authz, /auth/me and Agnos all read it from here, so every channel uses the
// same policy snapshot for one request.

import type { NextFunction, Response } from 'express';
import type { Operator } from '../ai/auth.js';
import { decide, resolveRoleId, roleDefinition } from './decision.js';
import { loadActivePolicyCached } from './policy-cache.js';
import type { ActivePolicy, Decision, ResolvedIdentity } from './types.js';

export interface AuthzContext {
  policy: ActivePolicy;
  identity: ResolvedIdentity;
  can(capabilityId: string): Decision;
}

interface WithAuthz {
  operator?: Operator;
  authz?: AuthzContext;
  identitySource?: ResolvedIdentity['identitySource'];
}

export function enforcementEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AUTHZ_ENFORCEMENT || 'enforce').trim().toLowerCase() !== 'off';
}

export function buildAuthzContext(
  policy: ActivePolicy,
  operator: Operator,
  identitySource: ResolvedIdentity['identitySource'],
): AuthzContext {
  const { roleId, source } = resolveRoleId(policy.document, operator.id, operator.role);
  const role = roleDefinition(policy.document, roleId);
  // Assigned roles speak to the pre-existing services through their compat role string; the
  // legacy fallback keeps the exact string the identity already had (zero behaviour change).
  const legacyRole = source === 'assignment' && role ? role.legacyRole : operator.role;
  const identity: ResolvedIdentity = {
    operatorId: operator.id,
    name: operator.name,
    roleId,
    roleSource: source,
    legacyRole,
    identitySource,
  };
  return {
    policy,
    identity,
    can: (capabilityId) => decide(policy.document, roleId, capabilityId),
  };
}

/** Resolve and attach the authorization context; rewrites req.operator.role to the compat role. */
export async function attachAuthorization(
  req: WithAuthz,
  identitySource: ResolvedIdentity['identitySource'],
): Promise<AuthzContext> {
  const operator = req.operator!;
  const policy = await loadActivePolicyCached();
  const context = buildAuthzContext(policy, operator, identitySource);
  req.operator = {
    ...operator,
    role: context.identity.legacyRole,
    appRole: context.identity.roleId,
  };
  req.authz = context;
  return context;
}

export function authzOf(req: unknown): AuthzContext | undefined {
  return (req as WithAuthz).authz;
}

/** Attach the authorization context once per request (after requireOperator). */
export async function ensureAuthorization(req: unknown): Promise<AuthzContext> {
  const target = req as WithAuthz;
  if (target.authz) return target.authz;
  return attachAuthorization(target, target.identitySource ?? 'demo-header');
}

/** Express middleware form of ensureAuthorization; fails closed (503) if the policy is unreadable. */
export function requireAuthorizationContext(req: unknown, res: Response, next: NextFunction): void {
  ensureAuthorization(req).then(
    () => next(),
    () => {
      res.status(503).json({ error: 'Autorizzazione non disponibile', code: 'authz_unavailable' });
    },
  );
}
