// REQ-039: gateway audit. Records WHO asked WHAT tool over WHICH patients with how many results —
// and nothing clinical. No question text, no clinical answer, no rawText, no documents, no API key.

import type { UserContext } from './types.js';
import { recordAuditEvent } from '../audit-store.js';

export interface GatewayAuditEntry {
  requestId: string;
  userId: string;
  tenantId: string;
  toolName: string;
  patientIds: string[];
  resultCount: number;
  outcome: 'ok' | 'empty' | 'denied' | 'error';
  at: string;
}

export function gatewayAudit(
  ctx: Pick<UserContext, 'requestId' | 'userId' | 'tenantId'> & Partial<Pick<UserContext, 'roles'>>,
  toolName: string,
  patientIds: string[],
  resultCount: number,
  outcome: GatewayAuditEntry['outcome'],
  now: string,
): void {
  const entry: GatewayAuditEntry = {
    requestId: ctx.requestId,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    toolName,
    patientIds: patientIds.slice(0, 50),
    resultCount,
    outcome,
    at: now,
  };
  // Structured, PHI-free line. A log shipper can pick this up; never includes clinical content.
  console.log(`[ai-gateway] ${JSON.stringify(entry)}`);
  // SPEC-015 (US2): persistent, PHI-safe copy on Postgres — best-effort, never throws.
  // The gateway is read-only: a denied call is recorded as a refusal, everything else as a read.
  // patientId is set only for single-patient reads (null = cross-patient, per data-model).
  recordAuditEvent({
    requestId: entry.requestId,
    operatorId: entry.userId,
    operatorRole: ctx.roles?.[0] ?? 'operatore',
    patientId: entry.patientIds.length === 1 ? entry.patientIds[0] : null,
    actionType: entry.toolName,
    kind: entry.outcome === 'denied' ? 'refusal' : 'read',
    channel: 'testo', // gateway reads carry no input channel; recorded as testo by convention
    fields: [],
    outcome: entry.outcome,
    createdAt: entry.at,
  });
}
