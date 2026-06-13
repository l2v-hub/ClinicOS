// Authorization for the AI import flow (REQ-019).
//
// The app has no central identity provider; operator identity is established
// client-side. This middleware enforces that import endpoints are only reachable
// by a known operator role — a pragmatic role-gate, not a full IdP. It rejects
// anonymous/forbidden callers with 401/403 and attaches the operator to the request
// for audit. Tighten to verified tokens when an IdP exists.

import type { NextFunction, Request, Response } from 'express';

export interface Operator {
  id: string;
  role: string;
}

// Accept the app's role values plus canonical names; everything else is forbidden.
const ALLOWED_ROLES = new Set(['operatore', 'admin', 'operator', 'manager']);

// Augment Express Request with the resolved operator (no global d.ts needed).
export interface AuthedRequest extends Request {
  operator?: Operator;
}

export function requireOperator(req: AuthedRequest, res: Response, next: NextFunction): void {
  const id = (req.header('X-Operator-Id') || '').trim();
  const role = (req.header('X-Operator-Role') || '').trim().toLowerCase();

  if (!id || !role) {
    res.status(401).json({ error: 'Autenticazione richiesta: operatore non identificato' });
    return;
  }
  if (!ALLOWED_ROLES.has(role)) {
    res.status(403).json({ error: 'Ruolo non autorizzato per l’importazione' });
    return;
  }
  req.operator = { id: id.slice(0, 64), role };
  next();
}
