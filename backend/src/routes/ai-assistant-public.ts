// REQ-040: PUBLIC, operator-authenticated entry point for the ClinicOS assistant.
//
// The browser calls THIS (with the same X-Operator-Id / X-Operator-Role headers it already sends) —
// it never holds the runtime service token. The operator identity is mapped to a gateway UserContext
// and `assistantQuery` runs IN-PROCESS over the read-only Data Gateway (REQ-039). SOURCE_ONLY answers,
// clinical-advice refused, cross-patient role+env gated — all enforced downstream.

import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit } from '../ai/rate-limit.js';
import { defaultTenant } from '../ai/gateway/context.js';
import { GatewayError, type UserContext } from '../ai/gateway/types.js';
import { assistantQuery } from '../ai/assistant/service.js';

const assistantPublicRouter = Router();
assistantPublicRouter.use(requireOperator);
assistantPublicRouter.use(importRateLimit);

// Cross-patient search is privileged (manager/admin). On THIS public route the role is a
// self-asserted, unauthenticated header (no IdP) — so it must never confer privilege, or anyone
// could set X-Operator-Role: admin and dump data across patients. We pin the gateway role to a
// non-privileged operator scope: single-patient operator access still works, but
// canCrossPatientSearch() can never be unlocked from here. The real role stays on req.operator for
// audit; restore it to the context only once operator identity is cryptographically verified.
const NON_PRIVILEGED_ROLE = 'operatore';

export function ctxFromOperator(req: AuthedRequest): UserContext {
  const op = req.operator!; // requireOperator guarantees it
  return {
    userId: op.id,
    tenantId: defaultTenant(),
    roles: [NON_PRIVILEGED_ROLE], // privilege never derives from a public header (see note above)
    permittedPatientIds: null, // operator scope within the single tenant
    requestId: `op-${op.id}-${req.header('X-Request-Id') ?? 'web'}`,
  };
}

function fail(res: Response, err: unknown) {
  if (err instanceof GatewayError) {
    const map: Record<string, number> = {
      unauthorized: 401,
      forbidden: 403,
      tenant_isolation: 403,
      cross_patient_disabled: 403,
      not_found: 404,
      bad_request: 400,
    };
    return res.status(map[err.kind] ?? 400).json({ error: err.message, kind: err.kind });
  }
  console.error('[ai-assistant] error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Errore assistente' });
}

// POST /ai/assistant/query  { question, currentPatientId? }
assistantPublicRouter.post('/query', async (req, res) => {
  try {
    const question = String(req.body?.question ?? '').slice(0, 500);
    const currentPatientId = req.body?.currentPatientId
      ? String(req.body.currentPatientId)
      : undefined;
    const answer = await assistantQuery(question, ctxFromOperator(req as AuthedRequest), {
      currentPatientId,
    });
    return res.status(200).json(answer);
  } catch (err) {
    return fail(res, err);
  }
});

export default assistantPublicRouter;
