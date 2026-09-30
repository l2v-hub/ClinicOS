// HTTP surface of the Skill layer — what the future AI Assistant UI and the natural-language
// harness use.
//
//   GET  /skills                     → skills of the CURRENT identity (available / unavailable + why)
//   POST /skills/converse            → { message?, workflowId?, action?, context? } → one workflow turn
//   GET  /skills/workflows/:id       → structured state of the caller's own workflow
//
// Identity comes only from `requireOperator` (Role Simulator / Entra), the role from the active
// policy (`requireAuthorizationContext`). Every tool a skill runs is re-authorized by the Tool Layer.

import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { importRateLimit } from '../ai/rate-limit.js';
import { requireAuthorizationContext } from '../authz/request-context.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { skillAvailability } from './availability.js';
import { CONFIRMATION_POLICY_VERSION, confirmationFor } from './confirmation.js';
import { converse, type SkillEngineDeps } from './engine.js';
import type { ConverseRequest } from './types.js';

const MAX_MESSAGE = 4000;

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

function parseConverse(body: unknown): ConverseRequest | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Corpo richiesta non valido';
  const o = body as Record<string, unknown>;
  const allowed = new Set(['message', 'workflowId', 'action', 'context']);
  const unknown = Object.keys(o).find((key) => !allowed.has(key));
  if (unknown) return `Campo non consentito: ${unknown}`;
  if (o.message !== undefined && (typeof o.message !== 'string' || o.message.length > MAX_MESSAGE))
    return 'message non valido';
  if (
    o.workflowId !== undefined &&
    (typeof o.workflowId !== 'string' || !/^[0-9a-f-]{36}$/.test(o.workflowId))
  )
    return 'workflowId non valido';
  if (o.action !== undefined && !['confirm', 'cancel', 'retry'].includes(String(o.action)))
    return 'action non valida';
  let context: ConverseRequest['context'];
  if (o.context !== undefined) {
    if (!o.context || typeof o.context !== 'object' || Array.isArray(o.context))
      return 'context non valido';
    const c = o.context as Record<string, unknown>;
    if (
      c.currentPatientId !== undefined &&
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
      ...(typeof c.currentPatientLabel === 'string'
        ? { currentPatientLabel: c.currentPatientLabel }
        : {}),
    };
  }
  if (o.message === undefined && o.action === undefined) return 'message o action obbligatori';
  return {
    ...(typeof o.message === 'string' ? { message: o.message } : {}),
    ...(typeof o.workflowId === 'string' ? { workflowId: o.workflowId } : {}),
    ...(o.action ? { action: o.action as ConverseRequest['action'] } : {}),
    ...(context ? { context } : {}),
  };
}

export function createSkillRouter(deps: SkillEngineDeps): Router {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requireOperator);
  router.use(requireAuthorizationContext);
  router.use(importRateLimit);

  router.get('/', async (req: AuthedRequest, res: Response) => {
    const identity = identityOf(req);
    if (!identity) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return;
    }
    const list = await skillAvailability(deps.registry as ToolRegistry, identity);
    res.status(200).json({
      confirmationPolicyVersion: CONFIRMATION_POLICY_VERSION,
      role: identity.appRole ?? identity.role,
      skills: list.map((a) => ({
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
      })),
    });
  });

  router.post('/converse', async (req: AuthedRequest, res: Response) => {
    const identity = identityOf(req);
    if (!identity) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return;
    }
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

  return router;
}
