import { Router, type Response } from 'express';
import { requireOperator, requireRole, type AuthedRequest } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { RosterError, rosterId } from '../roster/order-contract.js';
import {
  readRosterPreference,
  patchRosterPreference,
  listRosterContexts,
  patchRosterDefault,
} from '../roster/preferences.js';

export const meRosterOrderRouter = Router();
export const adminRosterOrderRouter = Router();
for (const router of [meRosterOrderRouter, adminRosterOrderRouter]) {
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requireOperator);
}
adminRosterOrderRouter.use(requireRole('admin', 'manager'));

function handle(action: (req: AuthedRequest) => Promise<unknown>) {
  return async (req: AuthedRequest, res: Response) => {
    try {
      res.json(await action(req));
    } catch (error) {
      if (error instanceof RosterError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
          ...(error.reason && { reason: error.reason }),
        });
        return;
      }
      console.error('Roster preference error:', error);
      res.status(500).json({ error: 'Preferenza non disponibile', code: 'roster_unavailable' });
    }
  };
}
meRosterOrderRouter.get(
  '/roster-order',
  handle((req) =>
    prisma.$transaction((tx) => readRosterPreference(req.operator!, tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    }),
  ),
);
meRosterOrderRouter.patch(
  '/roster-order',
  handle((req) => patchRosterPreference(req.operator!, req.body)),
);
adminRosterOrderRouter.get(
  '/roster-contexts',
  handle((req) => listRosterContexts(req.query as Record<string, unknown>)),
);
adminRosterOrderRouter.patch(
  '/roster-contexts/:id',
  handle((req) => patchRosterDefault(rosterId(req.params.id), req.body)),
);
