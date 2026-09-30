// HTTP surface of the Tool Layer — what an orchestrator (Agno runtime, future AI Assistant) uses.
//
//   GET  /tools                 → descriptors of the tools the CURRENT identity may invoke
//   POST /tools/:name/invoke    → { input, requestId? } → ToolResult envelope
//
// Identity comes only from `requireOperator` (Entra token or demo gate): the body cannot carry an
// identity, a role or a patient scope. `X-Tool-Origin` is audit metadata and never widens access.

import express, { Router, type RequestHandler, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit } from '../ai/rate-limit.js';
import { requireAuthorizationContext } from '../authz/request-context.js';
import { currentAuthorizationHook } from './hooks.js';
import type { ToolRegistry } from './registry.js';
import type { ToolContext, ToolOrigin } from './types.js';

const CLIENT_ORIGINS = new Set<ToolOrigin>(['gui', 'ai', 'tool']);

function originOf(req: AuthedRequest): ToolOrigin {
  const raw = (req.header('X-Tool-Origin') || '').trim().toLowerCase() as ToolOrigin;
  return CLIENT_ORIGINS.has(raw) ? raw : 'tool';
}

function identityOf(req: AuthedRequest): ToolContext['identity'] | null {
  const operator = req.operator;
  if (!operator) return null;
  return {
    operatorId: operator.id,
    role: operator.role,
    name: operator.name,
    ...(operator.appRole ? { appRole: operator.appRole } : {}),
  };
}

const INVOKE_PATH = /^\/tools\/([^/]+)\/invoke$/;

/**
 * True for `POST /tools/<name>/invoke` of a tool declaring `maxBodyBytes`: app.ts skips its
 * standard 512 kB parser for that exact path and the tool router parses the body AFTER auth.
 */
export function isLargeBodyToolInvoke(registry: ToolRegistry, path: string): boolean {
  const match = INVOKE_PATH.exec(path);
  if (!match) return false;
  let name: string;
  try {
    name = decodeURIComponent(match[1]);
  } catch {
    return false;
  }
  return Boolean(registry.get(name)?.maxBodyBytes);
}

export function createToolRouter(registry: ToolRegistry): Router {
  const largeBodyParsers = new Map<string, RequestHandler>();
  for (const tool of registry.list()) {
    if (tool.maxBodyBytes) {
      largeBodyParsers.set(tool.name, express.json({ limit: tool.maxBodyBytes }));
    }
  }

  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requireOperator);
  // Resolve the role from the active policy (the tool authorization hook re-checks per call).
  router.use(requireAuthorizationContext);
  router.use(importRateLimit);

  router.get('/', async (req: AuthedRequest, res: Response) => {
    const identity = identityOf(req);
    // Discovery is exactly what an orchestrator (Agno) may propose to this identity right now.
    if (!identity) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return;
    }
    const ctx: ToolContext = { identity, origin: originOf(req), requestId: 'tool-discovery' };
    const hook = currentAuthorizationHook();
    const visible = [];
    for (const tool of registry.list()) {
      try {
        const decision = await hook(tool, ctx, undefined);
        if (decision.allowed) {
          visible.push(
            registry.describe(tool, {
              requiresConfirmation: decision.requiresConfirmation === true,
            }),
          );
        }
      } catch {
        // Fail closed: a tool whose policy cannot be evaluated is not advertised.
      }
    }
    res.status(200).json({ tools: visible });
  });

  // Runs after requireOperator + rate limit (router.use above): no anonymous large-body parsing.
  const largeBodyParser: RequestHandler = (req, res, next) => {
    const parser = largeBodyParsers.get(String(req.params.name));
    if (!parser) {
      next();
      return;
    }
    parser(req, res, next);
  };

  router.post('/:name/invoke', largeBodyParser, async (req: AuthedRequest, res: Response) => {
    const body = req.body as
      { input?: unknown; requestId?: unknown; confirmed?: unknown } | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Corpo richiesta non valido', code: 'invalid_body' });
      return;
    }
    const result = await registry.invoke(String(req.params.name), body.input ?? {}, {
      identity: identityOf(req),
      origin: originOf(req),
      requestId: typeof body.requestId === 'string' ? body.requestId : undefined,
      confirmed: body.confirmed === true,
    });
    res.status(result.ok ? 200 : result.error.status).json(result);
  });

  return router;
}
