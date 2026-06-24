import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import {
  normalizeSchedules,
  deriveLegacyFromSchedules,
  scheduleDoseShort,
  type ScheduleInput,
} from '../lib/therapy-dose.js';

const router = Router();

// Build a legacy `dosaggio` summary string from structured data, used when the caller
// doesn't pass an explicit dosaggio (keeps backward-compat displays populated).
function deriveDosaggio(
  explicit: string | undefined,
  strengthValue: number | null,
  strengthUnit: string | null,
  form: string | null,
): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const parts: string[] = [];
  if (strengthValue != null && strengthUnit) parts.push(`${strengthValue} ${strengthUnit}`);
  if (form) parts.push(form);
  return parts.join(' ').trim() || '—';
}

// GET /patients/:patientId/therapies  (includes structured schedules)
router.get('/:patientId/therapies', async (req, res) => {
  const { patientId } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    const therapies = await prisma.patientTherapy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { schedules: { orderBy: { time: 'asc' } } },
    });
    res.status(200).json(therapies);
  } catch (error) {
    console.error('GET /patients/:patientId/therapies error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle terapie' });
  }
});

// POST /patients/:patientId/therapies
router.post('/:patientId/therapies', async (req, res) => {
  const { patientId } = req.params;
  const body = req.body as Record<string, unknown>;

  const farmacoNome = typeof body.farmacoNome === 'string' ? body.farmacoNome.trim() : '';
  const dataInizio = typeof body.dataInizio === 'string' ? body.dataInizio : '';
  const schedules: ScheduleInput[] = normalizeSchedules(body.schedules);

  // dosaggio is no longer strictly required when structured strength is provided
  const strengthValue = body.commercialStrengthValue != null && body.commercialStrengthValue !== ''
    ? Number(body.commercialStrengthValue) : null;
  const strengthUnit = typeof body.commercialStrengthUnit === 'string' && body.commercialStrengthUnit.trim()
    ? body.commercialStrengthUnit.trim() : null;
  const form = typeof body.pharmaceuticalForm === 'string' && body.pharmaceuticalForm.trim()
    ? body.pharmaceuticalForm.trim() : null;
  const dosaggio = deriveDosaggio(body.dosaggio as string | undefined, strengthValue, strengthUnit, form);

  if (!farmacoNome || !dataInizio) {
    res.status(400).json({ error: 'Campi obbligatori: farmacoNome, dataInizio' });
    return;
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    // Derive legacy fascia/orari from structured schedules (keeps slot pipeline working).
    // When no schedules are supplied, fall back to legacy boolean flags from the body.
    const derived = schedules.length
      ? deriveLegacyFromSchedules(schedules)
      : {
          fasceMattina: (body.fasceMattina as boolean) ?? true,
          fascePranzo: (body.fascePranzo as boolean) ?? false,
          fascePomeriggio: (body.fascePomeriggio as boolean) ?? false,
          fasceSera: (body.fasceSera as boolean) ?? false,
          fasceNotte: (body.fasceNotte as boolean) ?? false,
          orarioSpecifico: (body.orarioSpecifico as string) || null,
        };

    const therapy = await prisma.patientTherapy.create({
      data: {
        patientId,
        farmacoNome,
        dosaggio,
        viaSomministrazione: (body.viaSomministrazione as string) || 'orale',
        tipo: (body.tipo as string) || 'periodica',
        stato: (body.stato as string) || 'attiva',
        dataInizio,
        dataFine: (body.dataFine as string) || null,
        fasceMattina: derived.fasceMattina,
        fascePranzo: derived.fascePranzo,
        fascePomeriggio: derived.fascePomeriggio,
        fasceSera: derived.fasceSera,
        fasceNotte: derived.fasceNotte,
        orarioSpecifico: derived.orarioSpecifico,
        prescrittore: (body.prescrittore as string) || null,
        operatoreInseritore: (body.operatoreInseritore as string) || null,
        note: (body.note as string) || null,
        dataSomministrazione: (body.dataSomministrazione as string) || null,
        orarioSomministrazione: (body.orarioSomministrazione as string) || null,
        commercialStrengthValue: strengthValue,
        commercialStrengthUnit: strengthUnit,
        pharmaceuticalForm: form,
        allowedFractions: typeof body.allowedFractions === 'string' && body.allowedFractions.trim()
          ? body.allowedFractions.trim() : null,
        drugPackageRef: typeof body.drugPackageRef === 'string' && body.drugPackageRef.trim()
          ? body.drugPackageRef.trim() : null,
        schedules: schedules.length ? { create: schedules } : undefined,
      },
      include: { schedules: { orderBy: { time: 'asc' } } },
    });

    console.log(`POST /patients/${patientId}/therapies → created id=${therapy.id} (${schedules.length} schedules)`);
    res.status(201).json(therapy);
  } catch (error) {
    console.error('POST /patients/:patientId/therapies error:', error);
    res.status(500).json({ error: 'Errore durante creazione terapia' });
  }
});

// PUT /patients/:patientId/therapies/:therapyId
router.put('/:patientId/therapies/:therapyId', async (req, res) => {
  const { patientId, therapyId } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    const existing = await prisma.patientTherapy.findFirst({
      where: { id: therapyId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Terapia non trovata' });
      return;
    }

    const scalarAllowed = [
      'farmacoNome', 'dosaggio', 'viaSomministrazione', 'tipo', 'stato',
      'dataInizio', 'dataFine', 'fasceMattina', 'fascePranzo', 'fascePomeriggio',
      'fasceSera', 'fasceNotte', 'orarioSpecifico', 'prescrittore',
      'operatoreInseritore', 'note', 'dataSomministrazione', 'orarioSomministrazione',
      'commercialStrengthValue', 'commercialStrengthUnit', 'pharmaceuticalForm',
      'allowedFractions', 'drugPackageRef',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of scalarAllowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (updates.commercialStrengthValue === '' ) updates.commercialStrengthValue = null;
    if (updates.commercialStrengthValue != null) updates.commercialStrengthValue = Number(updates.commercialStrengthValue);

    // If schedules are provided, replace them atomically and re-derive legacy fascia/orari.
    const hasSchedules = body.schedules !== undefined;
    const schedules: ScheduleInput[] = hasSchedules ? normalizeSchedules(body.schedules) : [];

    const therapy = await prisma.$transaction(async (tx) => {
      if (hasSchedules) {
        await tx.therapySchedule.deleteMany({ where: { therapyId } });
        if (schedules.length) {
          await tx.therapySchedule.createMany({
            data: schedules.map(s => ({ ...s, therapyId })),
          });
          const derived = deriveLegacyFromSchedules(schedules);
          updates.fasceMattina = derived.fasceMattina;
          updates.fascePranzo = derived.fascePranzo;
          updates.fascePomeriggio = derived.fascePomeriggio;
          updates.fasceSera = derived.fasceSera;
          updates.fasceNotte = derived.fasceNotte;
          updates.orarioSpecifico = derived.orarioSpecifico;
        }
      }
      return tx.patientTherapy.update({
        where: { id: therapyId },
        data: updates,
        include: { schedules: { orderBy: { time: 'asc' } } },
      });
    });

    console.log(`PUT /patients/${patientId}/therapies/${therapyId} → updated (${hasSchedules ? schedules.length + ' schedules' : 'scalars only'})`);
    res.status(200).json(therapy);
  } catch (error) {
    console.error('PUT /patients/:patientId/therapies/:therapyId error:', error);
    res.status(500).json({ error: 'Errore durante aggiornamento terapia' });
  }
});

// DELETE /patients/:patientId/therapies/:therapyId
router.delete('/:patientId/therapies/:therapyId', async (req, res) => {
  const { patientId, therapyId } = req.params;

  try {
    const existing = await prisma.patientTherapy.findFirst({
      where: { id: therapyId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Terapia non trovata' });
      return;
    }

    await prisma.patientTherapy.delete({ where: { id: therapyId } });
    console.log(`DELETE /patients/${patientId}/therapies/${therapyId} → deleted`);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /patients/:patientId/therapies/:therapyId error:', error);
    res.status(500).json({ error: 'Errore durante eliminazione terapia' });
  }
});

// GET /patients/:patientId/medication-administrations
router.get('/:patientId/medication-administrations', async (req, res) => {
  const { patientId } = req.params;
  const date = req.query.date as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const where: { patientId: string; date?: string } = { patientId };
    if (date) where.date = date;

    const administrations = await prisma.medicationAdministration.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    res.status(200).json(administrations);
  } catch (error) {
    console.error('GET /patients/:patientId/medication-administrations error:', error);
    res.status(500).json({ error: 'Errore nel recupero storico somministrazioni' });
  }
});

export { scheduleDoseShort };
export default router;
