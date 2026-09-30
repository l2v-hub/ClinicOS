// Identity → Role → Capability policy API (Phase 2).
//
//   /auth/simulator/identities   GET   public only while the Role Simulator is enabled
//   /auth/simulator/session      POST  { identityId } → server-signed session (no role inside)
//   /authz/policy                GET   authz.view_policy   active document + registry + identities
//   /authz/policy/versions       GET   authz.view_policy   history
//   /authz/policy/versions/:v    GET   authz.view_policy   one version (document + before/after)
//   /authz/policy/impact         POST  authz.manage_policy impact preview of a proposed document
//   /authz/policy/versions       POST  authz.manage_policy Save (draft) or Save+Apply
//   /authz/policy/versions/:v/apply POST authz.manage_policy Apply a draft

import { Router, type Response } from 'express';
import { operatorAuthMode, requireOperator, type AuthedRequest } from '../ai/auth.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import { governedCapabilities, allCapabilities } from '../authz/registry.js';
import { authzOf, requireAuthorizationContext } from '../authz/request-context.js';
import { requireCapability } from '../authz/require-capability.js';
import { roleDefinition } from '../authz/decision.js';
import { policyImpact } from '../authz/impact.js';
import { PolicyValidationError } from '../authz/policy-document.js';
import { loadActivePolicyCached } from '../authz/policy-cache.js';
import {
  applyPolicyVersion,
  getPolicyVersion,
  listPolicyVersions,
  PolicyStoreError,
  savePolicyVersion,
  type PolicyActor,
} from '../authz/policy-store.js';
import {
  ensureSimulatedIdentity,
  issueSimulatorToken,
  SIMULATED_IDENTITIES,
  simulatedIdentity,
  simulatorEnabled,
} from '../authz/simulator.js';
import { prisma } from '../lib/prisma.js';
import { allToolDefinitions } from '../tools/index.js';

export const simulatorRouter = Router();
export const authzRouter = Router();

for (const router of [simulatorRouter, authzRouter]) {
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
}

function simulatorGuard(res: Response): boolean {
  if (simulatorEnabled(operatorAuthMode())) return true;
  res.status(404).json({ error: 'Simulatore ruoli non attivo', code: 'simulator_disabled' });
  return false;
}

simulatorRouter.get('/identities', async (_req, res) => {
  if (!simulatorGuard(res)) return;
  try {
    const policy = await loadActivePolicyCached();
    res.status(200).json({
      policyVersion: policy.version,
      identities: SIMULATED_IDENTITIES.map((identity) => {
        const roleId = policy.document.assignments[identity.id] ?? null;
        const role = roleId ? roleDefinition(policy.document, roleId) : undefined;
        return {
          id: identity.id,
          name: identity.name,
          ruolo: identity.ruolo,
          roleId,
          roleLabel: role?.label ?? null,
          roleDescription: role?.description ?? null,
        };
      }),
    });
  } catch {
    res.status(503).json({ error: 'Simulatore non disponibile', code: 'simulator_unavailable' });
  }
});

simulatorRouter.post('/session', async (req, res) => {
  if (!simulatorGuard(res)) return;
  const identityId = typeof req.body?.identityId === 'string' ? req.body.identityId : '';
  const identity = simulatedIdentity(identityId);
  if (!identity) {
    res.status(400).json({ error: 'Profilo simulato sconosciuto', code: 'unknown_identity' });
    return;
  }
  try {
    await ensureSimulatedIdentity(identity);
    const session = issueSimulatorToken(identity.id);
    res.status(201).json({ ...session, identity: { id: identity.id, name: identity.name } });
  } catch {
    res.status(503).json({ error: 'Simulatore non disponibile', code: 'simulator_unavailable' });
  }
});

authzRouter.use(requireOperator, requireAuthorizationContext);

function actorOf(req: AuthedRequest): PolicyActor {
  const identity = authzOf(req)!.identity;
  return { operatorId: identity.operatorId, name: identity.name, roleId: identity.roleId };
}

function sendError(res: Response, error: unknown, label: string): void {
  if (error instanceof PolicyValidationError) {
    res.status(400).json({ error: error.message, code: error.code, ...error.details });
    return;
  }
  if (error instanceof PolicyStoreError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error(`${label} error:`, error instanceof Error ? error.name : 'unknown');
  res.status(500).json({ error: 'Errore nella gestione dei permessi', code: 'authz_error' });
}

authzRouter.get('/policy', requireCapability('authz.view_policy'), async (_req, res) => {
  try {
    const policy = await loadActivePolicyCached();
    const operators = await prisma.operator.findMany({
      take: 500,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        ruolo: true,
        user: { select: { fullName: true, role: true, isActive: true } },
      },
    });
    res.status(200).json({
      active: {
        version: policy.version,
        source: policy.source,
        appliedAt: policy.appliedAt,
        document: policy.document,
      },
      capabilities: governedCapabilities().map((cap) => ({
        id: cap.id,
        name: cap.name,
        domain: cap.domain,
        type: cap.type,
        sensitivity: cap.sensitivity,
        exposure: cap.exposure,
        legacyRoles: cap.legacyRoles,
        tool: allToolDefinitions.some((tool) => tool.name === cap.id),
      })),
      derived: allCapabilities()
        .filter((cap) => cap.governedBy)
        .map((cap) => ({
          id: cap.id,
          name: cap.name,
          domain: cap.domain,
          governedBy: cap.governedBy,
        })),
      identities: operators.map((operator) => ({
        id: operator.id,
        name: operator.user.fullName,
        ruolo: operator.ruolo,
        legacyRole: operator.user.role.toLowerCase(),
        active: operator.user.isActive,
        simulated: Boolean(simulatedIdentity(operator.id)),
      })),
    });
  } catch (error) {
    sendError(res, error, 'GET /authz/policy');
  }
});

authzRouter.get('/policy/versions', requireCapability('authz.view_policy'), async (_req, res) => {
  try {
    res.status(200).json({ versions: await listPolicyVersions() });
  } catch (error) {
    sendError(res, error, 'GET /authz/policy/versions');
  }
});

authzRouter.get(
  '/policy/versions/:version',
  requireCapability('authz.view_policy'),
  async (req, res) => {
    const version = Number(req.params.version);
    if (!Number.isInteger(version) || version < 0) {
      res.status(400).json({ error: 'Versione non valida', code: 'invalid_version' });
      return;
    }
    try {
      res.status(200).json(await getPolicyVersion(version));
    } catch (error) {
      sendError(res, error, 'GET /authz/policy/versions/:version');
    }
  },
);

authzRouter.post('/policy/impact', requireCapability('authz.manage_policy'), async (req, res) => {
  try {
    const current = await loadActivePolicyCached();
    const operators = await prisma.operator.findMany({
      take: 500,
      select: { id: true, user: { select: { role: true } } },
    });
    const legacyRoles = new Map(operators.map((o) => [o.id, o.user.role.toLowerCase()]));
    res.status(200).json({
      basedOnVersion: current.version,
      ...policyImpact(
        current.document,
        req.body?.document,
        allToolDefinitions.map((tool) => tool.name),
        (operatorId) => legacyRoles.get(operatorId),
      ),
    });
  } catch (error) {
    sendError(res, error, 'POST /authz/policy/impact');
  }
});

function auditPolicyChange(req: AuthedRequest, version: number, action: string): void {
  const identity = authzOf(req)!.identity;
  recordAuditEvent({
    requestId: `authz-${action}-v${version}`,
    operatorId: identity.operatorId,
    operatorRole: identity.roleId,
    patientId: null,
    actionType: action,
    kind: 'update',
    channel: 'gui',
    fields: [`policy:v${version}`],
    outcome: 'ok',
  });
}

authzRouter.post('/policy/versions', requireCapability('authz.manage_policy'), async (req, res) => {
  const body = req.body as
    { document?: unknown; basedOnVersion?: unknown; note?: unknown; apply?: unknown } | undefined;
  if (!body || typeof body !== 'object' || !Number.isInteger(body.basedOnVersion)) {
    res
      .status(400)
      .json({ error: 'Richiesta non valida: basedOnVersion obbligatorio', code: 'invalid_body' });
    return;
  }
  try {
    const saved = await savePolicyVersion({
      document: body.document,
      basedOnVersion: body.basedOnVersion as number,
      note: typeof body.note === 'string' ? body.note : undefined,
      apply: body.apply === true,
      actor: actorOf(req),
    });
    auditPolicyChange(
      req,
      saved.version,
      body.apply === true ? 'authz.policy_save_apply' : 'authz.policy_save_draft',
    );
    res.status(201).json(saved);
  } catch (error) {
    sendError(res, error, 'POST /authz/policy/versions');
  }
});

authzRouter.post(
  '/policy/versions/:version/apply',
  requireCapability('authz.manage_policy'),
  async (req, res) => {
    const version = Number(req.params.version);
    if (!Number.isInteger(version) || version < 1) {
      res.status(400).json({ error: 'Versione non valida', code: 'invalid_version' });
      return;
    }
    try {
      const applied = await applyPolicyVersion(version, actorOf(req));
      auditPolicyChange(req, version, 'authz.policy_apply');
      res.status(200).json(applied);
    } catch (error) {
      sendError(res, error, 'POST /authz/policy/versions/:version/apply');
    }
  },
);
