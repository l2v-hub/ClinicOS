// Phase 8 — copilot endpoints inside the skills router (requireOperator, per-request policy
// context, no-store, async guard already applied by the router).
//
//   GET /skills/copilot/home?residentId=   Role Home (profile-driven presentation of authorized items)
//   GET /skills/copilot/round               residents for the «resident round» composite workflow
//                                           (Tool Layer patients.list_page: policy + scope)

import type { Response, Router } from 'express';
import type { AuthedRequest } from '../ai/auth.js';
import { authzOf } from '../authz/request-context.js';
import { roleDefinition } from '../authz/decision.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolContext } from '../tools/types.js';
import { skillAvailability } from '../skills/availability.js';
import type { WorkflowState } from '../skills/types.js';
import type { ProactiveDeps } from '../proactive/engine.js';
import { buildRoleHome } from './home.js';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function registerCopilotRoutes(
  router: Router,
  deps: {
    registry: ToolRegistry;
    identityOf: (req: AuthedRequest) => ToolContext['identity'] | null;
    listWorkflows?: (operatorId: string) => WorkflowState[];
    proactive: ProactiveDeps;
  },
): void {
  function who(req: AuthedRequest, res: Response) {
    const authz = authzOf(req);
    const identity = deps.identityOf(req);
    if (!req.operator || !authz || !identity) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return null;
    }
    const roleId = authz.identity.roleId;
    return {
      identity,
      home: {
        operator: { id: req.operator.id, role: req.operator.role },
        roleId,
        roleLabel: roleDefinition(authz.policy.document, roleId)?.label ?? roleId,
        authz,
      },
    };
  }

  router.get('/copilot/home', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    const residentId =
      typeof req.query.residentId === 'string' && ID.test(req.query.residentId)
        ? req.query.residentId
        : null;
    res.status(200).json(
      await buildRoleHome(
        w.home,
        {
          availability: () => skillAvailability(deps.registry, w.identity, 'copilot-home'),
          listWorkflows: deps.listWorkflows,
          proactive: deps.proactive,
        },
        residentId,
      ),
    );
  });

  // Resident round: the SAME tool the patient list uses (policy + Resident Access Scope).
  router.get('/copilot/round', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    const result = await deps.registry.invoke(
      'patients.list_page',
      { query: { limit: '50' } },
      { identity: w.identity, origin: 'ai_assistant', requestId: 'copilot-round' },
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
      location?: { room?: string | null; bed?: string | null };
    }[];
    res.status(200).json({
      residents: items.map((p) => ({
        id: p.id,
        label: `${p.lastName ?? ''} ${p.firstName ?? ''}`.trim(),
        room: p.location?.room ?? null,
        bed: p.location?.bed ?? null,
      })),
      hasMore: Boolean((result.data as { hasMore?: boolean }).hasMore),
    });
  });
}
