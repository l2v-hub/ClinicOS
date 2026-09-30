// Authorization + audit hooks of the Tool Layer.
//
// Phase 2: the DEFAULT authorization hook is the capability policy (authz/tool-policy.ts).
// `legacyRoleAuthorization` (Phase 1 behaviour) stays available and is used when
// AUTHZ_ENFORCEMENT=off.
//
// Phase 1 shipped only LEGACY behaviour, identical to today's routes:
//   - authorization: a tool whose route is gated by `requireRole(...)` keeps that gate
//     (`legacyRoles`); every other tool is open to any authenticated operator and the reused
//     service applies its own data scope (patient ownership, author/assignee, …);
//   - audit: one PHI-safe AiAuditEvent per invocation (ids + input field NAMES, never values).
// Phase 2 (roles/policy) replaces the hooks with `setAuthorizationHook` / `setAuditHook`; tools
// do not change.

import { recordAuditEvent, type AiAuditKind } from '../ai/audit-store.js';
import { enforcementEnabled } from '../authz/request-context.js';
import { policyToolAuthorization } from '../authz/tool-policy.js';
import type { ToolAuditKind, ToolContext, ToolDefinition } from './types.js';

export interface AuthorizationDecision {
  allowed: boolean;
  /** Stable machine code, e.g. `role_forbidden`. */
  code?: string;
  reason?: string;
  /** Allowed only with an explicit confirmation (policy effect ALLOWED_WITH_CONFIRMATION). */
  requiresConfirmation?: boolean;
  /** Policy role that produced the decision (audit attribution). */
  roleId?: string;
}

export type AuthorizationHook = (
  tool: ToolDefinition,
  ctx: ToolContext,
  input: Record<string, unknown> | undefined,
) => AuthorizationDecision | Promise<AuthorizationDecision>;

export type ToolAuditOutcome = 'ok' | 'denied' | 'error';

export interface ToolAuditEvent {
  tool: string;
  auditKind: ToolAuditKind;
  requestId: string;
  operatorId: string;
  operatorRole: string;
  origin: ToolContext['origin'];
  patientId: string | null;
  /** Input field NAMES only (PHI-safe). */
  fields: string[];
  outcome: ToolAuditOutcome;
  errorCode?: string;
}

export type AuditHook = (event: ToolAuditEvent) => void;

/** Legacy gate: mirrors the `requireRole(...)` currently applied by the equivalent route. */
export const legacyRoleAuthorization: AuthorizationHook = (tool, ctx) => {
  if (!tool.legacyRoles || tool.legacyRoles.length === 0) return { allowed: true };
  const role = ctx.identity.role.trim().toLowerCase();
  return tool.legacyRoles.some((allowed) => allowed.toLowerCase() === role)
    ? { allowed: true }
    : { allowed: false, code: 'role_forbidden', reason: 'Ruolo non autorizzato' };
};

function auditKindForStore(kind: ToolAuditKind): AiAuditKind {
  return kind;
}

/** Default sink: the existing best-effort AiAuditEvent store (never throws, never blocks). */
export const aiAuditEventSink: AuditHook = (event) => {
  recordAuditEvent({
    requestId: event.requestId,
    operatorId: event.operatorId,
    operatorRole: event.operatorRole,
    patientId: event.patientId,
    actionType: `tool:${event.tool}`,
    kind: auditKindForStore(event.auditKind),
    channel: event.origin,
    fields: event.fields,
    outcome: event.outcome,
  });
};

/** Default: capability policy; legacy requireRole mirror only when enforcement is switched off. */
export const defaultAuthorizationHook: AuthorizationHook = (tool, ctx, input) =>
  enforcementEnabled()
    ? policyToolAuthorization(tool, ctx, input)
    : legacyRoleAuthorization(tool, ctx, input);

let authorizationHook: AuthorizationHook = defaultAuthorizationHook;
let auditHook: AuditHook = aiAuditEventSink;

export function setAuthorizationHook(hook: AuthorizationHook | null): void {
  authorizationHook = hook ?? defaultAuthorizationHook;
}

export function setAuditHook(hook: AuditHook | null): void {
  auditHook = hook ?? aiAuditEventSink;
}

export function currentAuthorizationHook(): AuthorizationHook {
  return authorizationHook;
}

export function emitToolAudit(event: ToolAuditEvent): void {
  try {
    auditHook(event);
  } catch (error) {
    console.error(
      '[tool-audit] sink fallito (azione NON bloccata):',
      error instanceof Error ? error.message : error,
    );
  }
}
