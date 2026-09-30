// Impact preview of a proposed policy (before Save/Apply): what changes, for which roles and
// identities, and which tools each role gains or loses (what Agno will see).

import { decide, resolveRoleId } from './decision.js';
import { diffPolicies, parsePolicyDocument } from './policy-document.js';
import { capabilityById, governedCapabilities } from './registry.js';
import type { PolicyDocument } from './types.js';

export interface PolicyImpact {
  diff: ReturnType<typeof diffPolicies>;
  /** Per role: capabilities newly allowed / newly denied (effective decision). */
  roles: {
    roleId: string;
    gained: string[];
    lost: string[];
    confirmationChanged: string[];
    toolsGained: string[];
    toolsLost: string[];
    identities: string[];
  }[];
  warnings: string[];
}

export function policyImpact(
  current: PolicyDocument,
  proposedRaw: unknown,
  toolNames: readonly string[],
  /** Server-verified legacy role string of an identity (for the fallback of removed assignments). */
  legacyRoleOf: (operatorId: string) => string | undefined = () => undefined,
): PolicyImpact {
  const proposed = parsePolicyDocument(proposedRaw);
  const diff = diffPolicies(current, proposed);
  const tools = new Set(toolNames);
  const byRole = new Map<string, PolicyImpact['roles'][number]>();
  const roleEntry = (roleId: string) => {
    let entry = byRole.get(roleId);
    if (!entry) {
      entry = {
        roleId,
        gained: [],
        lost: [],
        confirmationChanged: [],
        toolsGained: [],
        toolsLost: [],
        identities: Object.entries(proposed.assignments)
          .filter(([, role]) => role === roleId)
          .map(([operatorId]) => operatorId),
      };
      byRole.set(roleId, entry);
    }
    return entry;
  };
  for (const change of diff.grants) {
    const before = current.roles.some((r) => r.id === change.roleId)
      ? decide(current, change.roleId, change.capabilityId)
      : null;
    const after = proposed.roles.some((r) => r.id === change.roleId)
      ? decide(proposed, change.roleId, change.capabilityId)
      : null;
    const entry = roleEntry(change.roleId);
    const was = before?.allowed ?? false;
    const now = after?.allowed ?? false;
    if (!was && now) {
      entry.gained.push(change.capabilityId);
      if (tools.has(change.capabilityId)) entry.toolsGained.push(change.capabilityId);
    } else if (was && !now) {
      entry.lost.push(change.capabilityId);
      if (tools.has(change.capabilityId)) entry.toolsLost.push(change.capabilityId);
    } else if ((before?.requiresConfirmation ?? false) !== (after?.requiresConfirmation ?? false)) {
      entry.confirmationChanged.push(change.capabilityId);
    }
  }
  for (const change of diff.assignments) {
    if (change.before) roleEntry(change.before);
    if (change.after) roleEntry(change.after);
  }

  const warnings: string[] = [];
  // Identity-level effect of assignment changes, INCLUDING the legacy fallback of a removed
  // assignment (e.g. a manager identity falls back to legacy_admin = every capability).
  for (const change of diff.assignments) {
    const legacyRole = legacyRoleOf(change.operatorId) ?? 'operatore';
    const was = resolveRoleId(current, change.operatorId, legacyRole).roleId;
    const now = resolveRoleId(proposed, change.operatorId, legacyRole).roleId;
    if (was === now) continue;
    const gained = governedCapabilities().filter(
      (cap) => !decide(current, was, cap.id).allowed && decide(proposed, now, cap.id).allowed,
    );
    if (change.after === null) {
      warnings.push(
        `L’identità ${change.operatorId} perde l’assegnazione e ricade sul ruolo legacy "${now}" (${gained.length} capability in più).`,
      );
    }
    if (gained.some((cap) => cap.id === 'authz.manage_policy')) {
      warnings.push(`L’identità ${change.operatorId} potrà gestire ruoli e permessi.`);
    }
  }
  for (const entry of byRole.values()) {
    const critical = entry.gained.filter((id) => {
      const sensitivity = capabilityById(id)?.sensitivity;
      return sensitivity === 'critical' || sensitivity === 'high';
    });
    if (critical.length) {
      warnings.push(
        `Il ruolo ${entry.roleId} ottiene ${critical.length} capability ad alta sensibilità: ${critical.slice(0, 5).join(', ')}${critical.length > 5 ? '…' : ''}`,
      );
    }
  }
  if (diff.defaultEffect && diff.defaultEffect.after !== 'DENIED') {
    warnings.push(
      'L’effetto di default non è più DENIED: la configurazione non è deny-by-default.',
    );
  }
  return { diff, roles: [...byRole.values()], warnings };
}
