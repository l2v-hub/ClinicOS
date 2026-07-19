import { prisma } from '../lib/prisma.js';
import { Router } from 'express';

const adminRouter = Router();
const patientAssignmentRouter = Router();

// ── Helper: check if two date ranges overlap ──────────────────────────────
// endDate null means "infinity"
function rangesOverlap(s1: string, e1: string | null, s2: string, e2: string | null): boolean {
  // s1 <= e2 (or e2 is null) AND s2 <= e1 (or e1 is null)
  const startBeforeEnd2 = e2 === null || s1 <= e2;
  const startBeforeEnd1 = e1 === null || s2 <= e1;
  return startBeforeEnd2 && startBeforeEnd1;
}

// ── Helper: active assignment filter (endDate is null or >= today) ─────────
function activeAssignmentFilter() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    OR: [{ endDate: null }, { endDate: { gte: today } }],
  };
}

// ── Helper: beds include with current assignments ─────────────────────────
function bedsWithAssignments() {
  return {
    beds: {
      include: {
        assignments: {
          where: activeAssignmentFilter(),
          include: { patient: true },
        },
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROOMS CRUD — mounted at /admin/rooms
// ═══════════════════════════════════════════════════════════════════════════

// GET /admin/rooms/occupancy  (named route BEFORE parameterized)
adminRouter.get('/rooms/occupancy', async (_req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: bedsWithAssignments(),
    });

    let totalBeds = 0;
    let occupiedBeds = 0;
    let maintenanceBeds = 0;

    const roomSummaries = rooms.map((room) => {
      const bedSummaries = room.beds.map((bed) => {
        totalBeds++;
        const isOccupied = bed.assignments.length > 0;
        const isMaintenance = bed.stato === 'manutenzione';
        if (isOccupied) occupiedBeds++;
        if (isMaintenance) maintenanceBeds++;
        return {
          id: bed.id,
          label: bed.label,
          stato: bed.stato,
          occupied: isOccupied,
          currentAssignment: isOccupied ? bed.assignments[0] : null,
        };
      });
      return { ...room, beds: bedSummaries };
    });

    const freeBeds = totalBeds - occupiedBeds - maintenanceBeds;
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    res.status(200).json({
      totalRooms: rooms.length,
      totalBeds,
      occupiedBeds,
      freeBeds,
      maintenanceBeds,
      occupancyPct,
      rooms: roomSummaries,
    });
  } catch (error) {
    console.error('GET /admin/rooms/occupancy error:', error);
    res.status(500).json({ error: 'Errore nel recupero occupazione stanze' });
  }
});

// GET /admin/beds/available?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
adminRouter.get('/beds/available', async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  if (!startDate) {
    res.status(400).json({ error: 'Parametro startDate obbligatorio' });
    return;
  }

  const qEnd = endDate || null;

  try {
    const beds = await prisma.bed.findMany({
      where: { stato: { not: 'manutenzione' } },
      include: {
        room: true,
        assignments: true,
      },
    });

    const available = beds.filter((bed) => {
      const hasOverlap = bed.assignments.some((a) =>
        rangesOverlap(a.startDate, a.endDate, startDate, qEnd),
      );
      return !hasOverlap;
    });

    const result = available.map((bed) => ({
      id: bed.id,
      label: bed.label,
      stato: bed.stato,
      roomId: bed.roomId,
      room: bed.room,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('GET /admin/beds/available error:', error);
    res.status(500).json({ error: 'Errore nel recupero letti disponibili' });
  }
});

// GET /admin/rooms
adminRouter.get('/rooms', async (_req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: bedsWithAssignments(),
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
  const body = req.body as {
    numero?: string;
    tipo?: 'singola' | 'doppia' | 'altra';
    piano?: string;
    reparto?: string;
    stato?: 'attiva' | 'inattiva' | 'manutenzione';
    note?: string;
    numBeds?: number;
  };

  if (!body.numero) {
    res.status(400).json({ error: 'Campo obbligatorio: numero' });
    return;
  }

  const tipo = body.tipo || 'singola';
  let bedCount: number;
  if (tipo === 'singola') bedCount = 1;
  else if (tipo === 'doppia') bedCount = 2;
  else bedCount = body.numBeds ?? 1;

  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  try {
    const room = await prisma.room.create({
      data: {
        numero: body.numero,
        tipo,
        piano: body.piano || '',
        reparto: body.reparto || '',
        stato: body.stato || 'attiva',
        note: body.note || '',
        beds: {
          create: Array.from({ length: bedCount }, (_, i) => ({
            label: labels[i] || String(i + 1),
          })),
        },
      },
      include: bedsWithAssignments(),
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
      include: bedsWithAssignments(),
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
  const body = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        beds: {
          include: {
            assignments: { where: activeAssignmentFilter() },
          },
        },
      },
    });
    if (!existing) {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }

    // If tipo changes, check bed count compatibility
    if (body.tipo && body.tipo !== existing.tipo) {
      const newTipo = body.tipo as string;
      let maxBeds: number;
      if (newTipo === 'singola') maxBeds = 1;
      else if (newTipo === 'doppia') maxBeds = 2;
      else maxBeds = existing.beds.length; // altra: keep current

      if (maxBeds < existing.beds.length) {
        // Check if extra beds are unoccupied
        const sortedBeds = [...existing.beds].sort((a, b) => a.label.localeCompare(b.label));
        const bedsToRemove = sortedBeds.slice(maxBeds);
        const occupiedToRemove = bedsToRemove.filter((b) => b.assignments.length > 0);
        if (occupiedToRemove.length > 0) {
          res.status(409).json({
            error: 'Impossibile ridurre il tipo stanza: alcuni letti da rimuovere sono occupati',
          });
          return;
        }
        // Remove extra beds
        await prisma.bed.deleteMany({
          where: { id: { in: bedsToRemove.map((b) => b.id) } },
        });
      }
    }

    const allowed = ['numero', 'tipo', 'piano', 'reparto', 'stato', 'note'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updates,
      include: bedsWithAssignments(),
    });

    console.log(`PUT /admin/rooms/${roomId} → updated`);
    res.status(200).json(room);
  } catch (error) {
    console.error('PUT /admin/rooms/:roomId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento stanza' });
  }
});

// DELETE /admin/rooms/:roomId
adminRouter.delete('/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        beds: {
          include: {
            assignments: { where: activeAssignmentFilter() },
          },
        },
      },
    });
    if (!room) {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }

    const hasActiveAssignments = room.beds.some((b) => b.assignments.length > 0);
    if (hasActiveAssignments) {
      res.status(409).json({ error: 'Impossibile eliminare: la stanza ha assegnazioni attive' });
      return;
    }

    await prisma.room.delete({ where: { id: roomId } });
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
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }

    const beds = await prisma.bed.findMany({
      where: { roomId },
      include: {
        assignments: {
          where: activeAssignmentFilter(),
          include: { patient: true },
        },
      },
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
  const body = req.body as { label?: string; stato?: string; note?: string };

  if (!body.label) {
    res.status(400).json({ error: 'Campo obbligatorio: label' });
    return;
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      res.status(404).json({ error: 'Stanza non trovata' });
      return;
    }

    const bed = await prisma.bed.create({
      data: {
        roomId,
        label: body.label,
        stato: body.stato || 'libero',
        note: body.note || '',
      },
      include: {
        assignments: {
          where: activeAssignmentFilter(),
          include: { patient: true },
        },
      },
    });

    console.log(`POST /admin/rooms/${roomId}/beds → created id=${bed.id}`);
    res.status(201).json(bed);
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
  const body = req.body as Record<string, unknown>;

  try {
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        assignments: { where: activeAssignmentFilter() },
      },
    });
    if (!bed) {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }

    // Cannot set to manutenzione if currently occupied
    if (body.stato === 'manutenzione' && bed.assignments.length > 0) {
      res.status(409).json({ error: 'Impossibile impostare manutenzione: il letto è occupato' });
      return;
    }

    const allowed = ['label', 'stato', 'note'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const updated = await prisma.bed.update({
      where: { id: bedId },
      data: updates,
      include: {
        assignments: {
          where: activeAssignmentFilter(),
          include: { patient: true },
        },
      },
    });

    console.log(`PUT /admin/beds/${bedId} → updated`);
    res.status(200).json(updated);
  } catch (error) {
    console.error('PUT /admin/beds/:bedId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento letto' });
  }
});

// DELETE /admin/beds/:bedId
adminRouter.delete('/beds/:bedId', async (req, res) => {
  const { bedId } = req.params;

  try {
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        assignments: { where: activeAssignmentFilter() },
      },
    });
    if (!bed) {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }

    if (bed.assignments.length > 0) {
      res.status(409).json({ error: 'Impossibile eliminare: il letto ha assegnazioni attive' });
      return;
    }

    await prisma.bed.delete({ where: { id: bedId } });
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
patientAssignmentRouter.get('/:patientId/room-assignments', async (req, res) => {
  const { patientId } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const assignments = await prisma.patientRoomAssignment.findMany({
      where: { patientId },
      include: {
        bed: {
          include: { room: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    res.status(200).json(assignments);
  } catch (error) {
    console.error('GET /patients/:patientId/room-assignments error:', error);
    res.status(500).json({ error: 'Errore nel recupero assegnazioni stanza' });
  }
});

// POST /patients/:patientId/room-assignments
patientAssignmentRouter.post('/:patientId/room-assignments', async (req, res) => {
  const { patientId } = req.params;
  const body = req.body as {
    bedId?: string;
    startDate?: string;
    endDate?: string;
    note?: string;
    createdById?: string;
  };

  if (!body.bedId || !body.startDate) {
    res.status(400).json({ error: 'Campi obbligatori: bedId, startDate' });
    return;
  }

  try {
    // Validate patient
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    // Validate bed
    const bed = await prisma.bed.findUnique({
      where: { id: body.bedId },
      include: { room: true },
    });
    if (!bed) {
      res.status(404).json({ error: 'Letto non trovato' });
      return;
    }

    if (bed.stato === 'manutenzione') {
      res.status(409).json({ error: 'Il letto è in manutenzione' });
      return;
    }

    // Check for overlapping assignments on this bed
    const existingBedAssignments = await prisma.patientRoomAssignment.findMany({
      where: { bedId: body.bedId },
    });

    const hasOverlap = existingBedAssignments.some((a) =>
      rangesOverlap(a.startDate, a.endDate, body.startDate!, body.endDate || null),
    );
    if (hasOverlap) {
      res.status(409).json({ error: 'Il letto è già occupato nel periodo indicato' });
      return;
    }

    // Close patient's current active assignment if any
    const activeAssignment = await prisma.patientRoomAssignment.findFirst({
      where: { patientId, endDate: null },
    });
    if (activeAssignment) {
      await prisma.patientRoomAssignment.update({
        where: { id: activeAssignment.id },
        data: { endDate: body.startDate },
      });
    }

    const assignment = await prisma.patientRoomAssignment.create({
      data: {
        patientId,
        roomId: bed.roomId,
        bedId: body.bedId,
        startDate: body.startDate,
        endDate: body.endDate || null,
        note: body.note || '',
        createdById: body.createdById || null,
      },
      include: {
        bed: { include: { room: true } },
        patient: true,
      },
    });

    console.log(`POST /patients/${patientId}/room-assignments → created id=${assignment.id}`);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('POST /patients/:patientId/room-assignments error:', error);
    res.status(500).json({ error: 'Errore durante creazione assegnazione stanza' });
  }
});

// PUT /patients/:patientId/room-assignments/:assignmentId
patientAssignmentRouter.put('/:patientId/room-assignments/:assignmentId', async (req, res) => {
  const { patientId, assignmentId } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.patientRoomAssignment.findFirst({
      where: { id: assignmentId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Assegnazione non trovata' });
      return;
    }

    const allowed = ['endDate', 'note'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const assignment = await prisma.patientRoomAssignment.update({
      where: { id: assignmentId },
      data: updates,
      include: {
        bed: { include: { room: true } },
      },
    });

    console.log(`PUT /patients/${patientId}/room-assignments/${assignmentId} → updated`);
    res.status(200).json(assignment);
  } catch (error) {
    console.error('PUT /patients/:patientId/room-assignments/:assignmentId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento assegnazione' });
  }
});

// DELETE /patients/:patientId/room-assignments/:assignmentId
patientAssignmentRouter.delete('/:patientId/room-assignments/:assignmentId', async (req, res) => {
  const { patientId, assignmentId } = req.params;

  try {
    const existing = await prisma.patientRoomAssignment.findFirst({
      where: { id: assignmentId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Assegnazione non trovata' });
      return;
    }

    await prisma.patientRoomAssignment.delete({ where: { id: assignmentId } });
    console.log(`DELETE /patients/${patientId}/room-assignments/${assignmentId} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /patients/:patientId/room-assignments/:assignmentId error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione assegnazione' });
  }
});

export { adminRouter, patientAssignmentRouter };
export default adminRouter;
