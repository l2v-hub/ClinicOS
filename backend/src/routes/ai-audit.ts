// SPEC-015 T017 (US2): audit consultation — GET /ai/audit.
//
// Reserved to admin/manager via the REAL X-Operator-Role header (unlike the AI action routes,
// where the gateway role is clamped to 'operatore', here the declared role gates access — same
// pragmatic role-gate as requireOperator, to be tightened when an IdP exists). Events are
// returned newest-first; limit defaults to 50, hard cap 200. Errors: { error: { kind, message } }.

import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';

const auditRouter = Router();
auditRouter.use(requireOperator);

const PRIVILEGED_ROLES = new Set(['admin', 'manager']);

function queryString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function queryDate(v: unknown): Date | undefined {
  const s = queryString(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// GET /ai/audit?operatorId=&patientId=&outcome=&from=&to=&limit=
auditRouter.get('/', async (req: AuthedRequest, res) => {
  const role = req.operator!.role; // requireOperator guarantees + lowercases it
  if (!PRIVILEGED_ROLES.has(role)) {
    res.status(403).json({ error: { kind: 'forbidden', message: 'Consultazione audit riservata ai ruoli admin/manager.' } });
    return;
  }
  try {
    const operatorId = queryString(req.query.operatorId);
    const patientId = queryString(req.query.patientId);
    const outcome = queryString(req.query.outcome);
    const from = queryDate(req.query.from);
    const to = queryDate(req.query.to);
    let limit = Number.parseInt(String(req.query.limit ?? ''), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    limit = Math.min(limit, 200);

    const where: Record<string, unknown> = {};
    if (operatorId) where.operatorId = operatorId;
    if (patientId) where.patientId = patientId;
    if (outcome) where.outcome = outcome;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const events = await prisma.aiAuditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.status(200).json(events);
  } catch (error) {
    console.error('GET /ai/audit error:', error);
    res.status(500).json({ error: { kind: 'internal', message: 'Errore durante la consultazione dell’audit' } });
  }
});

export default auditRouter;
