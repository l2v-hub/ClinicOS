import { Router, type Response } from 'express';
import { requireOperator, type AuthedRequest, type Operator } from '../ai/auth.js';
import {
  buildTherapySlotPage,
  buildTherapySlots,
  TherapySlotCapacityError,
} from '../therapies/therapy-slots.js';
import { AppointmentListInputError, parseIsoCalendarDate } from '../appointments/list-query.js';
import {
  TherapyNotDueError,
  TherapyNotFoundError,
  TherapyWriteInputError,
} from '../therapies/therapy-write.js';
import { hasFacilityPatientScope } from '../patients/patient-scope.js';
import {
  parseTherapySlotPageQuery,
  TherapySlotPageInputError,
} from '../therapies/slot-page-query.js';
import { RosterError } from '../roster/order-contract.js';
import {
  isConcurrentWriteConflict,
  recordTherapyAdministration,
  TherapyAlreadyAdministeredError,
} from '../therapies/administration-record.js';
import {
  listPrnAdministrations,
  PrnIdempotencyConflictError,
  recordPrnAdministration,
} from '../therapies/prn-administration.js';
import { authzOf } from '../authz/request-context.js';
import { facilityToday } from '../patients/parameter-reading-input.js';

const router = Router();

// Gate minimo (header-based, non IdP): gli slot terapia espongono nominativi paziente e
// farmaci somministrati, richiedono un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);

/** Therapy-slot patient filter for an operator (exported for the Tool Layer; same derivation). */
export function therapySlotPatientAccess(actor: Operator) {
  return {
    ...(!hasFacilityPatientScope(actor.role) && { registeredById: actor.id }),
  };
}

function patientAccess(req: AuthedRequest) {
  return therapySlotPatientAccess(req.operator!);
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
    const input = parseTherapySlotPageQuery(req.query as Record<string, unknown>);
    const page = await buildTherapySlotPage(date, access, input, (req as AuthedRequest).operator!);
    res.status(200).json({
      slots: page.slots,
      roster: page.roster,
      pageInfo: {
        hasMore: page.pageInfo.hasMore,
        nextCursor: page.pageInfo.nextCursor ?? null,
        loadedTherapies: page.pageInfo.loadedTherapies,
        completeness: page.pageInfo.hasMore ? 'partial' : 'complete',
        summaryExact: !input.cursor,
      },
    });
  } catch (error) {
    if (error instanceof RosterError) {
      res
        .status(error.status)
        .json({ error: error.message, code: error.code, reason: error.reason });
      return;
    }
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

// Owner decision 2026-10-03: a role whose policy effect is ALLOWED_WITH_CONFIRMATION (supervisor
// on the administration capabilities) must confirm explicitly. The app shows a ConfirmDialog and
// then sends `confirmed: true`; without it the server refuses (428). Roles with plain ALLOWED
// (nurse) are unchanged: the flag is accepted and ignored. Returns the body without the flag.
export const CONFIRMATION_REQUIRED_CODE = 'confirmation_required';
function takeConfirmation(
  req: AuthedRequest,
  res: Response,
  capabilityId: string,
): { ok: true; body: unknown } | { ok: false } {
  const raw = req.body;
  let confirmed = false;
  let body: unknown = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'confirmed' in raw) {
    const { confirmed: flag, ...rest } = raw as Record<string, unknown>;
    if (flag !== undefined && typeof flag !== 'boolean') {
      res.status(400).json({ error: 'confirmed non valido' });
      return { ok: false };
    }
    confirmed = flag === true;
    body = rest;
  }
  if (authzOf(req)?.can(capabilityId).requiresConfirmation && !confirmed) {
    res.status(428).json({
      error: 'Il tuo ruolo richiede una conferma esplicita prima di registrare la somministrazione',
      code: CONFIRMATION_REQUIRED_CODE,
      capability: capabilityId,
    });
    return { ok: false };
  }
  return { ok: true, body };
}

// POST /therapy-slots/confirm
// Actor identity always comes from req.operator; client-supplied actor fields are ignored.
// `therapyId` is mandatory; drug/dose/route/time are resolved from the prescription server-side.
// The Serializable upsert lives in therapies/administration-record.ts (shared with the Tool Layer).
router.post('/confirm', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    const taken = takeConfirmation(req as AuthedRequest, res, 'administration.confirm');
    if (!taken.ok) return;
    const record = await recordTherapyAdministration(taken.body, actor, { notAdministered: false });

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
    const actor = (req as AuthedRequest).operator!;
    const taken = takeConfirmation(
      req as AuthedRequest,
      res,
      'administration.record_not_administered',
    );
    if (!taken.ok) return;
    const record = await recordTherapyAdministration(taken.body, actor, { notAdministered: true });

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

// GET /therapy-slots/prn?patientId=…&date=YYYY-MM-DD — PRN («al bisogno») doses of one patient
// on one facility day (default: today). Same patient scope as the slot reads.
router.get('/prn', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(patientId)) {
      res.status(400).json({ error: 'patientId obbligatorio' });
      return;
    }
    const date =
      typeof req.query.date === 'string' && req.query.date
        ? parseIsoCalendarDate(req.query.date, 'date')
        : facilityToday();
    res.status(200).json({ date, items: await listPrnAdministrations(patientId, date, actor) });
  } catch (error) {
    if (error instanceof AppointmentListInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    // Never the whole error: a DB validation message could echo the clinical indication.
    console.error(
      'GET /therapy-slots/prn error:',
      (error as { code?: string })?.code ?? (error instanceof Error ? error.name : 'unknown'),
    );
    res.status(500).json({ error: 'Errore nel recupero delle somministrazioni al bisogno' });
  }
});

// POST /therapy-slots/prn — records one PRN dose now (capability administration.confirm).
// Body: {patientId, therapyId, indicazione, note?, requestId, confirmed?}. Drug, dose, route and
// time come from the prescription and the server clock; actor from the session. A retry with the
// same requestId replays the first record (200 + Idempotent-Replayed) instead of a second dose.
router.post('/prn', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    const taken = takeConfirmation(req as AuthedRequest, res, 'administration.confirm');
    if (!taken.ok) return;
    const { record, replayed } = await recordPrnAdministration(taken.body, actor);
    if (replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(replayed ? 200 : 201).json(record);
  } catch (error) {
    if (error instanceof TherapyWriteInputError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof PrnIdempotencyConflictError) {
      res.status(409).json({ error: error.message, code: 'idempotency_conflict' });
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
    if (isConcurrentWriteConflict(error)) {
      res.status(409).json({ error: 'Conflitto concorrente: ricaricare e riprovare' });
      return;
    }
    // Never the whole error: a DB validation message could echo the clinical indication.
    console.error(
      'POST /therapy-slots/prn error:',
      (error as { code?: string })?.code ?? (error instanceof Error ? error.name : 'unknown'),
    );
    res
      .status(500)
      .json({ error: 'Errore durante la registrazione della somministrazione al bisogno' });
  }
});

export default router;
