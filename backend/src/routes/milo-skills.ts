// Milo, «skill creator»: governo delle competenze degli specialisti (solo amministratore).
//
//   /authz/milo/skills                      GET   competenze rilasciate + versione in uso + proposte
//   /authz/milo/feedback                    GET   giudizi delle persone sulle risposte
//   /authz/milo/feedback/:id/dismiss        POST  archivia un giudizio senza usarlo
//   /authz/milo/skills/:skillId/proposals   POST  nuova proposta: dal modello ({feedbackIds?}) o a
//                                                 mano ({instructions, rationale?})
//   /authz/milo/versions/:id/approve|reject POST  decisione dell'amministratore
//   /authz/milo/skills/:skillId/restore     POST  torna alle istruzioni rilasciate
//
// Stessa regola dei permessi: serve `authz.manage_policy`. Una proposta è solo testo e non ha
// effetto finché non è approvata; strumenti, permessi e regole fisse non sono modificabili da qui.

import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import { authzOf, requireAuthorizationContext } from '../authz/request-context.js';
import { requireCapability } from '../authz/require-capability.js';
import { loadAssistantLlmConfig } from '../ai/assistant/config.js';
import {
  callSkillProposalRuntime,
  callSkillsRuntime,
  type ReleasedSkill,
} from '../ai/assistant/runtime-client.js';
import {
  approvedOverrides,
  decideProposal,
  dismissFeedback,
  feedbackForProposal,
  isMiloSkillId,
  listFeedback,
  listSkillVersions,
  MILO_SKILL_IDS,
  MiloSkillError,
  restoreReleased,
  saveProposal,
  type MiloActor,
} from '../milo-skills/store.js';

export const miloSkillsRouter = Router();
miloSkillsRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
miloSkillsRouter.use(requireOperator, requireAuthorizationContext);
const manage = requireCapability('authz.manage_policy');

/** Dipendenze verso il servizio AI, sostituibili nei test. */
export interface MiloSkillsRuntime {
  released: () => Promise<ReleasedSkill[]>;
  propose: typeof callSkillProposalRuntime extends (req: infer R, ...rest: never[]) => infer O
    ? (req: R) => O
    : never;
}
let runtime: MiloSkillsRuntime = {
  released: () => callSkillsRuntime(loadAssistantLlmConfig()),
  propose: (req) => callSkillProposalRuntime(req, loadAssistantLlmConfig()),
};
export function setMiloSkillsRuntime(next: MiloSkillsRuntime | null): void {
  runtime = next ?? {
    released: () => callSkillsRuntime(loadAssistantLlmConfig()),
    propose: (req) => callSkillProposalRuntime(req, loadAssistantLlmConfig()),
  };
}

export function miloActorOf(req: AuthedRequest): MiloActor {
  const identity = authzOf(req)?.identity;
  return {
    operatorId: identity?.operatorId ?? req.operator!.id,
    name: identity?.name ?? req.operator!.name,
    roleId: identity?.roleId ?? req.operator!.role,
  };
}

function fail(res: Response, error: unknown, label: string): void {
  if (error instanceof MiloSkillError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error(`[milo-skills] ${label}:`, error instanceof Error ? error.name : 'unknown');
  res.status(500).json({ error: 'Errore nella gestione delle competenze', code: 'milo_skills' });
}

function audit(req: AuthedRequest, action: string, fields: string[]): void {
  const actor = miloActorOf(req);
  recordAuditEvent({
    requestId: `milo-skills-${action}-${Date.now()}`,
    operatorId: actor.operatorId,
    operatorRole: actor.roleId,
    patientId: null,
    actionType: `milo_skills:${action}`,
    kind: 'update',
    channel: 'gui',
    fields,
    outcome: 'ok',
  });
}

miloSkillsRouter.get('/skills', manage, async (_req, res) => {
  try {
    const [versions, released] = await Promise.all([
      listSkillVersions(),
      runtime.released().catch(() => null),
    ]);
    res.status(200).json({
      // Senza il servizio AI le competenze rilasciate non si possono leggere: lo si dice.
      runtimeAvailable: released !== null,
      skills: MILO_SKILL_IDS.map((id) => {
        const file = released?.find((s) => s.id === id) ?? null;
        const own = versions.filter((v) => v.skillId === id);
        return {
          id,
          name: file?.name ?? id,
          role: file?.role ?? null,
          releasedVersion: file?.version ?? null,
          tools: file?.tools ?? [],
          instructions: file?.instructions ?? [],
          locked: file?.locked ?? [],
          approved: own.find((v) => v.status === 'approved') ?? null,
          proposals: own.filter((v) => v.status === 'proposed'),
          history: own
            .filter((v) => v.status !== 'proposed' && v.status !== 'approved')
            .slice(0, 10),
        };
      }),
    });
  } catch (error) {
    fail(res, error, 'list skills');
  }
});

miloSkillsRouter.get('/feedback', manage, async (req, res) => {
  try {
    res.status(200).json(
      await listFeedback({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        rating: typeof req.query.rating === 'string' ? req.query.rating : undefined,
      }),
    );
  } catch (error) {
    fail(res, error, 'list feedback');
  }
});

miloSkillsRouter.post('/feedback/:id/dismiss', manage, async (req: AuthedRequest, res) => {
  try {
    const out = await dismissFeedback(String(req.params.id));
    audit(req, 'feedback_dismiss', ['feedback']);
    res.status(200).json(out);
  } catch (error) {
    fail(res, error, 'dismiss feedback');
  }
});

miloSkillsRouter.post('/skills/:skillId/proposals', manage, async (req: AuthedRequest, res) => {
  const skillId = req.params.skillId;
  if (!isMiloSkillId(skillId)) {
    res.status(404).json({ error: 'Competenza sconosciuta', code: 'unknown_skill' });
    return;
  }
  const body = (req.body ?? {}) as {
    instructions?: unknown;
    rationale?: unknown;
    feedbackIds?: unknown;
    baseVersion?: unknown;
  };
  try {
    // Proposta scritta a mano dall'amministratore.
    if (body.instructions !== undefined) {
      const released = (await runtime.released().catch(() => null))?.find((s) => s.id === skillId);
      const proposal = await saveProposal(
        {
          skillId,
          baseVersion: released?.version ?? String(body.baseVersion ?? ''),
          instructions: body.instructions,
          rationale: body.rationale,
          source: 'manual',
        },
        miloActorOf(req),
      );
      audit(req, 'proposal_manual', [`skill:${skillId}`, `version:${proposal.version}`]);
      res.status(201).json({ proposal });
      return;
    }
    // Proposta del modello a partire dai giudizi.
    const feedback = await feedbackForProposal(skillId, body.feedbackIds);
    if (!feedback.length) {
      res.status(422).json({
        error: 'Nessun giudizio aperto da cui partire per questa competenza',
        code: 'no_feedback',
      });
      return;
    }
    const overrides = await approvedOverrides();
    let generated;
    try {
      generated = await runtime.propose({
        skillId,
        feedback: feedback.map((f) => ({
          question: f.question,
          rating: f.rating,
          correction: f.correction,
        })),
        ...(Object.keys(overrides).length ? { skillOverrides: overrides } : {}),
      });
    } catch {
      res.status(503).json({
        error: 'Il servizio AI non ha prodotto una proposta. Riprova o scrivila a mano.',
        code: 'runtime_unavailable',
      });
      return;
    }
    if (!Array.isArray(generated.instructions) || generated.instructions.length === 0) {
      res.status(422).json({
        error: 'Dai giudizi scelti non risulta una modifica da proporre.',
        code: 'no_proposal',
        rationale: typeof generated.rationale === 'string' ? generated.rationale.slice(0, 600) : '',
      });
      return;
    }
    const proposal = await saveProposal(
      {
        skillId,
        // La versione di partenza è quella del file rilasciato (senza il suffisso della revisione).
        baseVersion: String(generated.baseVersion ?? '').split('+')[0],
        instructions: generated.instructions,
        rationale: generated.rationale,
        source: 'model',
        feedbackIds: feedback.map((f) => f.id),
      },
      miloActorOf(req),
    );
    audit(req, 'proposal_model', [
      `skill:${skillId}`,
      `version:${proposal.version}`,
      `feedback:${feedback.length}`,
    ]);
    res.status(201).json({ proposal });
  } catch (error) {
    fail(res, error, 'proposal');
  }
});

for (const decision of ['approve', 'reject'] as const) {
  miloSkillsRouter.post(`/versions/:id/${decision}`, manage, async (req: AuthedRequest, res) => {
    try {
      const version = await decideProposal(String(req.params.id), decision, miloActorOf(req));
      audit(req, decision, [`skill:${version.skillId}`, `version:${version.version}`]);
      res.status(200).json({ version });
    } catch (error) {
      fail(res, error, decision);
    }
  });
}

miloSkillsRouter.post('/skills/:skillId/restore', manage, async (req: AuthedRequest, res) => {
  const skillId = req.params.skillId;
  if (!isMiloSkillId(skillId)) {
    res.status(404).json({ error: 'Competenza sconosciuta', code: 'unknown_skill' });
    return;
  }
  try {
    const out = await restoreReleased(skillId);
    audit(req, 'restore', [`skill:${skillId}`]);
    res.status(200).json(out);
  } catch (error) {
    fail(res, error, 'restore');
  }
});
