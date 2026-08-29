import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import {
  assertValidSchedulesInput,
  normalizeTherapyDateRange,
  normalizeSchedules,
  deriveLegacyFromSchedules,
  InvalidTherapySchedulesError,
  TherapyDateRangeError,
  scheduleDoseShort,
  type ScheduleInput,
} from '../lib/therapy-dose.js';
import {
  createTherapyInTx,
  normalizeGiorniSettimana,
  type TherapyCreateInput,
} from '../therapies/therapy-create.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import {
  MedicationAdministrationQueryError,
  parseMedicationAdministrationQuery,
} from '../therapies/administration-query.js';
import {
  encodeTherapyListCursor,
  parseTherapyListQuery,
  TherapyListInputError,
} from '../therapies/list-query.js';
import { assertTherapyScalarInput, TherapyInputError } from '../therapies/input-validation.js';

const router = Router();

// Gate minimo (header-based, non IdP): le terapie e somministrazioni sono dati clinici
// paziente reali, richiedono un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);
router.use('/:patientId/therapies', requirePatientScope);
router.use('/:patientId/medication-administrations', requirePatientScope);

const therapyListSelect = {
  id: true,
  patientId: true,
  farmacoNome: true,
  dosaggio: true,
  viaSomministrazione: true,
  tipo: true,
  stato: true,
  dataInizio: true,
  dataFine: true,
  fasceMattina: true,
  fascePranzo: true,
  fascePomeriggio: true,
  fasceSera: true,
  fasceNotte: true,
  orarioSpecifico: true,
  prescrittore: true,
  operatoreInseritore: true,
  note: true,
  dataSomministrazione: true,
  orarioSomministrazione: true,
  commercialStrengthValue: true,
  commercialStrengthUnit: true,
  pharmaceuticalForm: true,
  allowedFractions: true,
  drugPackageRef: true,
  giorniSettimana: true,
  createdAt: true,
  updatedAt: true,
  schedules: {
    orderBy: [{ time: 'asc' }, { id: 'asc' }],
    take: 33,
    select: {
      id: true,
      therapyId: true,
      time: true,
      fascia: true,
      quantityNumerator: true,
      quantityDenominator: true,
      administrationUnit: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.PatientTherapySelect;

function hasOversizedScheduleSet(items: Array<{ schedules: unknown[] }>): boolean {
  return items.some((item) => item.schedules.length > 32);
}

// GET /patients/:patientId/therapies/page
// Bounded keyset feed used by every first-party UI consumer.
router.get('/:patientId/therapies/page', async (req, res) => {
  const { patientId } = req.params;
  try {
    const input = parseTherapyListQuery(req.query as Record<string, unknown>);
    const where: Prisma.PatientTherapyWhereInput[] = [{ patientId }];
    if (input.status === 'attiva') where.push({ stato: 'attiva' });
    if (input.status === 'non_attiva') where.push({ stato: { not: 'attiva' } });
    if (input.cursor) {
      where.push({
        OR: [
          { createdAt: { lt: input.cursor.createdAt } },
          { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } },
        ],
      });
    }

    const [rows, groupedCounts] = await Promise.all([
      prisma.patientTherapy.findMany({
        where: { AND: where },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: input.limit + 1,
        select: therapyListSelect,
      }),
      input.cursor
        ? Promise.resolve(null)
        : prisma.patientTherapy.groupBy({
            by: ['stato'],
            where: { patientId },
            _count: { _all: true },
          }),
    ]);
    if (hasOversizedScheduleSet(rows)) {
      res.status(409).json({ error: 'Terapia con oltre 32 orari: correggere il dato sorgente' });
      return;
    }

    const hasMore = rows.length > input.limit;
    const items = hasMore ? rows.slice(0, input.limit) : rows;
    const last = items.at(-1);
    const summary = groupedCounts
      ? groupedCounts.reduce(
          (counts, row) => {
            counts.total += row._count._all;
            if (row.stato === 'attiva') counts.active += row._count._all;
            else counts.inactive += row._count._all;
            return counts;
          },
          { total: 0, active: 0, inactive: 0 },
        )
      : null;
    res.status(200).json({
      items,
      summary,
      pageInfo: {
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeTherapyListCursor({ createdAt: last.createdAt, id: last.id }, input.status)
            : null,
      },
    });
  } catch (error) {
    if (error instanceof TherapyListInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /patients/:patientId/therapies/page error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle terapie' });
  }
});

// GET /patients/:patientId/therapies
// Compatibility path: bounded and explicit when a legacy consumer would lose rows.
router.get('/:patientId/therapies', async (req, res) => {
  const { patientId } = req.params;
  try {
    const therapies = await prisma.patientTherapy.findMany({
      where: { patientId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 101,
      select: therapyListSelect,
    });
    if (therapies.length > 100) {
      res.status(409).json({
        error: 'Elenco oltre il limite legacy: usare /therapies/page',
      });
      return;
    }
    if (hasOversizedScheduleSet(therapies)) {
      res.status(409).json({ error: 'Terapia con oltre 32 orari: correggere il dato sorgente' });
      return;
    }
    res.status(200).json(therapies);
  } catch (error) {
    console.error('GET /patients/:patientId/therapies error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle terapie' });
  }
});

// POST /patients/:patientId/therapies
router.post('/:patientId/therapies', async (req, res) => {
  const { patientId } = req.params;
  const actor = (req as AuthedRequest).operator!;
  const body = {
    ...(req.body as TherapyCreateInput),
    operatoreInseritore: actor.name || actor.id,
  };

  // Patient existence/scope is verified by middleware before this handler.
  const farmacoNome = typeof body.farmacoNome === 'string' ? body.farmacoNome.trim() : '';
  const dataInizio = typeof body.dataInizio === 'string' ? body.dataInizio : '';
  if (!farmacoNome || !dataInizio) {
    res.status(400).json({ error: 'Campi obbligatori: farmacoNome, dataInizio' });
    return;
  }

  try {
    const therapy = await prisma.$transaction((tx) => createTherapyInTx(tx, patientId, body));

    console.log(
      `POST /patients/${patientId}/therapies → created id=${therapy.id} (${therapy.schedules.length} schedules)`,
    );
    res.status(201).json(therapy);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (
      msg.includes('Campi obbligatori') ||
      error instanceof TherapyInputError ||
      error instanceof InvalidTherapySchedulesError ||
      error instanceof TherapyDateRangeError
    ) {
      res.status(400).json({ error: msg });
      return;
    }
    console.error('POST /patients/:patientId/therapies error:', error);
    res.status(500).json({ error: 'Errore durante creazione terapia' });
  }
});

// PUT /patients/:patientId/therapies/:therapyId
router.put('/:patientId/therapies/:therapyId', async (req, res) => {
  const { patientId, therapyId } = req.params;
  const body = req.body as Record<string, unknown>;

  try {
    assertTherapyScalarInput(body);
    const existing = await prisma.patientTherapy.findFirst({
      where: { id: therapyId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Terapia non trovata' });
      return;
    }

    const scalarAllowed = [
      'farmacoNome',
      'dosaggio',
      'viaSomministrazione',
      'tipo',
      'stato',
      'dataInizio',
      'dataFine',
      'fasceMattina',
      'fascePranzo',
      'fascePomeriggio',
      'fasceSera',
      'fasceNotte',
      'orarioSpecifico',
      'prescrittore',
      'note',
      'dataSomministrazione',
      'orarioSomministrazione',
      'commercialStrengthValue',
      'commercialStrengthUnit',
      'pharmaceuticalForm',
      'allowedFractions',
      'drugPackageRef',
      'giorniSettimana',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of scalarAllowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (updates.commercialStrengthValue === '') updates.commercialStrengthValue = null;
    if (updates.dataFine === '') updates.dataFine = null;
    if (updates.commercialStrengthValue != null)
      updates.commercialStrengthValue = Number(updates.commercialStrengthValue);
    // #241: PUT must canonicalize giorniSettimana exactly like POST (createTherapyInTx), otherwise
    // non-canonical/invalid CSV (duplicates, unsorted, non-collapsed "every day") can persist and
    // silently suppress a therapy from days it should appear on.
    if ('giorniSettimana' in updates) {
      updates.giorniSettimana = normalizeGiorniSettimana(updates.giorniSettimana as string | null);
    }
    if ('dataInizio' in updates || 'dataFine' in updates) {
      const dates = normalizeTherapyDateRange(
        updates.dataInizio ?? existing.dataInizio,
        'dataFine' in updates ? updates.dataFine : existing.dataFine,
      );
      updates.dataInizio = dates.dataInizio;
      updates.dataFine = dates.dataFine;
    }

    // If schedules are provided, replace them atomically and re-derive legacy fascia/orari.
    const hasSchedules = body.schedules !== undefined;
    if (hasSchedules) assertValidSchedulesInput(body.schedules);
    const schedules: ScheduleInput[] = hasSchedules ? normalizeSchedules(body.schedules) : [];

    const therapy = await prisma.$transaction(async (tx) => {
      if (hasSchedules) {
        await tx.therapySchedule.deleteMany({ where: { therapyId } });
        if (schedules.length) {
          await tx.therapySchedule.createMany({
            data: schedules.map((s) => ({ ...s, therapyId })),
          });
        }
        const derived = deriveLegacyFromSchedules(schedules);
        updates.fasceMattina = derived.fasceMattina;
        updates.fascePranzo = derived.fascePranzo;
        updates.fascePomeriggio = derived.fascePomeriggio;
        updates.fasceSera = derived.fasceSera;
        updates.fasceNotte = derived.fasceNotte;
        updates.orarioSpecifico = derived.orarioSpecifico;
      }
      return tx.patientTherapy.update({
        where: { id: therapyId },
        data: updates,
        include: { schedules: { orderBy: { time: 'asc' } } },
      });
    });

    console.log(
      `PUT /patients/${patientId}/therapies/${therapyId} → updated (${hasSchedules ? schedules.length + ' schedules' : 'scalars only'})`,
    );
    res.status(200).json(therapy);
  } catch (error) {
    if (
      error instanceof TherapyInputError ||
      error instanceof InvalidTherapySchedulesError ||
      error instanceof TherapyDateRangeError
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
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
  let input;
  try {
    input = parseMedicationAdministrationQuery(req.query);
  } catch (error) {
    if (error instanceof MedicationAdministrationQueryError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
  const { date, limit } = input;

  try {
    const where: { patientId: string; date?: string } = { patientId };
    if (date) where.date = date;

    const administrations = await prisma.medicationAdministration.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
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
