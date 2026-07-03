// REQ-041: write-action audit. Records WHO did WHICH action on WHICH patient/record and the outcome.
// Source is always VOICE. PHI-safe: we log the NAMES of modified fields, never their clinical values,
// and never the transcript — matching the gateway's PHI-free audit policy.

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

export function voiceAudit(
  ctx: { requestId: string; userId: string; channel?: 'TESTO' | 'VOCE' },
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
}
