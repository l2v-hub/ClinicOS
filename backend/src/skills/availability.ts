// Role → Skill availability, derived at request time from the Phase 2 policy.
//
// A skill is available only when EVERY required tool is allowed for the identity by the SAME
// authorization hook that `GET /tools` and `POST /tools/:name/invoke` use. No grant lives here:
// revoking a capability in "Ruoli e permessi" makes the dependent skills disappear (or become
// partial) at the next call, without restarting anything.

import { currentAuthorizationHook } from '../tools/hooks.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { SKILL_CATALOG } from './catalog.js';
import type { SkillDefinition } from './types.js';

export interface SkillAvailability {
  skill: SkillDefinition;
  available: boolean;
  /** Available but some optional tools are denied: the result is reduced. */
  partial: boolean;
  missingRequired: string[];
  missingOptional: string[];
  /** Tools whose policy effect is ALLOWED_WITH_CONFIRMATION for this identity. */
  confirmationTools: string[];
}

export type ToolDecisions = Map<string, { allowed: boolean; requiresConfirmation: boolean }>;

/** One policy evaluation per tool referenced by the catalog (same hook as GET /tools). */
export async function evaluateTools(
  registry: ToolRegistry,
  identity: ToolContext['identity'],
  requestId: string,
): Promise<ToolDecisions> {
  const names = new Set<string>();
  for (const skill of SKILL_CATALOG) {
    for (const tool of [...skill.requiredTools, ...skill.optionalTools]) names.add(tool);
  }
  const hook = currentAuthorizationHook();
  const ctx: ToolContext = { identity, origin: 'ai', requestId };
  const decisions: ToolDecisions = new Map();
  for (const name of names) {
    const tool = registry.get(name);
    if (!tool) {
      decisions.set(name, { allowed: false, requiresConfirmation: false });
      continue;
    }
    try {
      const decision = await hook(tool, ctx, undefined);
      decisions.set(name, {
        allowed: decision.allowed,
        requiresConfirmation: decision.requiresConfirmation === true,
      });
    } catch {
      // Fail closed, as GET /tools does.
      decisions.set(name, { allowed: false, requiresConfirmation: false });
    }
  }
  return decisions;
}

export function availabilityOf(
  skill: SkillDefinition,
  decisions: ToolDecisions,
): SkillAvailability {
  const allowed = (name: string) => decisions.get(name)?.allowed === true;
  const missingRequired = skill.requiredTools.filter((name) => !allowed(name));
  const missingOptional = skill.optionalTools.filter((name) => !allowed(name));
  return {
    skill,
    available: missingRequired.length === 0,
    partial: missingRequired.length === 0 && missingOptional.length > 0,
    missingRequired,
    missingOptional,
    confirmationTools: [...skill.requiredTools, ...skill.optionalTools].filter(
      (name) => decisions.get(name)?.requiresConfirmation === true,
    ),
  };
}

export async function skillAvailability(
  registry: ToolRegistry,
  identity: ToolContext['identity'],
  requestId = 'skill-discovery',
): Promise<SkillAvailability[]> {
  const decisions = await evaluateTools(registry, identity, requestId);
  return SKILL_CATALOG.map((skill) => availabilityOf(skill, decisions));
}
