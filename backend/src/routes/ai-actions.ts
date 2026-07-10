// SPEC-015: unified Agnos endpoints — one orchestrator for typed AND voice commands.
// Same auth posture as the public assistant: requireOperator (header identity), rate limit,
// gateway role clamped to 'operatore' (privilege never derives from a public header).
// Errors follow the SPEC-015 contract shape: { error: { kind, message } }.

import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit } from '../ai/rate-limit.js';
import { VoiceError } from '../ai/voice/execute.js';
import { loadVoiceConfig } from '../ai/voice/config.js';
import { GatewayError } from '../ai/gateway/types.js';
import { SlotConflictError } from '../services/appointment-service.js';
import { listCatalog } from '../ai/actions/catalog.js';
import { planCommand, executeCommand, type AgnosChannel, type AgnosOperatorContext } from '../ai/actions/orchestrate.js';
import { ctxFromOperator } from './ai-assistant-public.js';

const actionsRouter = Router();
actionsRouter.use(requireOperator);
actionsRouter.use(importRateLimit);

/** Operator identity + role-clamped gateway context, shared with the voice routes. */
export function agnosOperatorFrom(req: AuthedRequest): AgnosOperatorContext {
  const op = req.operator!; // requireOperator guarantees it
  const fromHeader = (req.header('X-Operator-Name') || '').trim();
  return { operatorId: op.id, operatorName: fromHeader || op.id, gatewayCtx: ctxFromOperator(req) };
}

function parseChannel(raw: unknown): AgnosChannel {
  return raw === 'voce' ? 'voce' : 'testo';
}

const VOICE_ERROR_STATUS: Record<string, number> = {
  feature_disabled: 403, writes_disabled: 403, not_in_catalog: 403, delete_forbidden: 403,
  not_executable: 400, ambiguous: 422, confirmation_required: 428,
};

function fail(res: Response, err: unknown) {
  // SPEC-015 US4: slot re-checked inside the shared service at write time (race between preview
  // and confirm) — surfaced with the same contract shape as the REST route.
  if (err instanceof SlotConflictError) {
    return res.status(409).json({ error: { kind: 'slot_conflict', message: err.message } });
  }
  if (err instanceof VoiceError) {
    return res.status(VOICE_ERROR_STATUS[err.kind] ?? 400).json({ error: { kind: err.kind, message: err.message } });
  }
  if (err instanceof GatewayError) {
    const map: Record<string, number> = {
      unauthorized: 401, forbidden: 403, tenant_isolation: 403, cross_patient_disabled: 403, not_found: 404, bad_request: 400,
    };
    return res.status(map[err.kind] ?? 400).json({ error: { kind: err.kind, message: err.message } });
  }
  console.error('[ai-actions] error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: { kind: 'internal', message: 'Errore assistente AI' } });
}

// GET /ai/actions/catalog — inspectable allowlist (proof: zero delete actions).
actionsRouter.get('/catalog', (_req, res) => {
  res.status(200).json(listCatalog());
});

// Task 6: sanitizes the optional patient display name from the request body — plain string, capped
// (defense in depth: this only feeds the `clarify` chip text, never a query/authz decision).
function sanitizePatientName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().slice(0, 120);
  return trimmed || undefined;
}

// POST /ai/actions/plan  { text, channel, currentPatientId?, currentPatientName? } → { plan, preview, read }
actionsRouter.post('/plan', async (req: AuthedRequest, res) => {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: { kind: 'bad_request', message: 'Testo del comando mancante.' } });
    if (!loadVoiceConfig().voiceEnabled) {
      return res.status(403).json({ error: { kind: 'feature_disabled', message: 'Assistente AI disabilitato.' } });
    }
    const currentPatientId = req.body?.currentPatientId ? String(req.body.currentPatientId) : undefined;
    const currentPatientName = sanitizePatientName(req.body?.currentPatientName);
    const result = await planCommand({
      text, channel: parseChannel(req.body?.channel), currentPatientId, currentPatientName, operatorCtx: agnosOperatorFrom(req),
    });
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err);
  }
});

// POST /ai/actions/execute  { text, channel, patientId, idempotencyKey, confirmed } → ExecuteResult
actionsRouter.post('/execute', async (req: AuthedRequest, res) => {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: { kind: 'bad_request', message: 'Testo del comando mancante.' } });
    const idempotencyKey = String(req.body?.idempotencyKey ?? '').slice(0, 80);
    if (!idempotencyKey) return res.status(400).json({ error: { kind: 'bad_request', message: 'idempotencyKey mancante.' } });
    const result = await executeCommand({
      text,
      channel: parseChannel(req.body?.channel),
      patientId: req.body?.patientId ? String(req.body.patientId) : undefined,
      idempotencyKey,
      confirmed: req.body?.confirmed === true,
      operatorCtx: agnosOperatorFrom(req),
    });
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err);
  }
});

export default actionsRouter;
