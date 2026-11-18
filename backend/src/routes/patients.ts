import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { Router, type Response } from 'express';
import { isValidCodiceFiscale, normalizeCodiceFiscale } from '../lib/codice-fiscale.js';
import { validatePatientPhone } from '../lib/patient-phone.js';
import {
  optionalBirthDate,
  optionalFiscalCode,
  optionalPatientPhone,
  patientName,
  patientOptionalFields,
  PatientIdentityInputError,
} from '../patients/progressive-identity.js';
import { patientIntakeReviewRouter } from './patient-intake-review.js';
import { requireOperator, requireRole, type AuthedRequest } from '../ai/auth.js';
import { PatientPageInputError } from '../patients/pagination.js';
import { RosterError } from '../roster/order-contract.js';
import { loadPatientIdentityPage } from '../patients/identity-page.js';
import { PatientSummaryInputError } from '../patients/summary-query.js';
import { loadPatientParametersPage } from '../patients/parameters-page.js';
import { parameterReadingsRouter } from './patient-parameter-readings.js';
import {
  PatientParametersInputError,
  PatientParametersNotFoundError,
  savePatientParameterMonth,
} from '../patients/parameters-update.js';
import { requirePatientScope } from '../patients/access.js';
import { loadScopedPatientClinicalSummaries } from '../patients/clinical-summary-service.js';
import { CartellaUpdateError, saveCartella } from '../patients/cartella-update.js';
import { executeTemporaryPsExit, TemporaryPsExitError } from '../patients/temporary-ps-exits.js';
import { hasFacilityPatientScope } from '../patients/patient-scope.js';
import { DEMO_PATIENT_SECTIONS, seedFullDemoPatient } from '../synthetic/demo-patient.js';

const router = Router();

// Gate minimo (header-based, non IdP): dati anagrafici/clinici reali, richiedono un
// operatore identificato in lettura e scrittura. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);
router.use(parameterReadingsRouter);
router.use(patientIntakeReviewRouter);

async function sendPatientPage(
  req: AuthedRequest,
  res: Response,
  rawInput: Record<string, unknown>,
  routeLabel: string,
) {
  try {
    res.status(200).json(await loadPatientIdentityPage(rawInput, req.operator!));
  } catch (error) {
    if (error instanceof RosterError) {
      res
        .status(error.status)
        .json({ error: error.message, code: error.code, reason: error.reason });
      return;
    }
    if (error instanceof PatientPageInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(`${routeLabel} error:`, error);
    res.status(500).json({ error: 'Errore nel recupero della pagina pazienti' });
  }
}

// Contratto scalabile per tutti i consumer di elenco; il roster legacy e' dismesso sotto.
// Le ricerche testuali usano POST per evitare che identificativi personali finiscano in URL,
// cronologia e log infrastrutturali. GET resta per paginazione e filtri non identificativi.
router.get('/page', async (req, res) => {
  if (Object.prototype.hasOwnProperty.call(req.query, 'q')) {
    res.status(400).json({ error: 'Usa POST /patients/page/search per la ricerca testuale' });
    return;
  }
  await sendPatientPage(
    req as AuthedRequest,
    res,
    req.query as Record<string, unknown>,
    'GET /patients/page',
  );
});

router.post('/page/search', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'Payload ricerca non valido' });
    return;
  }
  const rawInput = req.body as Record<string, unknown>;
  if (typeof rawInput.q !== 'string' || !rawInput.q.trim()) {
    res.status(400).json({ error: 'q e obbligatorio per la ricerca testuale' });
    return;
  }
  await sendPatientPage(req as AuthedRequest, res, rawInput, 'POST /patients/page/search');
});

// Bounded projection for the multi-patient vital-sign editor. Unlike the legacy roster + one
// cartella request per patient, this returns at most 25 identities and only the JSON fields the
// screen renders. Its versioned cursor binds the parameters view and normalized filters.
router.get('/parameters/page', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    res
      .status(200)
      .json(await loadPatientParametersPage(req.query as Record<string, unknown>, actor));
  } catch (error) {
    if (error instanceof RosterError) {
      res
        .status(error.status)
        .json({ error: error.message, code: error.code, reason: error.reason });
      return;
    }
    if (error instanceof PatientPageInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /patients/parameters/page error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei parametri pazienti' });
  }
});

router.get('/', (_req, res) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Sat, 28 Nov 2026 00:00:00 GMT');
  res.status(410).json({ error: 'Endpoint dismesso: usa GET /patients/page' });
});

// GET /patients/settings — UI capability flags (e.g. whether delete is enabled).
// Defined BEFORE '/:id' so it is not captured as an id.
router.get('/settings', (_req, res) => {
  res.status(200).json({
    deleteEnabled: (process.env.ALLOW_PATIENT_DELETE ?? 'false').trim().toLowerCase() !== 'false',
  });
});

// Dashboard aggregate: one fixed-size response. The SQL evaluates JSONB in PostgreSQL instead
// of transferring every clinical record into Node. Defined BEFORE '/:id'.
router.get('/clinical-summary/overview', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    const scopeSql = hasFacilityPatientScope(actor.role)
      ? Prisma.empty
      : Prisma.sql`WHERE p."registeredById" = ${actor.id}`;
    const rows = await prisma.$queryRaw<
      Array<{
        totalPatients: number;
        critici: number;
        rischiAlti: number;
        ricoverati: number;
        dimessi: number;
        allergieGravi: number;
        terapieTotali: number;
        terapieCompletate: number;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalPatients",
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(c.data->'parametriVitali') = 'array'
              THEN c.data->'parametriVitali' ELSE '[]'::jsonb END
          ) AS vital WHERE vital->>'stato' = 'critico'
        ))::int AS critici,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(c.data->'indicatoriRischio') = 'array'
              THEN c.data->'indicatoriRischio' ELSE '[]'::jsonb END
          ) AS risk WHERE risk->>'livello' IN ('alto', 'critico')
        ))::int AS "rischiAlti",
        COUNT(*) FILTER (WHERE c.data->>'statoRicovero' = 'ricoverato')::int AS ricoverati,
        COUNT(*) FILTER (WHERE c.data->>'statoRicovero' = 'dimesso')::int AS dimessi,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(c.data->'allergie') = 'array'
              THEN c.data->'allergie' ELSE '[]'::jsonb END
          ) AS allergy WHERE allergy->>'gravita' = 'grave'
        ))::int AS "allergieGravi",
        COALESCE(SUM(jsonb_array_length(
          CASE WHEN jsonb_typeof(c.data->'terapie') = 'array'
            THEN c.data->'terapie' ELSE '[]'::jsonb END
        )), 0)::int AS "terapieTotali",
        COALESCE(SUM((
          SELECT COUNT(*) FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(c.data->'terapie') = 'array'
              THEN c.data->'terapie' ELSE '[]'::jsonb END
          ) AS therapy WHERE therapy->>'stato' = 'completata'
        )), 0)::int AS "terapieCompletate"
      FROM "Patient" p
      LEFT JOIN "Cartella" c ON c."patientId" = p.id
      ${scopeSql}
    `);
    res.status(200).json(
      rows[0] ?? {
        totalPatients: 0,
        critici: 0,
        rischiAlti: 0,
        ricoverati: 0,
        dimessi: 0,
        allergieGravi: 0,
        terapieTotali: 0,
        terapieCompletate: 0,
      },
    );
  } catch (error) {
    console.error('GET /patients/clinical-summary/overview error:', error);
    res.status(500).json({ error: 'Errore nel recupero della panoramica clinica' });
  }
});

router.get('/clinical-summary', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    // Scope + composition: patients/clinical-summary-service.ts (shared with the Tool Layer).
    const summary = await loadScopedPatientClinicalSummaries(req.query.patientIds, actor);
    res.status(200).json(summary);
  } catch (error) {
    if (error instanceof PatientSummaryInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /patients/clinical-summary error:', error);
    res.status(500).json({ error: 'Errore nel recupero del riepilogo clinico' });
  }
});

router.patch('/:id/parameters', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    const month = await savePatientParameterMonth(req.params.id, req.body, actor);
    res.status(200).json({ patientId: req.params.id, month });
  } catch (error) {
    if (error instanceof PatientParametersInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof PatientParametersNotFoundError) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    console.error('PATCH /patients/:id/parameters error:', error);
    res.status(500).json({ error: 'Errore nel salvataggio dei parametri' });
  }
});

router.get('/:id', requirePatientScope, async (req, res) => {
  const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? '') : req.params.id;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    res.status(200).json(patient);
  } catch (error) {
    console.error('GET /patients/:id error:', error);
    res.status(500).json({ error: 'Errore nel recupero del paziente' });
  }
});

router.post('/seed', requireRole('admin', 'manager'), async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Endpoint di seed/demo non disponibile in produzione' });
    return;
  }
  try {
    const patients = await prisma.patient.createMany({
      data: [
        {
          medicalRecordNumber: 'MRN-001',
          firstName: 'Mario',
          lastName: 'Rossi',
          dateOfBirth: new Date('1980-01-01'),
          email: 'mario.rossi@example.com',
          phone: '+39 333 111 2222',
        },
        {
          medicalRecordNumber: 'MRN-002',
          firstName: 'Luigi',
          lastName: 'Verdi',
          dateOfBirth: new Date('1990-05-10'),
          email: 'luigi.verdi@example.com',
          phone: '+39 333 444 5555',
        },
      ],
      skipDuplicates: true,
    });

    res.status(201).json({ created: patients.count });
  } catch (error) {
    console.error('Failed to seed patients:', error);
    res.status(500).json({ error: 'Failed to seed patients' });
  }
});
// ── POST /patients/demo-setup — create or update Fabio Forlano demo patient ──

router.post('/demo-setup', requireRole('admin', 'manager'), async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Endpoint di seed/demo non disponibile in produzione' });
    return;
  }
  try {
    const { patientId, medicalRecordNumber } = await seedFullDemoPatient(prisma);
    console.log(
      `POST /patients/demo-setup → Fabio Forlano id=${patientId} MRN=${medicalRecordNumber} — cartella completa`,
    );
    res.status(200).json({
      message: 'Demo patient Fabio Forlano created/updated with complete cartella',
      patientId,
      medicalRecordNumber,
      sections: DEMO_PATIENT_SECTIONS,
    });
  } catch (error) {
    console.error('POST /patients/demo-setup error:', error);
    res.status(500).json({ error: 'Errore durante setup paziente demo' });
  }
});

router.post('/', async (req, res) => {
  const actor = (req as AuthedRequest).operator!;
  const body = req.body as {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    sex?: string;
    codiceFiscale?: string;
    email?: string;
    phone?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };

  // Name the exact missing fields instead of a generic "required" error.
  const missing = (
    [
      ['firstName', 'nome'],
      ['lastName', 'cognome'],
      ['dateOfBirth', 'data di nascita'],
    ] as const
  ).filter(([key]) => typeof body[key] !== 'string' || body[key]!.trim() === '');
  if (missing.length) {
    res.status(400).json({
      error: `Campi obbligatori mancanti: ${missing.map(([, label]) => label).join(', ')}`,
      code: 'required_fields',
      fields: missing.map(([key]) => key),
    });
    return;
  }

  // #294: il CF è la chiave univoca del paziente — obbligatorio e formalmente valido.
  const phoneValidation = validatePatientPhone(body.phone);
  if (!phoneValidation.ok) {
    res.status(400).json({ error: phoneValidation.error });
    return;
  }
  const codiceFiscale = normalizeCodiceFiscale(body.codiceFiscale);
  if (!isValidCodiceFiscale(codiceFiscale)) {
    res.status(400).json({
      error: 'Codice fiscale mancante o non valido (16 caratteri, carattere di controllo)',
    });
    return;
  }
  const existing = await prisma.patient.findUnique({
    where: { codiceFiscale },
    select: { id: true },
  });
  if (existing) {
    res.status(409).json({
      error: 'Codice fiscale già presente',
    });
    return;
  }

  let birthDate: Date | null;
  let optionalFields: ReturnType<typeof patientOptionalFields>;
  let firstName: string;
  let lastName: string;
  try {
    birthDate = optionalBirthDate(body.dateOfBirth);
    optionalFields = patientOptionalFields(body as Record<string, unknown>);
    firstName = patientName(body.firstName, 'firstName');
    lastName = patientName(body.lastName, 'lastName');
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : 'Data di nascita non valida' });
    return;
  }
  const buildData = (mrn: string) => ({
    medicalRecordNumber: mrn,
    firstName,
    lastName,
    dateOfBirth: birthDate,
    codiceFiscale,
    ...optionalFields,
    phone: phoneValidation.phone,
    // Ownership is authoritative server-side; client-supplied ownership is ignored.
    registeredById: actor.id,
  });

  try {
    const patient = await prisma.patient.create({ data: buildData(`MRN-${Date.now()}`) });
    console.log(
      `POST /patients → creato id=${patient.id} nome="${patient.firstName} ${patient.lastName}"`,
    );
    res.status(201).json(patient);
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      // #294: distinguish which unique constraint tripped — a CF race is a real
      // conflict (409), only an MRN collision justifies the retry with a new MRN.
      if (prismaError.meta?.target?.includes('codiceFiscale')) {
        res.status(409).json({ error: 'Codice fiscale già presente' });
        return;
      }
      try {
        const patient = await prisma.patient.create({
          data: buildData(`MRN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        });
        console.log(`POST /patients (retry) → creato id=${patient.id}`);
        res.status(201).json(patient);
      } catch (retryErr) {
        console.error('POST /patients retry error:', retryErr);
        res.status(500).json({ error: 'Errore durante la creazione del paziente' });
      }
    } else {
      console.error('POST /patients error:', error);
      res.status(500).json({ error: 'Errore durante la creazione del paziente' });
    }
  }
});

// ── PATCH /patients/:id — update patient demographics ─────────────────────

router.patch('/:id', requirePatientScope, async (req, res) => {
  const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? '') : req.params.id;
  const allowed = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'sex',
    'email',
    'phone',
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  try {
    Object.assign(updates, patientOptionalFields(req.body));
    if (Object.hasOwn(req.body, 'phone')) updates.phone = optionalPatientPhone(req.body.phone);
    if (Object.hasOwn(req.body, 'dateOfBirth'))
      updates.dateOfBirth = optionalBirthDate(req.body.dateOfBirth);
    for (const key of ['firstName', 'lastName'] as const)
      if (Object.hasOwn(req.body, key)) updates[key] = patientName(req.body[key], key);
  } catch (error) {
    if (!(error instanceof PatientIdentityInputError)) throw error;
    res.status(400).json({ error: error.message });
    return;
  }

  // Missing identity remains explicit; a provided value is validated and globally unique.
  if (req.body.codiceFiscale !== undefined) {
    let cf: string | null;
    try {
      cf = optionalFiscalCode(req.body.codiceFiscale);
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Codice fiscale non valido' });
      return;
    }
    const other = cf
      ? await prisma.patient.findUnique({
          where: { codiceFiscale: cf },
          select: { id: true },
        })
      : null;
    if (other && other.id !== id) {
      res.status(409).json({ error: 'Codice fiscale già presente' });
      return;
    }
    updates.codiceFiscale = cf;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nessun campo da aggiornare' });
    return;
  }

  try {
    const patient = await prisma.$transaction(async (tx) => {
      const updatedPatient = await tx.patient.update({ where: { id }, data: updates });
      if (Object.hasOwn(updates, 'codiceFiscale')) {
        // Patient e' la sola fonte autorevole dell'identita'. La rimozione atomica della
        // vecchia copia JSON non riscrive il blob clinico e non perde sezioni concorrenti.
        await tx.$executeRaw`
          UPDATE "Cartella"
          SET "data" = "data" - 'codiceFiscale'
          WHERE "patientId" = ${id}
        `;
      }
      return updatedPatient;
    });
    console.log(`PATCH /patients/${id} → aggiornato`);
    res.status(200).json(patient);
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2025') {
      res.status(404).json({ error: 'Paziente non trovato' });
    } else if (
      prismaError.code === 'P2002' &&
      prismaError.meta?.target?.includes('codiceFiscale')
    ) {
      res.status(409).json({ error: 'Codice fiscale già presente' });
    } else {
      console.error('PATCH /patients/:id error:', error);
      res.status(500).json({ error: 'Errore durante aggiornamento paziente' });
    }
  }
});

// ── DELETE /patients/:id — remove a patient (TEST-ONLY) ───────────────────
// Gated by ALLOW_PATIENT_DELETE (default DISABLED). Set ALLOW_PATIENT_DELETE=true
// explicitly (e.g. local/test env) to enable it — no code change needed.
// DB cascades clinical relations (cartella, records, appointments, therapies,
// diary, room assignments); dangling import references are nulled first.

function patientDeleteAllowed(): boolean {
  return (process.env.ALLOW_PATIENT_DELETE ?? 'false').trim().toLowerCase() !== 'false';
}

router.delete(
  '/:id',
  (_req, res, next) => {
    if (!patientDeleteAllowed()) {
      res.status(403).json({ error: 'Cancellazione paziente disabilitata' });
      return;
    }
    next();
  },
  requirePatientScope,
  async (req, res) => {
    const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? '') : req.params.id;
    try {
      await prisma.$transaction([
        prisma.importJob.updateMany({
          where: { createdPatientId: id },
          data: { createdPatientId: null },
        }),
        prisma.patient.delete({ where: { id } }),
      ]);
      console.log(`DELETE /patients/${id} → cancellato`);
      res.status(200).json({ deleted: id });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2025') {
        res.status(404).json({ error: 'Paziente non trovato' });
      } else {
        console.error('DELETE /patients/:id error:', error);
        res.status(500).json({ error: 'Errore durante la cancellazione del paziente' });
      }
    }
  },
);

// ── GET /patients/:id/cartella — load clinical record ─────────────────────

router.get('/:id/cartella', requirePatientScope, async (req, res) => {
  const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? '') : req.params.id;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, cartella: { select: { data: true } } },
    });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    res.status(200).json({ patientId: id, data: patient.cartella?.data ?? null });
  } catch (error) {
    console.error('GET /patients/:id/cartella error:', error);
    res.status(500).json({ error: 'Errore nel recupero della cartella clinica' });
  }
});

// ── PUT /patients/:id/cartella — upsert clinical record ───────────────────

router.put('/:id/cartella', requirePatientScope, async (req, res) => {
  const id = Array.isArray(req.params.id) ? (req.params.id[0] ?? '') : req.params.id;
  const { data } = req.body as { data?: unknown };

  if (req.body && Object.hasOwn(req.body, 'temporaryPsExit')) {
    if (Object.keys(req.body).length !== 1) {
      res.status(400).json({ error: 'Invia soltanto il comando temporaryPsExit.' });
      return;
    }
    try {
      res
        .status(200)
        .json(
          await executeTemporaryPsExit(
            id,
            req.body.temporaryPsExit,
            (req as AuthedRequest).operator!,
          ),
        );
    } catch (error) {
      if (error instanceof TemporaryPsExitError)
        res.status(error.status).json({ error: error.message, code: error.code });
      else
        res
          .status(500)
          .json({ error: 'Registrazione uscita PS non verificata. Riprova la stessa richiesta.' });
    }
    return;
  }

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Campo "data" obbligatorio (oggetto JSON)' });
    return;
  }

  try {
    const cartella = await saveCartella(id, data, (req as AuthedRequest).operator!);

    console.log(`PUT /patients/${id}/cartella → salvata`);
    res.status(200).json({ patientId: id, data: cartella.data });
  } catch (error) {
    console.error('PUT /patients/:id/cartella error:', error);
    if (error instanceof CartellaUpdateError || error instanceof TemporaryPsExitError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Errore durante salvataggio cartella clinica' });
  }
});

export default router;
