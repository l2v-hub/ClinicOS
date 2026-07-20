import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

// Fase 1b: real CRUD for the admin "Gestione Operatori" screen (was a client-side mock).
// An "operatore" in the UI is a User (identity: fullName/email/isActive) + an Operator row
// (department/phone/ruolo/qualifica). Rows are returned already mapped to the frontend
// `Operatore` shape; colore/iniziali stay client-derived.

const operatorsRouter = Router();

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
  _count?: { registeredPatients: number };
};

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

async function appointmentsTodayByOperator(): Promise<Map<string, number>> {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const rows = await prisma.appointment.groupBy({
    by: ['operatorId'],
    where: { scheduledAt: { gte: from, lte: to } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.operatorId, r._count._all]));
}

// GET /operators
operatorsRouter.get('/', async (_req, res) => {
  try {
    const [operators, apptToday] = await Promise.all([
      prisma.operator.findMany({
        include: { user: true, _count: { select: { registeredPatients: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      appointmentsTodayByOperator(),
    ]);
    res.status(200).json(operators.map((op) => toOperatore(op, apptToday.get(op.id) ?? 0)));
  } catch (error) {
    console.error('GET /operators error:', error);
    res.status(500).json({ error: 'Errore nel recupero operatori' });
  }
});

// ── #285: weekly schedules (admin "Orari operatori") — JSON blob per operator ──────────────

// GET /operators/schedules (named route BEFORE parameterized)
operatorsRouter.get('/schedules', async (_req, res) => {
  try {
    const rows = await prisma.operatorSchedule.findMany();
    res.status(200).json(
      rows.map((r) => {
        const d = (r.data ?? {}) as { turni?: unknown; note?: string };
        return { id: r.id, operatoreId: r.operatorId, turni: d.turni ?? [], note: d.note ?? '' };
      }),
    );
  } catch (error) {
    console.error('GET /operators/schedules error:', error);
    res.status(500).json({ error: 'Errore nel recupero orari operatori' });
  }
});

// PUT /operators/:operatorId/schedule  { turni, note }
operatorsRouter.put('/:operatorId/schedule', async (req, res) => {
  const { operatorId } = req.params;
  const body = req.body as { turni?: unknown; note?: string };
  if (!Array.isArray(body.turni)) {
    res.status(400).json({ error: 'Campo obbligatorio: turni (array)' });
    return;
  }
  try {
    const operator = await prisma.operator.findUnique({ where: { id: operatorId } });
    if (!operator) {
      res.status(404).json({ error: 'Operatore non trovato' });
      return;
    }
    const data = { turni: body.turni, note: body.note ?? '' };
    const row = await prisma.operatorSchedule.upsert({
      where: { operatorId },
      update: { data },
      create: { operatorId, data },
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
      appointmentsTodayByOperator(),
    ]);

    console.log(`PUT /operators/${operatorId} → updated`);
    res.status(200).json(toOperatore(updated, apptToday.get(operatorId) ?? 0));
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
