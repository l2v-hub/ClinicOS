// Tool Layer authorization hook backed by the capability policy (Phase 2). Replaces the legacy
// requireRole mirror as the DEFAULT hook: the role is re-resolved server-side from the operator id
// and the active policy on every call (never taken from the caller), so tool discovery and
// invocation follow Save/Apply immediately.

import type { AuthorizationHook } from '../tools/hooks.js';
import { decide, resolveRoleId } from './decision.js';
import { loadActivePolicyCached } from './policy-cache.js';

export const policyToolAuthorization: AuthorizationHook = async (tool, ctx) => {
  const policy = await loadActivePolicyCached();
  const { roleId } = resolveRoleId(policy.document, ctx.identity.operatorId, ctx.identity.role);
  const decision = decide(policy.document, roleId, tool.name);
  if (!decision.allowed) {
    return {
      allowed: false,
      code: decision.code ?? 'capability_denied',
      reason:
        decision.code === 'read_only'
          ? 'Il tuo ruolo ha accesso in sola lettura a questa funzione'
          : 'Operazione non consentita al tuo ruolo',
      roleId,
    };
  }
  return { allowed: true, requiresConfirmation: decision.requiresConfirmation, roleId };
};
