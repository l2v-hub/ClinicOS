// Central Confirmation Policy for skills (CONFIRMATION_POLICY.md; Phase 4: version 2).
//
//   READ             → no extra confirmation when the policy allows the tools.
//   LOW_RISK_WRITE   → preview + explicit confirmation (an AI-initiated write is never silent).
//   SENSITIVE_WRITE  → structured preview + explicit confirmation.
//   HIGH_RISK        → the assistant only PREPARES (prescription, administration): structured
//                      preview, then the authorised professional confirms. Never the LLM.
//
// v2 (Prompt 4 §8): a confirmation is ONLY an explicit UI event `action: "confirm"` carrying the
// `previewId` it confirms. A changed payload issues a new preview id, so an older confirmation is
// refused (`preview_stale`). A typed «sì» is never a confirmation (the reply points to the button).
// The Phase 2 policy effect ALLOWED_WITH_CONFIRMATION of a tool also upgrades a READ skill.

import type { ConfirmationClass, SkillDefinition } from './types.js';

export const CONFIRMATION_POLICY_VERSION = 2;

export type ConfirmationDecision =
  | { mode: 'none' }
  | {
      mode: 'preview_and_confirm';
      reason: 'class' | 'policy_effect';
      /** HIGH_RISK: the confirmer must be the professional allowed by the policy (the caller). */
      professional: boolean;
    };

export function confirmationFor(
  skill: SkillDefinition,
  confirmationTools: readonly string[],
): ConfirmationDecision {
  const byClass: Record<ConfirmationClass, ConfirmationDecision> = {
    READ: { mode: 'none' },
    LOW_RISK_WRITE: { mode: 'preview_and_confirm', reason: 'class', professional: false },
    SENSITIVE_WRITE: { mode: 'preview_and_confirm', reason: 'class', professional: false },
    HIGH_RISK: { mode: 'preview_and_confirm', reason: 'class', professional: true },
  };
  const decision = byClass[skill.confirmation];
  if (decision.mode === 'none' && confirmationTools.length > 0) {
    return { mode: 'preview_and_confirm', reason: 'policy_effect', professional: false };
  }
  return decision;
}

const YES =
  /^\s*(s[iì]|si confermo|confermo|conferma|ok(ay)?|va bene|procedi|esegui|certo)\s*[.!]?\s*$/i;
const NO = /^\s*(no|annulla|annullare|lascia (stare|perdere)|stop|fermati|non farlo)\s*[.!]?\s*$/i;

/** A typed «sì/conferma»: recognised only to point the user to the «Conferma» button. */
export function isExplicitConfirmation(message: string | undefined): boolean {
  return typeof message === 'string' && YES.test(message);
}

export function isExplicitCancellation(message: string | undefined): boolean {
  return typeof message === 'string' && NO.test(message);
}
