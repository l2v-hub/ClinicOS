// Phase 7 — proactive endpoints, mounted inside the skills router (which already applies
// requireOperator, the per-request policy context, no-store caching and the async guard).
//
//   GET  /skills/proactive/inbox      Attention Inbox («Per te / Da vedere / Cosa è cambiato»)
//   POST /skills/proactive/ack        { acks: [{ signalId, rev }] } — «Preso visione»
//   POST /skills/proactive/seen       move the change-since-last-view watermark to now
//   POST /skills/proactive/open       { signalId } — audit + server-side action of a signal
//   GET  /skills/proactive/briefing   shift briefing (facts + optional AI summary)

import type { Response, Router } from 'express';
import type { AuthedRequest } from '../ai/auth.js';
import { authzOf } from '../authz/request-context.js';
import {
  acknowledge,
  buildBriefing,
  buildInbox,
  markSeen,
  openAction,
  type ProactiveDeps,
} from './engine.js';

export function registerProactiveRoutes(router: Router, deps: ProactiveDeps): void {
  function who(req: AuthedRequest, res: Response) {
    const authz = authzOf(req);
    if (!req.operator || !authz) {
      res.status(401).json({ error: 'Autenticazione richiesta', code: 'operator_missing' });
      return null;
    }
    return {
      operator: { id: req.operator.id, role: req.operator.role },
      roleId: authz.identity.roleId,
      authz,
    };
  }

  router.get('/proactive/inbox', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    // ?view=count → badge: counts only, no signal content, no «shown» audit row.
    if (req.query.view === 'count') {
      const inbox = await buildInbox(w, deps, { audit: false });
      res.status(200).json({ counts: inbox.counts });
      return;
    }
    // ?view=poll → automatic refresh of an already-open panel: same content, no new «shown» row.
    res.status(200).json(await buildInbox(w, deps, { audit: req.query.view !== 'poll' }));
  });

  router.post('/proactive/ack', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    const acks = (req.body as { acks?: unknown })?.acks;
    if (!Array.isArray(acks) || acks.length === 0 || acks.length > 100) {
      res.status(400).json({ error: 'acks: elenco da 1 a 100 segnali', code: 'invalid_input' });
      return;
    }
    res.status(200).json(await acknowledge(w, deps, acks as { signalId: string; rev: string }[]));
  });

  router.post('/proactive/seen', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    res.status(200).json(await markSeen(w, deps));
  });

  router.post('/proactive/open', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    const signalId = (req.body as { signalId?: unknown })?.signalId;
    const action = typeof signalId === 'string' ? await openAction(w, deps, signalId) : null;
    if (!action) {
      res.status(404).json({ error: 'Segnale non disponibile', code: 'signal_not_found' });
      return;
    }
    res.status(200).json({ action });
  });

  router.get('/proactive/briefing', async (req: AuthedRequest, res: Response) => {
    const w = who(req, res);
    if (!w) return;
    res.status(200).json(await buildBriefing(w, deps));
  });
}
