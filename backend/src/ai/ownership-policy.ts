import type { Operator } from './auth.js';
import type { NextFunction, Request, Response } from 'express';

const PRIVILEGED_ROLES = new Set(['admin', 'manager']);

export function canAccessOwnedResource(
  operator: Operator | undefined,
  createdById: string | null | undefined,
): boolean {
  if (!operator) return false;
  if (PRIVILEGED_ROLES.has(operator.role.toLowerCase())) return true;
  return Boolean(createdById && createdById === operator.id);
}

export type OwnerRecord = { createdById: string | null };
export type OwnerLoader = (id: string) => Promise<OwnerRecord | null>;

/**
 * Express param guard with a deliberately non-enumerating 404 policy. The data loader is
 * injected so the authorization behaviour can be tested without a database connection.
 */
export function createOwnedResourceParamGuard(loadOwner: OwnerLoader, notFoundMessage: string) {
  return (
    req: Request & { operator?: Operator },
    res: Response,
    next: NextFunction,
    id: string,
  ): void => {
    void (async () => {
      try {
        const resource = await loadOwner(id);
        if (!resource || !canAccessOwnedResource(req.operator, resource.createdById)) {
          res.status(404).json({ error: notFoundMessage });
          return;
        }
        next();
      } catch (error) {
        console.error('ownership check failed:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Errore durante la verifica accesso' });
      }
    })();
  };
}
