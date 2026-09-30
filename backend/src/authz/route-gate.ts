// Backend enforcement for GUI/API routes ("deny by backend, not by UI").
//
// Mounted once in app.ts before the routers. For a request whose method+path matches a catalogued
// capability governed by the policy, it establishes the identity with the SAME requireOperator gate
// the routers use (idempotent), asks the policy, and refuses with 403 before any route code runs.
// A direct call that bypasses the GUI or Agno therefore meets the same decision.
// Writes and denials are audited with identity + role at the time of the action.

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { recordAuditEvent, type AiAuditChannel, type AiAuditKind } from '../ai/audit-store.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { governingCapability, matchRoute } from './registry.js';
import { authzOf, enforcementEnabled, ensureAuthorization } from './request-context.js';
import type { CapabilityEntry, Decision } from './types.js';

function unmappedRoutesDenied(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AUTHZ_UNMAPPED_ROUTES || 'allow').trim().toLowerCase() === 'deny';
}

// Routes that are part of the authorization/identity/tool infrastructure itself and enforce their
// own capability checks (or are pre-auth by design).
// /skills composes Tool Layer tools: every tool call is re-authorized by the tool hook.
const SELF_GOVERNED_PREFIXES = ['/auth/', '/authz/', '/tools', '/skills'];

function channelOf(req: Request): AiAuditChannel {
  return req.path.startsWith('/ai/') ? 'ai' : 'gui';
}

function auditKindOf(capability: CapabilityEntry, method: string): AiAuditKind {
  if (method === 'DELETE') return 'delete';
  if (capability.type === 'write') return method === 'POST' ? 'create' : 'update';
  return capability.type === 'read' ? 'read' : 'action';
}

function patientIdOf(req: Request): string | null {
  const match = /^\/patients\/([^/]+)/i.exec(req.path);
  if (
    match &&
    !['page', 'parameters', 'clinical-summary', 'settings', 'seed', 'demo-setup'].includes(match[1])
  ) {
    // Client-controlled path: a malformed escape must never throw (it would crash the process
    // from a promise/finish callback). Keep the raw segment instead.
    try {
      return decodeURIComponent(match[1]).slice(0, 64);
    } catch {
      return match[1].slice(0, 64);
    }
  }
  return null;
}

function audit(
  req: AuthedRequest,
  capability: CapabilityEntry,
  decision: Decision | null,
  outcome: 'ok' | 'denied' | 'error',
  requestId: string,
): void {
  try {
    writeAudit(req, capability, decision, outcome, requestId);
  } catch (error) {
    // Audit is best-effort and must never break (or crash) the request.
    console.error('[authz-audit] failed:', error instanceof Error ? error.name : 'unknown');
  }
}

function writeAudit(
  req: AuthedRequest,
  capability: CapabilityEntry,
  decision: Decision | null,
  outcome: 'ok' | 'denied' | 'error',
  requestId: string,
): void {
  const identity = authzOf(req)?.identity;
  recordAuditEvent({
    requestId,
    operatorId: identity?.operatorId ?? req.operator?.id ?? 'unknown',
    operatorRole: identity?.roleId ?? 'unknown',
    patientId: patientIdOf(req),
    actionType: capability.id,
    kind: outcome === 'denied' ? 'refusal' : auditKindOf(capability, req.method),
    channel: channelOf(req),
    // Field NAMES / decision metadata only (PHI-safe).
    fields: [
      `route:${req.method}`,
      `effect:${decision?.effect ?? 'n/a'}`,
      `policy:v${authzOf(req)?.policy.version ?? 'n/a'}`,
    ],
    outcome,
  });
}

export function capabilityRouteGate(req: Request, res: Response, next: NextFunction): void {
  if (!enforcementEnabled()) {
    next();
    return;
  }
  if (req.method === 'OPTIONS' || SELF_GOVERNED_PREFIXES.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }
  const matched = matchRoute(req.method, req.path);
  if (!matched) {
    if (unmappedRoutesDenied() && req.path !== '/health') {
      res.status(403).json({ error: 'Operazione non catalogata', code: 'capability_unmapped' });
      return;
    }
    next();
    return;
  }
  const capability = governingCapability(matched.id) ?? matched;
  if (capability.gate !== 'policy') {
    next();
    return;
  }
  const authed = req as AuthedRequest;
  requireOperator(authed, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    ensureAuthorization(authed).then(
      (context) => decideRoute(authed, res, next, capability, context),
      () => {
        res
          .status(503)
          .json({ error: 'Autorizzazione non disponibile', code: 'authz_unavailable' });
      },
    );
  });
}

function decideRoute(
  authed: AuthedRequest,
  res: Response,
  next: NextFunction,
  capability: CapabilityEntry,
  context: NonNullable<ReturnType<typeof authzOf>>,
): void {
  {
    // Same decision function as the Tool Layer and Agnos (authz/decision.ts#decide).
    const decision = context.can(capability.id);
    const requestId = `route-${randomUUID()}`;
    if (!decision.allowed) {
      audit(authed, capability, decision, 'denied', requestId);
      res.status(403).json({
        error:
          decision.code === 'read_only'
            ? 'Il tuo ruolo ha accesso in sola lettura a questa funzione'
            : 'Operazione non consentita al tuo ruolo',
        code: decision.code ?? 'capability_denied',
        capability: capability.id,
        role: decision.roleId,
      });
      return;
    }
    if (capability.type !== 'read') {
      res.on('finish', () => {
        const outcome = res.statusCode === 403 ? 'denied' : res.statusCode < 400 ? 'ok' : 'error';
        audit(authed, capability, decision, outcome, requestId);
      });
    }
    next();
  }
}
