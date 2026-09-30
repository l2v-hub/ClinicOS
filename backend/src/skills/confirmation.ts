// Central Confirmation Policy for skills (CONFIRMATION_POLICY.md, version 1).
//
//   READ             → no extra confirmation when the policy allows the tools.
//   LOW_RISK_WRITE   → preview + confirmation (AI-initiated writes are never silent).
//   SENSITIVE_WRITE  → structured preview + explicit confirmation.
//   HIGH_RISK        → never executed by the assistant: human control through the existing GUI.
//
// The policy effect ALLOWED_WITH_CONFIRMATION of a tool (Phase 2) always upgrades a skill to
// "confirmation required", even if its class alone would not. Confirmation is an explicit user
// act (`action: "confirm"` or an unambiguous "sì/conferma"), never inferred by the LLM.

import type { ConfirmationClass, SkillDefinition } from './types.js';

export const CONFIRMATION_POLICY_VERSION = 1;

export type ConfirmationDecision =
  | { mode: 'none' }
  | { mode: 'preview_and_confirm'; reason: 'class' | 'policy_effect' }
  | { mode: 'human_only' };

export function confirmationFor(
  skill: SkillDefinition,
  confirmationTools: readonly string[],
): ConfirmationDecision {
  const byClass: Record<ConfirmationClass, ConfirmationDecision> = {
    READ: { mode: 'none' },
    LOW_RISK_WRITE: { mode: 'preview_and_confirm', reason: 'class' },
    SENSITIVE_WRITE: { mode: 'preview_and_confirm', reason: 'class' },
    HIGH_RISK: { mode: 'human_only' },
  };
  const decision = byClass[skill.confirmation];
  if (decision.mode === 'none' && confirmationTools.length > 0) {
    return { mode: 'preview_and_confirm', reason: 'policy_effect' };
  }
  return decision;
}

const YES =
  /^\s*(s[iì]|si confermo|confermo|conferma|ok(ay)?|va bene|procedi|esegui|certo)\s*[.!]?\s*$/i;
const NO = /^\s*(no|annulla|annullare|lascia (stare|perdere)|stop|fermati|non farlo)\s*[.!]?\s*$/i;

/** Only an explicit, whole-message "sì/conferma" counts; anything else is not a confirmation. */
export function isExplicitConfirmation(message: string | undefined): boolean {
  return typeof message === 'string' && YES.test(message);
}

export function isExplicitCancellation(message: string | undefined): boolean {
  return typeof message === 'string' && NO.test(message);
}
