// HTTP surface of the Skill layer — what the AI Assistant UI (Phase 4) and the natural-language
// harness use.
//
//   GET  /skills                      → skills of the CURRENT identity (available / unavailable + why)
//   GET  /skills/session?residentId=  → Assistant state bootstrap: identity, role, scope, skills,
//                                       starters, verified resident
//   POST /skills/context              → { residentId } → verified resident (Resident Access Scope)
//   GET  /skills/residents?q=         → resident search for the context picker (Tool Layer, scoped)
//   POST /skills/converse             → one workflow turn
//   GET  /skills/workflows/:id        → structured state of the caller's own workflow
//   GET  /skills/voice/status         → voice channel availability + VAD parameters (Phase 5)
//   POST /skills/voice/transcribe     → ONE utterance (audio body) → transcript, never an action
//
// Identity comes only from `requireOperator` (Role Simulator / Entra), the role from the active
// policy (`requireAuthorizationContext`). Every tool a skill runs is re-authorized by the Tool Layer.

import { randomUUID } from 'node:crypto';
import express, { Router, type Response } from 'express';
import { guardAsyncRoutes } from '../lib/async-guard.js';
import { describeResident, residentScopeFor } from '../access-scope/resident-access-scope.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { recordAuditEvent, type AiAuditOutcome } from '../ai/audit-store.js';
import { importRateLimit, voiceTranscribeRateLimit } from '../ai/rate-limit.js';
import { roleDefinition } from '../authz/decision.js';
import { loadActivePolicyCached } from '../authz/policy-cache.js';
import { authzOf, requireAuthorizationContext } from '../authz/request-context.js';
import type { ToolContext } from '../tools/types.js';
import { skillAvailability } from './availability.js';
import { startersFor } from './catalog.js';
import { CONFIRMATION_POLICY_VERSION, confirmationFor } from './confirmation.js';
import { converse, type SkillEngineDeps } from './engine.js';
import type { ConverseRequest } from './types.js';
import {
  MAX_UTTERANCE_BYTES,
  MIN_UTTERANCE_BYTES,
  STT_MIME_TYPES,
  SttUnavailableError,
  createRuntimeSttProvider,
  looksLikeWav,
  runtimeSttAvailable,
  voiceChannelEnabled,
} from '../voice/stt.js';
import { voiceVadConfig } from '../voice/vad-config.js';
import { registerProactiveRoutes } from '../proactive/http.js';
import type { ProactiveDeps } from '../proactive/engine.js';

const MAX_MESSAGE = 4000;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f-]{36}$/;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseConverse(body: unknown): ConverseRequest | string {
  if (!isRecord(body)) return 'Corpo richiesta non valido';
  const allowed = new Set([
    'message',
    'workflowId',
    'action',
    'context',
    'previewId',
    'edit',
    'payload',
    'inputChannel',
  ]);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) return `Campo non consentito: ${unknown}`;
  const o = body;
  if (o.message !== undefined && (typeof o.message !== 'string' || o.message.length > MAX_MESSAGE))
    return 'message non valido';
  if (o.workflowId !== undefined && (typeof o.workflowId !== 'string' || !UUID.test(o.workflowId)))
    return 'workflowId non valido';
  if (
    o.action !== undefined &&
    !['confirm', 'cancel', 'retry', 'modify', 'edit'].includes(String(o.action))
  )
    return 'action non valida';
  if (o.previewId !== undefined && (typeof o.previewId !== 'string' || !UUID.test(o.previewId)))
    return 'previewId non valido';
  let context: ConverseRequest['context'];
  if (o.context !== undefined) {
    if (!isRecord(o.context)) return 'context non valido';
    const c = o.context;
    if (
      c.currentPatientId !== undefined &&
      c.currentPatientId !== null &&
      (typeof c.currentPatientId !== 'string' || c.currentPatientId.length > 128)
    )
      return 'context.currentPatientId non valido';
    if (
      c.currentPatientLabel !== undefined &&
      (typeof c.currentPatientLabel !== 'string' || c.currentPatientLabel.length > 120)
    )
      return 'context.currentPatientLabel non valido';
    context = {
      ...(typeof c.currentPatientId === 'string' ? { currentPatientId: c.currentPatientId } : {}),
      ...(c.currentPatientId === null ? { currentPatientId: null } : {}),
      ...(typeof c.currentPatientLabel === 'string'
        ? { currentPatientLabel: c.currentPatientLabel }
        : {}),
    };
  }
  let edit: ConverseRequest['edit'];
  if (o.edit !== undefined) {
    if (!isRecord(o.edit)) return 'edit non valido';
    const e = o.edit;
    if (Object.keys(e).some((k) => !['values', 'text', 'priority'].includes(k)))
      return 'edit non valido';
    if (e.text !== undefined && (typeof e.text !== 'string' || e.text.length > MAX_MESSAGE))
      return 'edit.text non valido';
    if (e.priority !== undefined && !['normale', 'alta', 'urgente'].includes(String(e.priority)))
      return 'edit.priority non valida';
    if (e.values !== undefined) {
      if (!isRecord(e.values)) return 'edit.values non valido';
      if (Object.values(e.values).some((v) => typeof v !== 'string' || (v as string).length > 64))
        return 'edit.values non valido';
    }
    edit = e as ConverseRequest['edit'];
  }
  let payload: ConverseRequest['payload'];
  if (o.payload !== undefined) {
    if (!isRecord(o.payload) || Object.keys(o.payload).some((k) => k !== 'therapy'))
      return 'payload non valido';
    if (o.payload.therapy !== undefined && !isRecord(o.payload.therapy))
      return 'payload.therapy non valido';
    if (JSON.stringify(o.payload).length > 20_000) return 'payload troppo grande';
    payload = o.payload as ConverseRequest['payload'];
  }
  if (o.inputChannel !== undefined && o.inputChannel !== 'text' && o.inputChannel !== 'voice')
    return 'inputChannel non valido';
  if (o.message === undefined && o.action === undefined) return 'message o action obbligatori';
  return {
    ...(typeof o.message === 'string' ? { message: o.message } : {}),
    ...(typeof o.workflowId === 'string' ? { workflowId: o.workflowId } : {}),
    ...(o.action ? { action: o.action as ConverseRequest['action'] } : {}),
    ...(typeof o.previewId === 'string' ? { previewId: o.previewId } : {}),
    ...(context ? { context } : {}),
    ...(edit ? { edit } : {}),
    ...(payload ? { payload } : {}),
    ...(o.inputChannel === 'voice' ? { inputChannel: 'voice' as const } : {}),
  };
}

export function createSkillRouter(deps: SkillEngineDeps, proactive?: ProactiveDeps): Router {
  // Phase 6: an unexpected async failure (DB/scope check) answers 503, never hangs or crashes.
  const router = guardAsyncRoutes(Router(), 'skills');
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requireOperator);
  router.use(requireAuthorizationContext);
  router.use(importRateLimit);

  function requireIdentity(req: AuthedRequest, res: Response) {
    const identity = identityOf(req);
    if (!identity)
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
    return identity;
  }

  async function skillsView(identity: ToolContext['identity']) {
    const list = await skillAvailability(deps.registry, identity);
    return list.map((a) => ({
      id: a.skill.id,
      name: a.skill.name,
      description: a.skill.description,
      category: a.skill.category,
      kind: a.skill.kind,
      confirmationClass: a.skill.confirmation,
      confirmation: confirmationFor(a.skill, a.confirmationTools).mode,
      executable: a.skill.executable,
      available: a.available && a.skill.executable,
      partial: a.partial,
      missingRequired: a.missingRequired,
      missingOptional: a.missingOptional,
      slots: a.skill.slots,
      classicScreen: a.skill.classicScreen ?? null,
    }));
  }

  router.get('/', async (req: AuthedRequest, res: Response) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    res.status(200).json({
      confirmationPolicyVersion: CONFIRMATION_POLICY_VERSION,
      role: identity.appRole ?? identity.role,
      skills: await skillsView(identity),
    });
  });

  // Assistant state bootstrap (Prompt 4 §6): everything the UI shows comes from the server.
  router.get('/session', async (req: AuthedRequest, res: Response) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    const residentId = typeof req.query.residentId === 'string' ? req.query.residentId : '';
    const operator = { id: identity.operatorId, role: identity.role };
    const resident =
      residentId && ID.test(residentId) ? await describeResident(operator, residentId) : null;
    const skills = await skillsView(identity);
    const roleId = identity.appRole ?? identity.role;
    let roleLabel = roleId;
    try {
      const policy = await loadActivePolicyCached();
      roleLabel = roleDefinition(policy.document, roleId)?.label ?? roleId;
    } catch {
      /* label is cosmetic */
    }
    const availableIds = new Set(skills.filter((s) => s.available).map((s) => s.id));
    res.status(200).json({
      identity: { id: identity.operatorId, name: identity.name ?? identity.operatorId },
      role: { id: roleId, label: roleLabel },
      residentScope: residentScopeFor(operator).mode,
      confirmationPolicyVersion: CONFIRMATION_POLICY_VERSION,
      resident,
      residentDenied: Boolean(residentId) && !resident,
      skills,
      starters: startersFor(availableIds, Boolean(resident)),
    });
  });

  // Resident selection check (Prompt 4 §10): allowed → server label; otherwise 403.
  router.post('/context', async (req: AuthedRequest, res: Response) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    const residentId = isRecord(req.body) ? req.body.residentId : undefined;
    if (typeof residentId !== 'string' || !ID.test(residentId)) {
      res.status(400).json({ error: 'residentId non valido', code: 'invalid_body' });
      return;
    }
    const resident = await describeResident(
      { id: identity.operatorId, role: identity.role },
      residentId,
    );
    if (!resident) {
      res.status(403).json({
        error: 'Questo ospite non rientra tra quelli a cui hai accesso',
        code: 'resident_out_of_scope',
      });
      return;
    }
    res.status(200).json({ resident });
  });

  // Resident picker: the Tool Layer search (policy + scope), names only.
  router.get('/residents', async (req: AuthedRequest, res: Response) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    if (!q) {
      res.status(200).json({ residents: [] });
      return;
    }
    const result = await deps.registry.invoke(
      'patients.search',
      { body: { q } },
      { identity, origin: 'ai_assistant', requestId: 'skill-resident-picker' },
    );
    if (!result.ok) {
      res
        .status(result.error.status)
        .json({ error: result.error.message, code: result.error.code });
      return;
    }
    const items = ((result.data as { items?: unknown[] }).items ?? []) as {
      id: string;
      firstName?: string;
      lastName?: string;
    }[];
    res.status(200).json({
      residents: items.slice(0, 10).map((p) => ({
        id: p.id,
        label: `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim(),
      })),
    });
  });

  // ── Phase 5: voice channel ────────────────────────────────────────────────────────────────
  // Voice is a CHANNEL: this route only turns ONE captured utterance into text. The transcript is
  // shown to the user and then goes through /skills/converse exactly like typed text. Gated by the
  // existing voice capability (`voice.plan`) of the Phase 2 policy. Audio is never stored or logged.
  function voiceAllowed(req: AuthedRequest): boolean {
    return authzOf(req)?.can('voice.plan').allowed === true;
  }

  router.get('/voice/status', async (req: AuthedRequest, res: Response) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    const channelEnabled = voiceChannelEnabled();
    res.status(200).json({
      voiceAllowed: voiceAllowed(req),
      channelEnabled,
      sttConfigured: channelEnabled && (Boolean(deps.stt) || (await runtimeSttAvailable())),
      locale: 'it-IT',
      maxUtteranceBytes: MAX_UTTERANCE_BYTES,
      vad: voiceVadConfig(),
    });
  });

  /** Capability + per-environment switch BEFORE the body is buffered (no 2 MB for nothing). */
  function voiceGate(req: AuthedRequest, res: Response, next: () => void) {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    const refuse = (status: number, code: string, error: string, outcome: AiAuditOutcome) => {
      recordAuditEvent({
        requestId: `voice-${randomUUID()}`,
        operatorId: identity.operatorId,
        operatorRole: identity.appRole ?? identity.role,
        patientId: null,
        actionType: 'voice:transcribe',
        kind: 'read',
        channel: 'voce',
        fields: [`code:${code === 'voice_denied' ? 'capability_denied' : code}`],
        outcome,
      });
      res.status(status).json({ error, code });
    };
    if (!voiceAllowed(req)) {
      refuse(403, 'voice_denied', 'Canale vocale non consentito al tuo ruolo', 'denied');
      return;
    }
    if (!voiceChannelEnabled()) {
      refuse(503, 'voice_disabled', 'Canale vocale non attivo in questo ambiente', 'error');
      return;
    }
    next();
  }

  router.post(
    '/voice/transcribe',
    voiceTranscribeRateLimit,
    voiceGate,
    express.raw({ type: [...STT_MIME_TYPES], limit: MAX_UTTERANCE_BYTES }),
    async (req: AuthedRequest, res: Response) => {
      const identity = requireIdentity(req, res);
      if (!identity) return;
      const requestId = `voice-${randomUUID()}`;
      const auditVoice = (outcome: AiAuditOutcome, fields: string[]) =>
        recordAuditEvent({
          requestId,
          operatorId: identity.operatorId,
          operatorRole: identity.appRole ?? identity.role,
          patientId: null,
          actionType: 'voice:transcribe',
          kind: 'read',
          channel: 'voce',
          fields,
          outcome,
        });
      const mimeType = String(req.headers['content-type'] ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (
        !STT_MIME_TYPES.has(mimeType) ||
        bytes.length < MIN_UTTERANCE_BYTES ||
        (mimeType.includes('wav') && !looksLikeWav(bytes))
      ) {
        auditVoice('error', ['code:invalid_audio']);
        res.status(400).json({ error: 'Audio non valido', code: 'invalid_audio' });
        return;
      }
      const declared = Number(req.headers['x-utterance-ms']);
      const durationMs = Number.isFinite(declared) && declared > 0 ? declared : undefined;
      const bucket = !durationMs
        ? 'unknown'
        : durationMs < 1000
          ? 'lt1s'
          : durationMs < 5000
            ? '1-5s'
            : durationMs < 15000
              ? '5-15s'
              : 'gt15s';
      try {
        const provider = deps.stt ?? createRuntimeSttProvider();
        const source = String(req.headers['x-audio-source'] ?? 'browser-mic').slice(0, 32);
        const result = await provider.transcribe({ bytes, mimeType, durationMs, source }, 'it-IT', {
          requestId,
        });
        auditVoice(result.empty ? 'empty' : 'ok', [
          `provider:${result.metadata.provider}`,
          `audio:${bucket}`,
          `sttMs:${result.metadata.roundTripMs}`,
        ]);
        res.status(200).json(result);
      } catch (error) {
        const e =
          error instanceof SttUnavailableError
            ? error
            : new SttUnavailableError(
                'stt_provider_error',
                'Errore del servizio di trascrizione',
                502,
              );
        auditVoice('error', [`code:${e.code}`, `audio:${bucket}`]);
        res.status(e.status).json({ error: e.message, code: e.code });
      }
    },
  );

  router.post('/converse', async (req: AuthedRequest, res: Response) => {
    const identity = requireIdentity(req, res);
    if (!identity) return;
    const parsed = parseConverse(req.body);
    if (typeof parsed === 'string') {
      res.status(400).json({ error: parsed, code: 'invalid_body' });
      return;
    }
    try {
      res.status(200).json(await converse(deps, identity, parsed));
    } catch (error) {
      console.error('skills converse error:', error instanceof Error ? error.name : 'unknown');
      res.status(500).json({ error: 'Errore del motore skill', code: 'skill_engine_error' });
    }
  });

  router.get('/workflows/:id', (req: AuthedRequest, res: Response) => {
    const identity = identityOf(req);
    const state = deps.store.get(String(req.params.id));
    if (!identity || !state || state.operatorId !== identity.operatorId) {
      res.status(404).json({ error: 'Flusso non trovato', code: 'workflow_not_found' });
      return;
    }
    res.status(200).json({ workflow: state });
  });

  // Phase 7: Attention Inbox, ack/seen, shift briefing (read-only; actions reuse existing skills).
  registerProactiveRoutes(router, proactive ?? { listWorkflows: (id) => deps.store.listByOperator?.(id) ?? [] });

  return router;
}
