// Turni operatori persistiti (Agnos KB, decisione 2026-07-10). Sostituisce MOCK_SCHEDULES
// lato frontend; `onDuty`/`weekdayIt` sono riusati dall'intent Agnos operators_on_duty (Task 4).
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export interface ShiftRow { operatoreId: string; operatoreNome: string; giorno: string; oraInizio: string; oraFine: string; disponibile: boolean }
const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const weekdayIt = (isoDay: string): string => GIORNI[new Date(`${isoDay}T12:00:00.000Z`).getUTCDay()];
export const onDuty = (shifts: ShiftRow[], giorno: string): ShiftRow[] =>
  shifts.filter((s) => s.giorno === giorno && s.disponibile);

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await prisma.operatorShift.findMany({ orderBy: [{ operatoreNome: 'asc' }, { giorno: 'asc' }] });
    res.json({ shifts: rows });
  } catch {
    res.status(500).json({ error: 'Errore nel recupero dei turni' });
  }
});

// PUT idempotente: upsert dell'intera settimana di UN operatore (payload dalla UI OperatorSchedule).
router.put('/:operatoreId', async (req, res) => {
  const { operatoreId } = req.params;
  const { operatoreNome, turni } = req.body as { operatoreNome: string;
    turni: Array<{ giorno: string; oraInizio?: string; oraFine?: string; disponibile: boolean }> };
  if (!operatoreNome || !Array.isArray(turni)) { res.status(400).json({ error: 'operatoreNome e turni richiesti' }); return; }
  for (const t of turni) {
    if (!GIORNI.includes(t.giorno)) { res.status(400).json({ error: `giorno non valido: ${t.giorno}` }); return; }
  }
  try {
    for (const t of turni) {
      await prisma.operatorShift.upsert({
        where: { operatoreId_giorno: { operatoreId, giorno: t.giorno } },
        update: { operatoreNome, oraInizio: t.oraInizio ?? '08:00', oraFine: t.oraFine ?? '20:00', disponibile: t.disponibile },
        create: { operatoreId, operatoreNome, giorno: t.giorno, oraInizio: t.oraInizio ?? '08:00', oraFine: t.oraFine ?? '20:00', disponibile: t.disponibile },
      });
    }
    const rows = await prisma.operatorShift.findMany({ where: { operatoreId } });
    res.json({ shifts: rows });
  } catch {
    res.status(500).json({ error: 'Errore nel salvataggio dei turni' });
  }
});

export default router;
