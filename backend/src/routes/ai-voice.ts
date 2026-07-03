// REQ-041 (+SPEC-015): voice write-action endpoints. Operator-authenticated (same header posture as
// the public assistant). Audio is transcribed CLIENT-SIDE and never reaches this backend — these
// routes only see text. Flow: /plan (transcript → ActionPlan + preview) → operator confirms → /execute.
//
// Since SPEC-015 both endpoints DELEGATE to the unified Agnos orchestrator with channel 'voce';
// the response contract is unchanged for existing clients (VoiceAssistant.tsx): /plan returns
// { plan, read } for questions and { plan, preview } for writes; /execute returns ExecuteResult.
// Hardening is unchanged: /execute re-derives the authoritative plan from the transcript server-side.

import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit } from '../ai/rate-limit.js';
import { VoiceError } from '../ai/voice/execute.js';
import { loadVoiceConfig, sttStatus, REQUIRED_STT_CAPABILITIES } from '../ai/voice/config.js';
import { planCommand, executeCommand } from '../ai/actions/orchestrate.js';
import { agnosOperatorFrom } from './ai-actions.js';

const voiceRouter = Router();
voiceRouter.use(requireOperator);
voiceRouter.use(importRateLimit);

function mapError(res: Response, err: unknown) {
  if (err instanceof VoiceError) {
    const status: Record<string, number> = {
      feature_disabled: 403, writes_disabled: 403, not_in_catalog: 403, delete_forbidden: 403,
      not_executable: 400, ambiguous: 422, confirmation_required: 428,
    };
    return res.status(status[err.kind] ?? 400).json({ error: err.message, kind: err.kind });
  }
  console.error('[ai-voice] error:', err instanceof Error ? err.message : err);
  return res.status(500).json({ error: 'Errore comando vocale' });
}

// GET /ai/voice/stt — STT capability/degradation status (model-agnostic; never blocks text/Web-Speech).
voiceRouter.get('/stt', (_req, res) => {
  res.status(200).json({ ...sttStatus(loadVoiceConfig()), requiredCapabilities: REQUIRED_STT_CAPABILITIES });
});

// POST /ai/voice/plan  { transcript, currentPatientId? } → { plan, preview } | { plan, read }
voiceRouter.post('/plan', async (req: AuthedRequest, res) => {
  try {
    const cfg = loadVoiceConfig();
    if (!cfg.voiceEnabled) return res.status(403).json({ error: 'Funzione vocale disabilitata.', kind: 'feature_disabled' });

    const transcript = String(req.body?.transcript ?? '').slice(0, 500);
    const currentPatientId = req.body?.currentPatientId ? String(req.body.currentPatientId) : undefined;
    const { plan, preview, read } = await planCommand({
      text: transcript, channel: 'voce', currentPatientId, operatorCtx: agnosOperatorFrom(req),
    });
    // Pre-SPEC-015 response shape preserved: reads carry { plan, read }, everything else { plan, preview }.
    if (plan.actionType === 'read') return res.status(200).json({ plan, read });
    return res.status(200).json({ plan, preview });
  } catch (err) {
    return mapError(res, err);
  }
});

// POST /ai/voice/execute  { transcript, patientId, idempotencyKey, confirmed } → ExecuteResult
voiceRouter.post('/execute', async (req: AuthedRequest, res) => {
  try {
    const transcript = String(req.body?.transcript ?? '').slice(0, 500);
    const idempotencyKey = String(req.body?.idempotencyKey ?? '').slice(0, 80);
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey mancante', kind: 'not_executable' });

    const result = await executeCommand({
      text: transcript,
      channel: 'voce',
      patientId: req.body?.patientId ? String(req.body.patientId) : undefined,
      idempotencyKey,
      confirmed: req.body?.confirmed === true,
      operatorCtx: agnosOperatorFrom(req),
    });
    return res.status(200).json(result);
  } catch (err) {
    return mapError(res, err);
  }
});

export default voiceRouter;
