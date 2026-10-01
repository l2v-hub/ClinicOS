// Phase 6 (fail closed, availability): Express 4 does not catch rejected promises from async route
// handlers — an unexpected error (e.g. DB down during a scope check) would never answer the client
// and, unhandled, can terminate the process. `guardAsyncRoutes` wraps every handler registered via
// get/post/put/patch/delete so a rejection becomes a generic 503 (no data, no internal details).

import type { NextFunction, Request, Response, Router } from 'express';

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

function wrap(handler: unknown, label: string): unknown {
  if (typeof handler !== 'function' || handler.length >= 4) return handler; // error middleware as-is
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = (handler as Handler)(req, res, next);
      if (out && typeof (out as Promise<unknown>).catch === 'function')
        (out as Promise<unknown>).catch((error: unknown) => fail(error, req, res, label));
    } catch (error) {
      fail(error, req, res, label);
    }
  };
}

function fail(error: unknown, req: Request, res: Response, label: string) {
  console.error(
    `[${label}] ${req.method} ${req.path}: ${error instanceof Error ? error.name : typeof error}`,
  );
  if (!res.headersSent)
    res
      .status(503)
      .json({ error: 'Servizio temporaneamente non disponibile', code: 'unavailable' });
}

export function guardAsyncRoutes<T extends Router>(router: T, label = 'route'): T {
  for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    const original = router[method].bind(router) as (...args: unknown[]) => unknown;
    (router as unknown as Record<string, unknown>)[method] = (
      path: unknown,
      ...handlers: unknown[]
    ) => original(path, ...handlers.map((h) => wrap(h, label)));
  }
  return router;
}
