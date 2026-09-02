import { prisma } from '../lib/prisma.js';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireOperator, requireRole, type AuthedRequest } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import { getFacilityOccupancy } from '../rooms/occupancy-service.js';
import {
  authoritativeAssignmentActor,
  boundPatientAssignmentResult,
  MAX_ACTIVE_ASSIGNMENTS_PER_BED,
  MAX_PATIENT_ACTIVE_ASSIGNMENTS,
  MAX_PATIENT_ASSIGNMENT_HISTORY,
  PATIENT_ROOM_ASSIGNMENT_READ_SELECT,
  ROOM_ASSIGNMENT_OCCUPANT_SELECT,
  ROOM_LOCATION_SELECT,
} from './room-read-model.js';
import {
  assignmentLockKeys,
  assignmentOverlapFilter,
  bedWriteLockKeys,
  MAX_ROOM_BEDS,
  parseAssignmentCreate,
  parseAssignmentUpdate,
  parseBedCreate,
  parseBedUpdate,
  parseRoomCreate,
  parseRoomUpdate,
  previousIsoDate,
  roomWriteLockKeys,
  validateDateRange,
} from './room-input.js';

const adminRouter = Router();
const patientAssignmentRouter = Router();
const requireAdmin = requireRole('admin', 'manager');

// Internal control-flow error: thrown inside the assignment transaction to reject overlapping
// bed periods after the advisory lock is held, and mapped to 409 by the route's catch block.
class BedOverlapError extends Error {}
class PatientOverlapError extends Error {}
class InvalidAssignmentRangeError extends Error {}
class BedUnavailableError extends Error {}

// Facility occupancy is clinical data: do not let browsers or intermediaries retain it.
const preventClinicalCaching = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
};

adminRouter.use(preventClinicalCaching);
patientAssignmentRouter.use(preventClinicalCaching);

// Stanze/letti e assegnazioni paziente richiedono un operatore identificato.
adminRouter.use(requireOperator);
// The read models include facility occupancy and patient identity. The `/admin` namespace is
// therefore privileged for reads as well as writes; aggregate assistant reads use internal DB
// services and do not need this route.
adminRouter.use(requireAdmin);
patientAssignmentRouter.use(requireOperator);
patientAssignmentRouter.use('/:patientId/room-assignments', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    requireAdmin(req, res, next);
    return;
  }
  next();
});

// ── Helper: active assignment filter (endDate is null or >= from) ──────────
// `from` di default e' oggi ("assegnazioni attive"). Chi verifica la disponibilita' per un
// intervallo arbitrario deve invece usare `assignmentOverlapFilter`, che applica anche il limite
// superiore sulla data iniziale e impedisce di materializzare assegnazioni future non pertinenti.
function activeAssignmentFilter(from = new Date().toISOString().slice(0, 10)) {
  return {
    OR: [{ endDate: null }, { endDate: { gte: from } }],
  };
}

// ── Exact operational read models (never join a full Patient row) ──────────
function bedWithAssignmentsSelect() {
  return {
    id: true,
    roomId: true,
    label: true,
    stato: true,
    note: true,
    assignments: {
      where: activeAssignmentFilter(),
      orderBy: { startDate: 'desc' as const },
      take: MAX_ACTIVE_ASSIGNMENTS_PER_BED,
      select: ROOM_ASSIGNMENT_OCCUPANT_SELECT,
    },
  };
}

function roomWithAssignmentsSelect() {
  return {
    id: true,
    numero: true,
    tipo: true,
    piano: true,
    reparto: true,
    stato: true,
    note: true,
    beds: {
      select: bedWithAssignmentsSelect(),
      orderBy: { label: 'asc' as const },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROOMS CRUD — mounted at /admin/rooms
// ═══════════════════════════════════════════════════════════════════════════

// GET /admin/rooms/occupancy  (named route BEFORE parameterized)
adminRouter.get('/rooms/occupancy', async (_req, res) => {
  try {
    res.status(200).json(await getFacilityOccupancy());
  } catch (error) {
    console.error('GET /admin/rooms/occupancy error:', error);
    res.status(500).json({ error: 'Errore nel recupero occupazione stanze' });
  }
});

// GET /admin/beds/available?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
adminRouter.get('/beds/available', async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const range = validateDateRange(startDate, endDate);
  if (!range.ok) {
    res.status(400).json({ error: range.error });
    return;
  }
  const { startDate: validStartDate, endDate: validEndDate } = range.value;

  try {
    const beds = await prisma.bed.findMany({
      where: {
        stato: { not: 'manutenzione' },
        assignments: { none: assignmentOverlapFilter(validStartDate, validEndDate) },
      },
      select: {
        id: true,
        label: true,
        stato: true,
        roomId: true,
        room: { select: ROOM_LOCATION_SELECT },
      },
    });
    res.status(200).json(beds);
  } catch (error) {
    console.error('GET /admin/beds/available error:', error);
    res.status(500).json({ error: 'Errore nel recupero letti disponibili' });
  }
});

// GET /admin/rooms
adminRouter.get('/rooms', async (_req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      select: roomWithAssignmentsSelect(),
      orderBy: { numero: 'asc' },
    });
    res.status(200).json(rooms);
  } catch (error) {
    console.error('GET /admin/rooms error:', error);
    res.status(500).json({ error: 'Errore nel recupero stanze' });
  }
});

// POST /admin/rooms
adminRouter.post('/rooms', async (req, res) => {
  const input = parseRoomCreate(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }
  const body = input.value;

  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  try {
    const room = await prisma.room.create({
      data: {
        numero: body.numero,
        tipo: body.tipo,
        piano: body.piano,
        reparto: body.reparto,
        stato: body.stato,
        note: body.note,
        beds: {
          create: Array.from({ length: body.bedCount }, (_, i) => ({
            label: labels[i] || String(i + 1),
          })),
        },
      },
      select: roomWithAssignmentsSelect(),
    });

    console.log(`POST /admin/rooms → created id=${room.id} numero=${room.numero}`);
    res.status(201).json(room);
  } catch (error: unknown) {
    console.error('POST /admin/rooms error:', error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Numero stanza già esistente' });
      return;
    }
    res.status(500).json({ error: 'Errore durante creazione stanza' });
  }
});

// GET /admin/rooms/:roomId
adminRouter.get('/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: roomWithAssignmentsSelect(),
    });
    if (!room) {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }
    res.status(200).json(room);
  } catch (error) {
    console.error('GET /admin/rooms/:roomId error:', error);
    res.status(500).json({ error: 'Errore nel recupero stanza' });
  }
});

// PUT /admin/rooms/:roomId
adminRouter.put('/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const input = parseRoomUpdate(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }
  const body = input.value;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      for (const lockKey of roomWriteLockKeys(roomId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
      const existing = await tx.room.findUnique({
        where: { id: roomId },
        select: {
          tipo: true,
          beds: {
            select: {
              id: true,
              label: true,
              assignments: {
                where: activeAssignmentFilter(),
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });
      if (!existing) return { kind: 'not_found' as const };
      for (const lockKey of roomWriteLockKeys(
        roomId,
        existing.beds.map((bed) => bed.id),
      ).slice(1)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }

      if (body.tipo && body.tipo !== existing.tipo) {
        const maxBeds =
          body.tipo === 'singola' ? 1 : body.tipo === 'doppia' ? 2 : existing.beds.length;
        if (maxBeds < existing.beds.length) {
          const bedsToRemove = [...existing.beds]
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(maxBeds);
          if (bedsToRemove.some((bed) => bed.assignments.length > 0)) {
            return { kind: 'occupied' as const };
          }
          await tx.bed.deleteMany({ where: { id: { in: bedsToRemove.map((bed) => bed.id) } } });
        }
      }

      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value;
      }
      const room = await tx.room.update({
        where: { id: roomId },
        data: updates,
        select: roomWithAssignmentsSelect(),
      });
      return { kind: 'updated' as const, room };
    });
    if (outcome.kind === 'not_found') {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }
    if (outcome.kind === 'occupied') {
      res.status(409).json({
        error: 'Impossibile ridurre il tipo stanza: alcuni letti da rimuovere sono occupati',
      });
      return;
    }

    console.log(`PUT /admin/rooms/${roomId} → updated`);
    res.status(200).json(outcome.room);
  } catch (error) {
    console.error('PUT /admin/rooms/:roomId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento stanza' });
  }
});

// DELETE /admin/rooms/:roomId
adminRouter.delete('/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      for (const lockKey of roomWriteLockKeys(roomId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
      const snapshot = await tx.room.findUnique({
        where: { id: roomId },
        select: { beds: { select: { id: true } } },
      });
      if (!snapshot) return 'not_found' as const;

      for (const lockKey of roomWriteLockKeys(
        roomId,
        snapshot.beds.map((bed) => bed.id),
      ).slice(1)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
      const room = await tx.room.findUnique({
        where: { id: roomId },
        select: {
          beds: {
            select: {
              assignments: {
                where: activeAssignmentFilter(),
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });
      if (!room) return 'not_found' as const;
      if (room.beds.some((bed) => bed.assignments.length > 0)) return 'active' as const;

      await tx.room.delete({ where: { id: roomId } });
      return 'deleted' as const;
    });
    if (outcome === 'not_found') {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }
    if (outcome === 'active') {
      res.status(409).json({ error: 'Impossibile eliminare: la stanza ha assegnazioni attive' });
      return;
    }

    console.log(`DELETE /admin/rooms/${roomId} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /admin/rooms/:roomId error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione stanza' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BEDS — mounted at /admin
// ═══════════════════════════════════════════════════════════════════════════

// GET /admin/rooms/:roomId/beds
adminRouter.get('/rooms/:roomId/beds', async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
    if (!room) {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }

    const beds = await prisma.bed.findMany({
      where: { roomId },
      select: bedWithAssignmentsSelect(),
      orderBy: { label: 'asc' },
    });
    res.status(200).json(beds);
  } catch (error) {
    console.error('GET /admin/rooms/:roomId/beds error:', error);
    res.status(500).json({ error: 'Errore nel recupero letti' });
  }
});

// POST /admin/rooms/:roomId/beds
adminRouter.post('/rooms/:roomId/beds', async (req, res) => {
  const { roomId } = req.params;
  const input = parseBedCreate(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }
  const body = input.value;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      for (const lockKey of roomWriteLockKeys(roomId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
      const room = await tx.room.findUnique({
        where: { id: roomId },
        select: { id: true, _count: { select: { beds: true } } },
      });
      if (!room) return { kind: 'not_found' as const };
      if (room._count.beds >= MAX_ROOM_BEDS) return { kind: 'full' as const };
      const bed = await tx.bed.create({
        data: {
          roomId,
          label: body.label,
          stato: body.stato,
          note: body.note,
        },
        select: bedWithAssignmentsSelect(),
      });
      return { kind: 'created' as const, bed };
    });
    if (outcome.kind === 'not_found') {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }
    if (outcome.kind === 'full') {
      res.status(409).json({ error: `La stanza ha già il massimo di ${MAX_ROOM_BEDS} letti` });
      return;
    }

    console.log(`POST /admin/rooms/${roomId}/beds → created id=${outcome.bed.id}`);
    res.status(201).json(outcome.bed);
  } catch (error: unknown) {
    console.error('POST /admin/rooms/:roomId/beds error:', error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Label letto già esistente per questa stanza' });
      return;
    }
    res.status(500).json({ error: 'Errore durante creazione letto' });
  }
});

// PUT /admin/beds/:bedId
adminRouter.put('/beds/:bedId', async (req, res) => {
  const { bedId } = req.params;
  const input = parseBedUpdate(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }
  const body = input.value;

  try {
    const lockTarget = await prisma.bed.findUnique({
      where: { id: bedId },
      select: { roomId: true },
    });
    if (!lockTarget) {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }

    const outcome = await prisma.$transaction(async (tx) => {
      for (const lockKey of bedWriteLockKeys(lockTarget.roomId, bedId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
      const bed = await tx.bed.findUnique({
        where: { id: bedId },
        select: {
          id: true,
          assignments: {
            where: activeAssignmentFilter(),
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!bed) return { kind: 'not_found' as const };
      if (body.stato === 'manutenzione' && bed.assignments.length > 0) {
        return { kind: 'occupied' as const };
      }

      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value;
      }
      const updated = await tx.bed.update({
        where: { id: bedId },
        data: updates,
        select: bedWithAssignmentsSelect(),
      });
      return { kind: 'updated' as const, bed: updated };
    });
    if (outcome.kind === 'not_found') {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }
    if (outcome.kind === 'occupied') {
      res.status(409).json({ error: 'Impossibile impostare manutenzione: il letto è occupato' });
      return;
    }

    console.log(`PUT /admin/beds/${bedId} → updated`);
    res.status(200).json(outcome.bed);
  } catch (error) {
    console.error('PUT /admin/beds/:bedId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento letto' });
  }
});

// DELETE /admin/beds/:bedId
adminRouter.delete('/beds/:bedId', async (req, res) => {
  const { bedId } = req.params;

  try {
    const lockTarget = await prisma.bed.findUnique({
      where: { id: bedId },
      select: { roomId: true },
    });
    if (!lockTarget) {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }

    const outcome = await prisma.$transaction(async (tx) => {
      for (const lockKey of bedWriteLockKeys(lockTarget.roomId, bedId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
      const bed = await tx.bed.findUnique({
        where: { id: bedId },
        select: {
          assignments: {
            where: activeAssignmentFilter(),
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!bed) return 'not_found' as const;
      if (bed.assignments.length > 0) return 'active' as const;
      await tx.bed.delete({ where: { id: bedId } });
      return 'deleted' as const;
    });
    if (outcome === 'not_found') {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }
    if (outcome === 'active') {
      res.status(409).json({ error: 'Impossibile eliminare: il letto ha assegnazioni attive' });
      return;
    }

    console.log(`DELETE /admin/beds/${bedId} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /admin/beds/:bedId error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione letto' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT ROOM ASSIGNMENTS — mounted at /patients
// ═══════════════════════════════════════════════════════════════════════════

// GET /patients/:patientId/room-assignments
// Active and legacy-history reads are both bounded. A future cursor API can replace the explicit
// truncation signal for clients that need to traverse more than the most recent history window.
patientAssignmentRouter.get(
  '/:patientId/room-assignments',
  (req, res, next) => {
    const rawScope = req.query.scope;
    if (rawScope !== undefined && rawScope !== 'active') {
      res.status(400).json({ error: 'Parametro scope non valido' });
      return;
    }
    next();
  },
  requirePatientScope,
  async (req, res) => {
    const patientIdParam = req.params.patientId;
    const patientId = Array.isArray(patientIdParam) ? patientIdParam[0] : patientIdParam;
    const activeOnly = req.query.scope === 'active';
    try {
      const assignments = await prisma.patientRoomAssignment.findMany({
        where: { patientId, ...(activeOnly ? activeAssignmentFilter() : {}) },
        select: PATIENT_ROOM_ASSIGNMENT_READ_SELECT,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        // Fetch one extra historical row so the response can disclose truncation without issuing
        // a separate count query. Active reads remain the small operational overlap window.
        take: activeOnly ? MAX_PATIENT_ACTIVE_ASSIGNMENTS : MAX_PATIENT_ASSIGNMENT_HISTORY + 1,
      });
      const result = boundPatientAssignmentResult(assignments, activeOnly);
      if (result.truncated) res.setHeader('X-Result-Truncated', 'true');
      res.status(200).json(result.items);
    } catch (error) {
      console.error('GET /patients/:patientId/room-assignments error:', error);
      res.status(500).json({ error: 'Errore nel recupero assegnazioni stanza' });
    }
  },
);

// POST /patients/:patientId/room-assignments
patientAssignmentRouter.post('/:patientId/room-assignments', async (req: AuthedRequest, res) => {
  const patientIdParam = req.params.patientId;
  const patientId = Array.isArray(patientIdParam) ? patientIdParam[0] : patientIdParam;
  const input = parseAssignmentCreate(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }
  const { bedId, startDate, endDate, note } = input.value;

  try {
    // Validate patient
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    // Validate bed
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      select: { id: true, roomId: true, stato: true },
    });
    if (!bed) {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }

    if (bed.stato === 'manutenzione') {
      res.status(409).json({ error: 'Il letto è in manutenzione' });
      return;
    }

    // Overlap check + close-active-assignment + create are one atomic unit: without a lock, two
    // concurrent requests for the same bed can both pass the overlap check before either commits.
    // Prefixed bed + patient locks are acquired in deterministic order. This serializes both
    // callers contending for one bed and callers moving the same patient to different beds.
    const assignment = await prisma.$transaction(async (tx) => {
      for (const lockKey of assignmentLockKeys(patientId, bedId, bed.roomId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }

      const lockedBed = await tx.bed.findUnique({
        where: { id: bedId },
        select: { id: true, roomId: true, stato: true },
      });
      if (!lockedBed) throw new BedUnavailableError('Il letto non è più disponibile');
      if (lockedBed.stato === 'manutenzione') {
        throw new BedUnavailableError('Il letto è in manutenzione');
      }

      // Check for overlapping assignments on this bed
      const existingBedAssignment = await tx.patientRoomAssignment.findFirst({
        where: { bedId, ...assignmentOverlapFilter(startDate, endDate) },
        select: { id: true },
      });
      if (existingBedAssignment) {
        throw new BedOverlapError('Il letto è già occupato nel periodo indicato');
      }

      // A patient lock alone is not sufficient: finite scheduled stays can overlap too. A prior
      // open stay may be closed for a real move; every other overlap is an explicit conflict.
      const patientAssignments = await tx.patientRoomAssignment.findMany({
        where: { patientId, ...assignmentOverlapFilter(startDate, endDate) },
        select: { id: true, startDate: true, endDate: true },
      });
      const closableOpen = patientAssignments.filter(
        (assignment) => assignment.endDate === null && assignment.startDate < startDate,
      );
      if (patientAssignments.length !== closableOpen.length) {
        throw new PatientOverlapError('Il paziente ha già un’assegnazione nel periodo indicato');
      }
      if (closableOpen.length > 0) {
        await tx.patientRoomAssignment.updateMany({
          where: { id: { in: closableOpen.map((assignment) => assignment.id) } },
          data: { endDate: previousIsoDate(startDate) },
        });
      }

      return tx.patientRoomAssignment.create({
        data: {
          patientId,
          roomId: lockedBed.roomId,
          bedId,
          startDate,
          endDate,
          note,
          createdById: authoritativeAssignmentActor(req.operator!),
        },
        select: PATIENT_ROOM_ASSIGNMENT_READ_SELECT,
      });
    });

    console.log(`POST /patients/${patientId}/room-assignments → created id=${assignment.id}`);
    res.status(201).json(assignment);
  } catch (error) {
    if (error instanceof BedUnavailableError) {
      res.status(409).json({ error: error.message, code: 'bed_unavailable' });
      return;
    }
    if (error instanceof BedOverlapError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof PatientOverlapError) {
      res.status(409).json({ error: error.message, code: 'patient_assignment_overlap' });
      return;
    }
    console.error('POST /patients/:patientId/room-assignments error:', error);
    res.status(500).json({ error: 'Errore durante creazione assegnazione stanza' });
  }
});

// PUT /patients/:patientId/room-assignments/:assignmentId
patientAssignmentRouter.put('/:patientId/room-assignments/:assignmentId', async (req, res) => {
  const { patientId, assignmentId } = req.params;
  const input = parseAssignmentUpdate(req.body);
  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }
  const body = input.value;

  try {
    const lockTarget = await prisma.patientRoomAssignment.findFirst({
      where: { id: assignmentId, patientId },
      select: { bedId: true, roomId: true },
    });
    if (!lockTarget) {
      res.status(404).json({ error: 'Assegnazione non trovata' });
      return;
    }

    const assignment = await prisma.$transaction(async (tx) => {
      for (const lockKey of assignmentLockKeys(patientId, lockTarget.bedId, lockTarget.roomId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }

      // Re-read after acquiring both locks: a concurrent POST may have closed this stay while
      // waiting, and the candidate interval must be based on the committed value.
      const existing = await tx.patientRoomAssignment.findFirst({
        where: { id: assignmentId, patientId },
      });
      if (!existing) return null;

      const candidateEndDate = body.endDate !== undefined ? body.endDate : existing.endDate;
      const range = validateDateRange(existing.startDate, candidateEndDate);
      if (!range.ok) throw new InvalidAssignmentRangeError(range.error);

      if (body.endDate !== undefined) {
        const candidates = await tx.patientRoomAssignment.findMany({
          where: {
            id: { not: assignmentId },
            AND: [
              { OR: [{ patientId }, { bedId: existing.bedId }] },
              assignmentOverlapFilter(existing.startDate, candidateEndDate),
            ],
          },
          select: { patientId: true, bedId: true },
        });
        if (candidates.some((candidate) => candidate.patientId === patientId)) {
          throw new PatientOverlapError('Il paziente ha già un’assegnazione nel periodo indicato');
        }
        if (candidates.some((candidate) => candidate.bedId === existing.bedId)) {
          throw new BedOverlapError('Il letto è già occupato nel periodo indicato');
        }
      }

      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) updates[key] = value;
      }

      return tx.patientRoomAssignment.update({
        where: { id: assignmentId },
        data: updates,
        select: PATIENT_ROOM_ASSIGNMENT_READ_SELECT,
      });
    });
    if (!assignment) {
      res.status(404).json({ error: 'Assegnazione non trovata' });
      return;
    }

    console.log(`PUT /patients/${patientId}/room-assignments/${assignmentId} → updated`);
    res.status(200).json(assignment);
  } catch (error) {
    if (error instanceof InvalidAssignmentRangeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof BedOverlapError) {
      res.status(409).json({ error: error.message, code: 'bed_overlap' });
      return;
    }
    if (error instanceof PatientOverlapError) {
      res.status(409).json({ error: error.message, code: 'patient_assignment_overlap' });
      return;
    }
    console.error('PUT /patients/:patientId/room-assignments/:assignmentId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento assegnazione' });
  }
});

// DELETE /patients/:patientId/room-assignments/:assignmentId
patientAssignmentRouter.delete('/:patientId/room-assignments/:assignmentId', async (req, res) => {
  const { patientId, assignmentId } = req.params;

  try {
    const lockTarget = await prisma.patientRoomAssignment.findFirst({
      where: { id: assignmentId, patientId },
      select: { bedId: true, roomId: true },
    });
    if (!lockTarget) {
      res.status(404).json({ error: 'Assegnazione non trovata' });
      return;
    }

    const deleted = await prisma.$transaction(async (tx) => {
      // Room → bed → patient is the same deterministic order used by create/update. It also
      // serializes this delete with cascading room/bed deletion, so a concurrent cascade becomes
      // an idempotent not-found result instead of a Prisma P2025 surfaced as HTTP 500.
      for (const lockKey of assignmentLockKeys(patientId, lockTarget.bedId, lockTarget.roomId)) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }

      const existing = await tx.patientRoomAssignment.findFirst({
        where: { id: assignmentId, patientId },
        select: { id: true },
      });
      if (!existing) return false;

      // `deleteMany` keeps the endpoint race-safe even against a cascade outside this advisory
      // lock protocol (for example a separately authorized patient removal between read/delete).
      const result = await tx.patientRoomAssignment.deleteMany({
        where: { id: assignmentId, patientId },
      });
      return result.count === 1;
    });
    if (!deleted) {
      res.status(404).json({ error: 'Assegnazione non trovata' });
      return;
    }

    console.log(`DELETE /patients/${patientId}/room-assignments/${assignmentId} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /patients/:patientId/room-assignments/:assignmentId error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione assegnazione' });
  }
});

export { adminRouter, patientAssignmentRouter };
export default adminRouter;
