// REQ-041: voice write-action endpoints. Operator-authenticated (same header posture as the public
// assistant). Audio is transcribed CLIENT-SIDE and never reaches this backend — these routes only see
// text. Flow: /plan (transcript → ActionPlan + preview) → operator confirms → /execute.
//
// Hardening: /execute RE-DERIVES the authoritative plan from the transcript server-side (reusing the
// client's idempotency key), so a tampered plan body cannot smuggle a different or ambiguity-free action.

import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit } from '../ai/rate-limit.js';
import { prisma } from '../lib/prisma.js';
import { planAction } from '../ai/voice/plan.js';
import { buildPreview, type PreviewContext } from '../ai/voice/preview.js';
import { executeAction, VoiceError } from '../ai/voice/execute.js';
import { prismaVoiceWriter } from '../ai/voice/write-services.js';
import { voiceIdempotency } from '../ai/voice/idempotency.js';
import { loadVoiceConfig, sttStatus, REQUIRED_STT_CAPABILITIES } from '../ai/voice/config.js';
import { getNarrativeSection, pickDisplayText } from '../ai/sections/patient-narrative.js';
import { assistantQuery } from '../ai/assistant/service.js';
import { ctxFromOperator } from './ai-assistant-public.js';

const voiceRouter = Router();
voiceRouter.use(requireOperator);
voiceRouter.use(importRateLimit);

function operatorName(req: AuthedRequest): string {
  const fromHeader = (req.header('X-Operator-Name') || '').trim();
  return fromHeader || req.operator!.id;
}

function mapError(res: Response, err: unknown) {
  if (err instanceof VoiceError) {
    const status: Record<string, number> = {
      feature_disabled: 403, writes_disabled: 403, not_executable: 400,
      ambiguous: 422, confirmation_required: 428,
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

// POST /ai/voice/plan  { transcript, currentPatientId? } → { plan, preview, read? }
voiceRouter.post('/plan', async (req, res) => {
  try {
    const cfg = loadVoiceConfig();
    if (!cfg.voiceEnabled) return res.status(403).json({ error: 'Funzione vocale disabilitata.', kind: 'feature_disabled' });

    const transcript = String(req.body?.transcript ?? '').slice(0, 500);
    const currentPatientId = req.body?.currentPatientId ? String(req.body.currentPatientId) : undefined;
    const plan = planAction(transcript, { currentPatientId });

    if (plan.actionType === 'read') {
      const answer = await assistantQuery(plan.readQuery ?? transcript, ctxFromOperator(req as AuthedRequest), { currentPatientId });
      return res.status(200).json({ plan, read: answer });
    }

    // gather current values for a grounded preview
    const pctx: PreviewContext = {};
    if (plan.patientId) {
      const p = await prisma.patient.findUnique({ where: { id: plan.patientId } });
      if (p) pctx.patientName = `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim();
      if (plan.actionType === 'update_narrative_section' && plan.sectionKey) {
        const sec = await getNarrativeSection(plan.patientId, plan.sectionKey);
        if (sec) pctx.currentNarrativeText = pickDisplayText(sec.originalText, sec.reviewedText);
      }
      if (plan.actionType === 'update_patient_demographics' && p) {
        pctx.currentDemographicValue = String((p as Record<string, unknown>)[String(plan.fields.field)] ?? '') || '—';
      }
    }
    return res.status(200).json({ plan, preview: buildPreview(plan, pctx) });
  } catch (err) {
    return mapError(res, err);
  }
});

// POST /ai/voice/execute  { transcript, patientId, idempotencyKey, confirmed } → ExecuteResult
voiceRouter.post('/execute', async (req: AuthedRequest, res) => {
  try {
    const cfg = loadVoiceConfig();
    const transcript = String(req.body?.transcript ?? '').slice(0, 500);
    const patientId = req.body?.patientId ? String(req.body.patientId) : undefined;
    const idempotencyKey = String(req.body?.idempotencyKey ?? '').slice(0, 80);
    const confirmed = req.body?.confirmed === true;
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey mancante', kind: 'not_executable' });

    // Re-derive the authoritative plan from the transcript; reuse the client's idempotency key.
    const plan = planAction(transcript, { currentPatientId: patientId }, () => idempotencyKey);

    const result = await executeAction(plan, {
      confirmed,
      ctx: { requestId: `voice-${req.operator!.id}`, userId: req.operator!.id, operatorName: operatorName(req as AuthedRequest) },
      cfg,
      writer: prismaVoiceWriter,
      store: voiceIdempotency,
    });
    return res.status(200).json(result);
  } catch (err) {
    return mapError(res, err);
  }
});

export default voiceRouter;
