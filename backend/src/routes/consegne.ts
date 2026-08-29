import { Prisma } from '@prisma/client';
import { Router } from 'express';
import type { Response } from 'express';
import { requireOperator, type AuthedRequest, type Operator } from '../ai/auth.js';
import { ConsegnaInputError, isSafeConsegnaId, parseConsegnaFeedQuery } from '../consegne/query.js';
import { loadConsegnaFeed, loadConsegnaOverview } from '../consegne/read-service.js';
import { parseConsegnaCreateBody, parseConsegnaPatchBody } from '../consegne/write-validation.js';
import { prisma } from '../lib/prisma.js';
import { createConsegna } from '../services/consegna-service.js';

const consegneRouter = Router();
const PRIVILEGED_ROLES = new Set(['admin', 'manager']);

consegneRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
consegneRouter.use(requireOperator);

function privileged(actor: Operator): boolean {
  return PRIVILEGED_ROLES.has(actor.role.toLowerCase());
}

function visibleWhere(id: string, actor: Operator): Prisma.ConsegnaWhereInput {
  if (privileged(actor)) return { id };
  return {
    AND: [{ id }, { OR: [{ creatoDaId: actor.id }, { operatoreAssegnatoId: actor.id }] }],
  };
}

function notFound(res: Response): void {
  res.status(404).json({ error: 'Consegna non trovata' });
}

function badRequest(res: Response, error: unknown): boolean {
  if (!(error instanceof ConsegnaInputError)) return false;
  res.status(400).json({ error: error.message });
  return true;
}

consegneRouter.get('/', async (req: AuthedRequest, res) => {
  try {
    const input = parseConsegnaFeedQuery(req.query as Record<string, unknown>);
    res.status(200).json(await loadConsegnaFeed(req.operator!, input));
  } catch (error) {
    if (badRequest(res, error)) return;
    console.error('GET /consegne error:', error);
    res.status(500).json({ error: 'Errore nel recupero consegne' });
  }
});

consegneRouter.get('/overview', async (req: AuthedRequest, res) => {
  try {
    res.status(200).json(await loadConsegnaOverview(req.operator!));
  } catch (error) {
    console.error('GET /consegne/overview error:', error);
    res.status(500).json({ error: 'Errore nel riepilogo consegne' });
  }
});

consegneRouter.post('/', async (req: AuthedRequest, res) => {
  try {
    const input = parseConsegnaCreateBody(req.body);
    res.status(201).json(await createConsegna(input, req.operator!));
  } catch (error) {
    if (badRequest(res, error)) return;
    console.error('POST /consegne error:', error);
    res.status(500).json({ error: 'Errore durante creazione consegna' });
  }
});

consegneRouter.put('/:id', async (req: AuthedRequest, res) => {
  const actor = req.operator!;
  const rawId = req.params.id;
  if (typeof rawId !== 'string' || !isSafeConsegnaId(rawId)) {
    notFound(res);
    return;
  }
  const id = rawId;
  try {
    const existing = await prisma.consegna.findFirst({ where: visibleWhere(id, actor) });
    if (!existing) {
      notFound(res);
      return;
    }
    const patch = parseConsegnaPatchBody(req.body);
    const isPrivileged = privileged(actor);
    const isAuthor = existing.creatoDaId === actor.id;
    const isAssignee = existing.operatoreAssegnatoId === actor.id;
    const contentFields = ['priorita', 'tipo', 'note', 'scadenza', 'oraScadenza'];
    if (
      !isPrivileged &&
      Object.keys(patch).some((key) => contentFields.includes(key)) &&
      !isAuthor
    ) {
      notFound(res);
      return;
    }
    if (!isPrivileged && patch.operatoreAssegnatoId !== undefined) {
      notFound(res);
      return;
    }
    if (patch.stato !== undefined && !isPrivileged && !isAuthor && !isAssignee) {
      notFound(res);
      return;
    }

    let assignee: { id: string; user: { fullName: string } } | null | undefined;
    if (patch.operatoreAssegnatoId !== undefined) {
      assignee = patch.operatoreAssegnatoId
        ? await prisma.operator.findFirst({
            where: { id: patch.operatoreAssegnatoId, user: { isActive: true } },
            select: { id: true, user: { select: { fullName: true } } },
          })
        : null;
      if (patch.operatoreAssegnatoId && !assignee) {
        throw new ConsegnaInputError('Operatore assegnato non disponibile');
      }
    }

    const data: Prisma.ConsegnaUpdateInput = {
      ...(patch.priorita !== undefined ? { priorita: patch.priorita } : {}),
      ...(patch.stato !== undefined ? { stato: patch.stato } : {}),
      ...(patch.tipo !== undefined ? { tipo: patch.tipo } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.scadenza !== undefined ? { scadenza: patch.scadenza } : {}),
      ...(patch.oraScadenza !== undefined ? { oraScadenza: patch.oraScadenza } : {}),
      ...(patch.operatoreAssegnatoId !== undefined
        ? {
            operatoreAssegnatoId: assignee?.id ?? null,
            operatoreAssegnato: assignee?.user.fullName ?? '',
          }
        : {}),
    };
    res.status(200).json(await prisma.consegna.update({ where: { id }, data }));
  } catch (error) {
    if (badRequest(res, error)) return;
    console.error('PUT /consegne/:id error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento consegna' });
  }
});

consegneRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const actor = req.operator!;
  const rawId = req.params.id;
  if (typeof rawId !== 'string' || !isSafeConsegnaId(rawId)) {
    notFound(res);
    return;
  }
  const id = rawId;
  try {
    const existing = await prisma.consegna.findFirst({
      where: visibleWhere(id, actor),
      select: { id: true, creatoDaId: true },
    });
    if (!existing || (!privileged(actor) && existing.creatoDaId !== actor.id)) {
      notFound(res);
      return;
    }
    await prisma.consegna.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /consegne/:id error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione consegna' });
  }
});

export default consegneRouter;
