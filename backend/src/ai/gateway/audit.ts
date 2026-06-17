// REQ-039: gateway audit. Records WHO asked WHAT tool over WHICH patients with how many results —
// and nothing clinical. No question text, no clinical answer, no rawText, no documents, no API key.

import type { UserContext } from './types.js';

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
  ctx: Pick<UserContext, 'requestId' | 'userId' | 'tenantId'>,
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
}
