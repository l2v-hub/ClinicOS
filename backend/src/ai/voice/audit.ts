// REQ-041: write-action audit. Records WHO did WHICH action on WHICH patient/record and the outcome.
// Source is always VOICE. PHI-safe: we log the NAMES of modified fields, never their clinical values,
// and never the transcript — matching the gateway's PHI-free audit policy.
//
// SPEC-015 (US2): besides the stdout line, every entry is ALSO persisted to Postgres via
// recordAuditEvent() — best-effort, never blocking the operator's action.

import { AGNOS_ACTION_CATALOG } from '../actions/catalog.js';
import { recordAuditEvent, type AiAuditKind } from '../audit-store.js';

export interface VoiceAuditEntry {
  requestId: string;
  userId: string;
  patientId: string | null;
  actionType: string;
  recordId: string | null;
  fields: string[];          // field NAMES only, no values
  source: 'VOICE';
  /** SPEC-015: input channel — TESTO (typed) or VOCE (spoken). Legacy callers default to VOCE. */
  channel: 'TESTO' | 'VOCE';
  outcome: 'ok' | 'denied' | 'error' | 'deduped';
  at: string;
}

/** SPEC-015: derive the audit `kind` from the actionType — refus* ⇒ 'refusal', otherwise the
 *  catalog's CRU kind; anything unknown/out-of-catalog is recorded as a refusal (deny-by-default). */
export function auditKindFor(actionType: string): AiAuditKind {
  if (actionType.startsWith('refus')) return 'refusal';
  const entry = AGNOS_ACTION_CATALOG[actionType];
  return entry ? entry.kind : 'refusal';
}

export function voiceAudit(
  ctx: { requestId: string; userId: string; channel?: 'TESTO' | 'VOCE'; operatorRole?: string },
  actionType: string,
  patientId: string | null,
  recordId: string | null,
  fields: string[],
  outcome: VoiceAuditEntry['outcome'],
  now: string,
): void {
  const entry: VoiceAuditEntry = {
    requestId: ctx.requestId,
    userId: ctx.userId,
    patientId,
    actionType,
    recordId,
    fields: fields.slice(0, 20),
    source: 'VOICE',
    channel: ctx.channel ?? 'VOCE',
    outcome,
    at: now,
  };
  console.log(`[ai-voice] ${JSON.stringify(entry)}`);
  // SPEC-015 (US2): persistent, PHI-safe copy on Postgres — best-effort, never throws.
  recordAuditEvent({
    requestId: entry.requestId,
    operatorId: entry.userId,
    operatorRole: ctx.operatorRole ?? 'operatore',
    patientId: entry.patientId,
    actionType: entry.actionType,
    kind: auditKindFor(entry.actionType),
    channel: entry.channel === 'TESTO' ? 'testo' : 'voce',
    fields: entry.fields,
    outcome: entry.outcome,
    createdAt: entry.at,
  });
}
