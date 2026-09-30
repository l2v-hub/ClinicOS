// The single decision function used by routes, Tool Layer, Agnos and the GUI contract.

import { capabilityById, governedCapabilities, governingCapability } from './registry.js';
import type { Decision, PolicyDocument, RoleDefinition } from './types.js';

/** Legacy role strings (Entra User.role, demo headers) → legacy role of the policy. */
export function legacyRoleIdFor(legacyRole: string): string {
  return ['admin', 'manager'].includes(legacyRole.trim().toLowerCase())
    ? 'legacy_admin'
    : 'operator';
}

/**
 * Role of an identity: the explicit assignment in the ACTIVE policy wins; otherwise the legacy
 * fallback derived from the server-verified legacy role string. Never from client input.
 */
export function resolveRoleId(
  document: PolicyDocument,
  operatorId: string,
  legacyRole: string,
): { roleId: string; source: 'assignment' | 'legacy' } {
  const assigned = document.assignments[operatorId];
  if (assigned && document.roles.some((role) => role.id === assigned)) {
    return { roleId: assigned, source: 'assignment' };
  }
  return { roleId: legacyRoleIdFor(legacyRole), source: 'legacy' };
}

export function roleDefinition(
  document: PolicyDocument,
  roleId: string,
): RoleDefinition | undefined {
  return document.roles.find((role) => role.id === roleId);
}

export function decide(document: PolicyDocument, roleId: string, capabilityId: string): Decision {
  const governing = governingCapability(capabilityId);
  const denied = (code: string): Decision => ({
    capabilityId,
    roleId,
    effect: 'DENIED',
    allowed: false,
    requiresConfirmation: false,
    code,
  });
  if (!governing) return denied('unknown_capability');
  if (governing.gate !== 'policy') {
    return { capabilityId, roleId, effect: 'ALLOWED', allowed: true, requiresConfirmation: false };
  }
  if (!roleDefinition(document, roleId)) return denied('unknown_role');
  const effect = document.grants[roleId]?.[governing.id] ?? document.defaultEffect;
  switch (effect) {
    case 'ALLOWED':
      return { capabilityId, roleId, effect, allowed: true, requiresConfirmation: false };
    case 'ALLOWED_WITH_CONFIRMATION':
      return { capabilityId, roleId, effect, allowed: true, requiresConfirmation: true };
    case 'READ_ONLY':
      return governing.type === 'read'
        ? { capabilityId, roleId, effect, allowed: true, requiresConfirmation: false }
        : { ...denied('read_only'), effect };
    default:
      return denied('capability_denied');
  }
}

export interface EffectiveCapability {
  id: string;
  effect: Decision['effect'];
  allowed: boolean;
  requiresConfirmation: boolean;
}

/** Every governed + derived capability with its effective decision for one role. */
export function effectiveCapabilities(
  document: PolicyDocument,
  roleId: string,
): EffectiveCapability[] {
  const out: EffectiveCapability[] = [];
  for (const cap of governedCapabilities()) {
    const d = decide(document, roleId, cap.id);
    out.push({
      id: cap.id,
      effect: d.effect,
      allowed: d.allowed,
      requiresConfirmation: d.requiresConfirmation,
    });
  }
  return out;
}

export function isKnownCapability(id: string): boolean {
  return Boolean(capabilityById(id));
}
