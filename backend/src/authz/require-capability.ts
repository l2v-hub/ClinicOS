// Explicit capability guard for routers that govern themselves (/authz/*): same decision function
// as the route gate. Must run after requireOperator.

import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from '../ai/auth.js';
import { authzOf, enforcementEnabled } from './request-context.js';

export function requireCapability(capabilityId: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const context = authzOf(req);
    if (!context) {
      res.status(503).json({ error: 'Autorizzazione non disponibile', code: 'authz_unavailable' });
      return;
    }
    if (!enforcementEnabled()) {
      // Enforcement off: keep the legacy admin|manager gate for administrative endpoints.
      if (['admin', 'manager'].includes((req.operator?.role ?? '').toLowerCase())) {
        next();
        return;
      }
      res.status(403).json({ error: 'Ruolo non autorizzato', code: 'role_forbidden' });
      return;
    }
    const decision = context.can(capabilityId);
    if (!decision.allowed) {
      res.status(403).json({
        error: 'Operazione non consentita al tuo ruolo',
        code: decision.code ?? 'capability_denied',
        capability: capabilityId,
        role: decision.roleId,
      });
      return;
    }
    next();
  };
}
