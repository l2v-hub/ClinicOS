import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { requireOperator, requireRole } from '../ai/auth.js';
import {
  OperatorScheduleInputError,
  boundStoredOperatorSchedules,
  operatorScheduleListQuery,
  parseOperatorScheduleInput,
} from '../operators/schedule-contract.js';
import { MAX_OPERATOR_DIRECTORY, boundOperatorDirectory } from '../operators/directory-window.js';

// Fase 1b: real CRUD for the admin "Gestione Operatori" screen (was a client-side mock).
// An "operatore" in the UI is a User (identity: fullName/email/isActive) + an Operator row
// (department/phone/ruolo/qualifica). Rows are returned already mapped to the frontend
// `Operatore` shape; colore/iniziali stay client-derived.

const operatorsRouter = Router();
const requireAdmin = requireRole('admin', 'manager');

// Operator profiles and schedules contain PII and operational staffing data. Set this before
// authentication/RBAC so successful responses and all denial/error paths remain non-cacheable.
operatorsRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

// In production the operator is resolved from Entra + the server-side mapping. The operational
// directory is intentionally minimal; full profiles, notes, schedules and all writes are admin-only.
operatorsRouter.use(requireOperator);
operatorsRouter.use((req, res, next) => {
  const isOperationalDirectory = req.method === 'GET' && req.path === '/directory';
  if (isOperationalDirectory) {
    next();
    return;
  }
  requireAdmin(req, res, next);
});

// UI fullName convention: first token = nome, rest = cognome ("Marco De Luca" → Marco / De Luca).
function splitFullName(fullName: string): { nome: string; cognome: string } {
  const parts = fullName.trim().split(/\s+/);
  return { nome: parts[0] ?? '', cognome: parts.slice(1).join(' ') };
}

type OperatorWithUser = {
  id: string;
  department: string | null;
  phone: string | null;
  ruolo: string | null;
  qualifica: string | null;
  user: { email: string; fullName: string; isActive: boolean };
  _count?: { registeredPatients?: number; appointments?: number };
};

export const OPERATOR_DIRECTORY_SELECT = {
  id: true,
  department: true,
  ruolo: true,
  qualifica: true,
  user: { select: { fullName: true, isActive: true } },
} as const;

export const OPERATOR_ADMIN_SELECT = {
  id: true,
  department: true,
  phone: true,
  ruolo: true,
  qualifica: true,
  user: { select: { email: true, fullName: true, isActive: true } },
  _count: { select: { registeredPatients: true } },
} as const;

function toOperatore(op: OperatorWithUser, appuntamentiOggi: number) {
  const { nome, cognome } = splitFullName(op.user.fullName);
  return {
    id: op.id,
    nome,
    cognome,
    ruolo: op.ruolo ?? 'medico',
    email: op.user.email,
    telefono: op.phone ?? '',
    reparto: op.department ?? '',
    stato: op.user.isActive ? 'attivo' : 'inattivo',
    qualifica: op.qualifica ?? '',
    pazientiAssegnati: op._count?.registeredPatients ?? 0,
    appuntamentiOggi,
  };
}

function todayRange(): { gte: Date; lte: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { gte: from, lte: to };
}

async function appointmentsTodayForOperator(operatorId: string): Promise<number> {
  return prisma.appointment.count({ where: { operatorId, scheduledAt: todayRange() } });
}

// GET /operators/directory — minimum fields needed by agendas and clinical collaboration.
operatorsRouter.get('/directory', async (_req, res) => {
  try {
    const scheduledAt = todayRange();
    const operators = await prisma.operator.findMany({
      select: {
        ...OPERATOR_DIRECTORY_SELECT,
        _count: { select: { appointments: { where: { scheduledAt } } } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: MAX_OPERATOR_DIRECTORY + 1,
    });
    const window = boundOperatorDirectory(operators);
    if (window.overflow) {
      res.status(409).json({ error: 'Directory oltre il limite: usare la ricerca paginata' });
      return;
    }
    res.status(200).json(
      window.items.map((op) => {
        const { nome, cognome } = splitFullName(op.user.fullName);
        return {
          id: op.id,
          nome,
          cognome,
          ruolo: op.ruolo ?? 'medico',
          email: '',
          telefono: '',
          reparto: op.department ?? '',
          stato: op.user.isActive ? 'attivo' : 'inattivo',
          qualifica: op.qualifica ?? '',
          pazientiAssegnati: 0,
          appuntamentiOggi: op._count.appointments,
        };
      }),
    );
  } catch (error) {
    console.error('GET /operators/directory error:', error);
    res.status(500).json({ error: 'Errore nel recupero directory operatori' });
  }
});

// GET /operators/directory/schedules — facility-wide staffing remains admin/manager-only;
// private schedule notes are omitted from this compatibility response.
operatorsRouter.get('/directory/schedules', async (_req, res) => {
  try {
    const rows = await prisma.operatorSchedule.findMany(operatorScheduleListQuery());
    const result = boundStoredOperatorSchedules(rows, false);
    if (result.overflow) {
      res.status(409).json({ error: 'Elenco orari oltre il limite: è richiesta la paginazione' });
      return;
    }
    if (result.invalidRows > 0)
      console.warn(`GET /operators/directory/schedules omitted ${result.invalidRows} invalid rows`);
    res.status(200).json(result.items);
  } catch (error) {
    console.error('GET /operators/directory/schedules error:', error);
    res.status(500).json({ error: 'Errore nel recupero turni operatori' });
  }
});

// GET /operators
operatorsRouter.get('/', async (_req, res) => {
  try {
    const scheduledAt = todayRange();
    const operators = await prisma.operator.findMany({
      select: {
        ...OPERATOR_ADMIN_SELECT,
        _count: {
          select: {
            registeredPatients: true,
            appointments: { where: { scheduledAt } },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: MAX_OPERATOR_DIRECTORY + 1,
    });
    const window = boundOperatorDirectory(operators);
    if (window.overflow) {
      res.status(409).json({ error: 'Directory oltre il limite: usare la ricerca paginata' });
      return;
    }
    res.status(200).json(window.items.map((op) => toOperatore(op, op._count.appointments)));
  } catch (error) {
    console.error('GET /operators error:', error);
    res.status(500).json({ error: 'Errore nel recupero operatori' });
  }
});

// ── #285: weekly schedules (admin "Orari operatori") — JSON blob per operator ──────────────

// GET /operators/schedules (named route BEFORE parameterized)
operatorsRouter.get('/schedules', async (_req, res) => {
  try {
    const rows = await prisma.operatorSchedule.findMany(operatorScheduleListQuery());
    const result = boundStoredOperatorSchedules(rows, true);
    if (result.overflow) {
      res.status(409).json({ error: 'Elenco orari oltre il limite: è richiesta la paginazione' });
      return;
    }
    if (result.invalidRows > 0)
      console.warn(`GET /operators/schedules omitted ${result.invalidRows} invalid rows`);
    res.status(200).json(result.items);
  } catch (error) {
    console.error('GET /operators/schedules error:', error);
    res.status(500).json({ error: 'Errore nel recupero orari operatori' });
  }
});

// PUT /operators/:operatorId/schedule  { turni, note }
operatorsRouter.put('/:operatorId/schedule', async (req, res) => {
  const rawOperatorId = req.params.operatorId;
  const operatorId = Array.isArray(rawOperatorId) ? (rawOperatorId[0] ?? '') : rawOperatorId;
  let data;
  try {
    data = parseOperatorScheduleInput(operatorId, req.body);
  } catch (error) {
    if (error instanceof OperatorScheduleInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
  try {
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      select: { id: true },
    });
    if (!operator) {
      res.status(404).json({ error: 'Operatore non trovato' });
      return;
    }
    const storedData = {
      turni: data.turni.map((shift) => ({ ...shift })),
      note: data.note,
    } satisfies Prisma.InputJsonObject;
    const row = await prisma.operatorSchedule.upsert({
      where: { operatorId },
      update: { data: storedData },
      create: { operatorId, data: storedData },
    });
    console.log(`PUT /operators/${operatorId}/schedule → saved`);
    res
      .status(200)
      .json({ id: row.id, operatoreId: operatorId, turni: data.turni, note: data.note });
  } catch (error) {
    console.error('PUT /operators/:operatorId/schedule error:', error);
    res.status(500).json({ error: 'Errore durante salvataggio orari' });
  }
});

// POST /operators
operatorsRouter.post('/', async (req, res) => {
  const body = req.body as {
    nome?: string;
    cognome?: string;
    ruolo?: string;
    email?: string;
    telefono?: string;
    reparto?: string;
    stato?: string;
    qualifica?: string;
  };

  if (!body.nome?.trim() || !body.cognome?.trim() || !body.email?.trim()) {
    res.status(400).json({ error: 'Campi obbligatori: nome, cognome, email' });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email.trim(),
        // Login is handled by Entra/OIDC in front of the app; this account has no local password.
        passwordHash: 'ADMIN_CREATED_NO_LOCAL_LOGIN',
        fullName: `${body.nome.trim()} ${body.cognome.trim()}`,
        role: 'OPERATOR',
        isActive: body.stato !== 'inattivo',
        operator: {
          create: {
            department: body.reparto?.trim() || null,
            phone: body.telefono?.trim() || null,
            ruolo: body.ruolo || null,
            qualifica: body.qualifica?.trim() || null,
          },
        },
      },
      include: { operator: true },
    });

    const op = user.operator!;
    console.log(`POST /operators → created id=${op.id}`);
    res.status(201).json(
      toOperatore(
        {
          ...op,
          user: { email: user.email, fullName: user.fullName, isActive: user.isActive },
        },
        0,
      ),
    );
  } catch (error: unknown) {
    console.error('POST /operators error:', error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Email già registrata' });
      return;
    }
    res.status(500).json({ error: 'Errore durante creazione operatore' });
  }
});

// PUT /operators/:operatorId
operatorsRouter.put('/:operatorId', async (req, res) => {
  const { operatorId } = req.params;
  const body = req.body as {
    nome?: string;
    cognome?: string;
    ruolo?: string;
    email?: string;
    telefono?: string;
    reparto?: string;
    stato?: string;
    qualifica?: string;
  };

  try {
    const existing = await prisma.operator.findUnique({
      where: { id: operatorId },
      include: { user: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Operatore non trovato' });
      return;
    }

    const operatorData: Record<string, unknown> = {};
    if (body.reparto !== undefined) operatorData.department = body.reparto.trim() || null;
    if (body.telefono !== undefined) operatorData.phone = body.telefono.trim() || null;
    if (body.ruolo !== undefined) operatorData.ruolo = body.ruolo || null;
    if (body.qualifica !== undefined) operatorData.qualifica = body.qualifica.trim() || null;

    const userData: Record<string, unknown> = {};
    if (body.nome !== undefined || body.cognome !== undefined) {
      const current = splitFullName(existing.user.fullName);
      const nome = (body.nome ?? current.nome).trim();
      const cognome = (body.cognome ?? current.cognome).trim();
      if (!nome || !cognome) {
        res.status(400).json({ error: 'Nome e cognome non possono essere vuoti' });
        return;
      }
      userData.fullName = `${nome} ${cognome}`;
    }
    if (body.email !== undefined) {
      if (!body.email.trim()) {
        res.status(400).json({ error: 'Email non può essere vuota' });
        return;
      }
      userData.email = body.email.trim();
    }
    if (body.stato !== undefined) userData.isActive = body.stato !== 'inattivo';

    const [updated, apptToday] = await Promise.all([
      prisma.operator.update({
        where: { id: operatorId },
        data: {
          ...operatorData,
          ...(Object.keys(userData).length > 0 ? { user: { update: userData } } : {}),
        },
        include: { user: true, _count: { select: { registeredPatients: true } } },
      }),
      appointmentsTodayForOperator(operatorId),
    ]);

    console.log(`PUT /operators/${operatorId} → updated`);
    res.status(200).json(toOperatore(updated, apptToday));
  } catch (error: unknown) {
    console.error('PUT /operators/:operatorId error:', error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Email già registrata' });
      return;
    }
    res.status(500).json({ error: 'Errore durante aggiornamento operatore' });
  }
});

export { operatorsRouter };
export default operatorsRouter;
