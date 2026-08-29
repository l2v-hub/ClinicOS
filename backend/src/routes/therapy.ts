import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import {
  buildTherapySlotPage,
  buildTherapySlots,
  TherapySlotCapacityError,
} from '../therapies/therapy-slots.js';
import { AppointmentListInputError, parseIsoCalendarDate } from '../appointments/list-query.js';
import {
  parseTherapyAdministrationBody,
  resolveAuthoritativeTherapy,
  TherapyNotDueError,
  TherapyNotFoundError,
  TherapyWriteInputError,
} from '../therapies/therapy-write.js';
import { hasGlobalPatientScope } from '../patients/patient-scope.js';
import {
  encodeTherapySlotCursor,
  parseTherapySlotPageQuery,
  therapySlotScopeFingerprint,
  TherapySlotPageInputError,
} from '../therapies/slot-page-query.js';

const router = Router();

class TherapyAlreadyAdministeredError extends Error {}

function isConcurrentWriteConflict(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: string }).code === 'P2034',
  );
}

// Gate minimo (header-based, non IdP): gli slot terapia espongono nominativi paziente e
// farmaci somministrati, richiedono un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);

function patientAccess(req: AuthedRequest) {
  const actor = req.operator!;
  return {
    ...(!hasGlobalPatientScope(actor.role) && { registeredById: actor.id }),
  };
}

// GET /therapy-slots/page?date=YYYY-MM-DD&limit=100&cursor=...
// Exact summaries are constant-size; patient/administration details are cursor-paged.
router.get('/page', async (req, res) => {
  try {
    if (typeof req.query.date !== 'string' || !req.query.date) {
      throw new AppointmentListInputError('date obbligatoria');
    }
    const date = parseIsoCalendarDate(req.query.date, 'date');
    const access = patientAccess(req as AuthedRequest);
    const scope = therapySlotScopeFingerprint(access);
    const input = parseTherapySlotPageQuery(req.query as Record<string, unknown>, date, scope);
    const page = await buildTherapySlotPage(date, access, input);
    res.status(200).json({
      slots: page.slots,
      pageInfo: {
        hasMore: page.pageInfo.hasMore,
        nextCursor:
          page.pageInfo.hasMore && page.pageInfo.nextId
            ? encodeTherapySlotCursor(date, scope, page.pageInfo.nextId)
            : null,
        loadedTherapies: page.pageInfo.loadedTherapies,
        completeness: page.pageInfo.hasMore ? 'partial' : 'complete',
        summaryExact: !input.cursorId,
      },
    });
  } catch (error) {
    if (error instanceof AppointmentListInputError || error instanceof TherapySlotPageInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof TherapySlotCapacityError) {
      res.status(422).json({ error: error.message });
      return;
    }
    console.error('GET /therapy-slots/page error:', error);
    res.status(500).json({ error: 'Errore nel recupero della pagina terapie' });
  }
});

// GET /therapy-slots?date=YYYY-MM-DD
// Returns slots grouped by patient, sourced exclusively from PatientTherapy.
router.get('/', async (req, res) => {
  try {
    if (typeof req.query.date !== 'string' || !req.query.date) {
      throw new AppointmentListInputError('date obbligatoria');
    }
    const date = parseIsoCalendarDate(req.query.date, 'date');
    res.status(200).json(await buildTherapySlots(date, patientAccess(req as AuthedRequest)));
  } catch (error) {
    if (error instanceof AppointmentListInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof TherapySlotCapacityError) {
      res.status(422).json({ error: error.message });
      return;
    }
    console.error('GET /therapy-slots error:', error);
    res.status(500).json({ error: 'Errore nel recupero degli slot terapia' });
  }
});

// POST /therapy-slots/confirm
// Actor identity always comes from req.operator; client-supplied actor fields are ignored.
// `therapyId` is mandatory; drug/dose/route/time are resolved from the prescription server-side.
router.post('/confirm', async (req, res) => {
  try {
    const input = parseTherapyAdministrationBody(req.body, false);
    const actor = (req as AuthedRequest).operator!;
    const record = await prisma.$transaction(
      async (tx) => {
        const authoritative = await resolveAuthoritativeTherapy(tx, input, actor);
        const { therapyId, patientId, farmacoNome, farmacoDose, farmacoVia, date, fascia, ora } =
          authoritative;
        const existing = await tx.medicationAdministration.findUnique({
          where: { therapyId_date_fascia: { therapyId, date, fascia } },
        });
        if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
        return tx.medicationAdministration.upsert({
          where: { therapyId_date_fascia: { therapyId, date, fascia } },
          create: {
            therapyId,
            patientId,
            farmacoNome,
            farmacoDose: farmacoDose || '',
            farmacoVia: farmacoVia || 'orale',
            date,
            fascia,
            ora: ora || '',
            stato: 'erogata',
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            confirmedAt: new Date(),
          },
          update: {
            patientId,
            farmacoNome,
            farmacoDose,
            farmacoVia,
            ora,
            stato: 'erogata',
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            confirmedAt: new Date(),
            motivo: null,
            note: null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(200).json(record);
  } catch (error) {
    if (error instanceof TherapyWriteInputError || error instanceof AppointmentListInputError) {
      res
        .status(error instanceof TherapyWriteInputError ? error.status : 400)
        .json({ error: error.message });
      return;
    }
    if (error instanceof TherapyNotDueError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof TherapyNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof TherapyAlreadyAdministeredError) {
      res.status(409).json({ error: 'Terapia già erogata' });
      return;
    }
    if (isConcurrentWriteConflict(error)) {
      res.status(409).json({ error: 'Conflitto concorrente: ricaricare lo slot e riprovare' });
      return;
    }
    console.error('POST /therapy-slots/confirm error:', error);
    res.status(500).json({ error: 'Errore durante conferma somministrazione' });
  }
});

// POST /therapy-slots/not-administered
// Actor identity always comes from req.operator; client-supplied actor fields are ignored.
// `therapyId` is mandatory; only reason/note are accepted as clinical input from the client.
router.post('/not-administered', async (req, res) => {
  try {
    const input = parseTherapyAdministrationBody(req.body, true);
    const actor = (req as AuthedRequest).operator!;
    const record = await prisma.$transaction(
      async (tx) => {
        const authoritative = await resolveAuthoritativeTherapy(tx, input, actor);
        const {
          therapyId,
          patientId,
          farmacoNome,
          farmacoDose,
          farmacoVia,
          date,
          fascia,
          ora,
          motivo = '',
          note: noteText,
        } = authoritative;
        const existing = await tx.medicationAdministration.findUnique({
          where: { therapyId_date_fascia: { therapyId, date, fascia } },
          select: { stato: true },
        });
        if (existing?.stato === 'erogata') throw new TherapyAlreadyAdministeredError();
        return tx.medicationAdministration.upsert({
          where: { therapyId_date_fascia: { therapyId, date, fascia } },
          create: {
            therapyId,
            patientId,
            farmacoNome,
            farmacoDose: farmacoDose || '',
            farmacoVia: farmacoVia || 'orale',
            date,
            fascia,
            ora: ora || '',
            stato: 'non_erogata',
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            motivo,
            note: noteText || null,
          },
          update: {
            patientId,
            farmacoNome,
            farmacoDose,
            farmacoVia,
            ora,
            stato: 'non_erogata',
            motivo,
            note: noteText || null,
            operatoreId: actor.id,
            operatoreNome: actor.name || actor.id,
            confirmedAt: null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(200).json(record);
  } catch (error) {
    if (error instanceof TherapyWriteInputError || error instanceof AppointmentListInputError) {
      res
        .status(error instanceof TherapyWriteInputError ? error.status : 400)
        .json({ error: error.message });
      return;
    }
    if (error instanceof TherapyNotDueError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof TherapyNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof TherapyAlreadyAdministeredError) {
      res.status(409).json({ error: 'Terapia già erogata: stato non modificabile' });
      return;
    }
    if (isConcurrentWriteConflict(error)) {
      res.status(409).json({ error: 'Conflitto concorrente: ricaricare lo slot e riprovare' });
      return;
    }
    console.error('POST /therapy-slots/not-administered error:', error);
    res.status(500).json({ error: 'Errore durante registrazione non somministrazione' });
  }
});

export default router;
