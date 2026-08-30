import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import { isValidCodiceFiscale, normalizeCodiceFiscale } from '../lib/codice-fiscale.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import {
  PatientPageInputError,
  decodePatientPageCursor,
  encodePatientPageCursor,
  parsePatientPageQuery,
} from '../patients/pagination.js';
import { PatientSummaryInputError, parsePatientSummaryIds } from '../patients/summary-query.js';
import { loadPatientParametersPage } from '../patients/parameters-page.js';
import {
  PatientParametersInputError,
  PatientParametersNotFoundError,
  savePatientParameterMonth,
} from '../patients/parameters-update.js';
import { loadPatientConsegnaCounts } from '../consegne/read-service.js';
import { requirePatientScope } from '../patients/access.js';
import { hasGlobalPatientScope, patientScopeWhere } from '../patients/patient-scope.js';
import {
  assemblePatientClinicalSummaries,
  loadPatientClinicalSummaryRows,
} from '../patients/clinical-summary.js';

const router = Router();

// Gate minimo (header-based, non IdP): dati anagrafici/clinici reali, richiedono un
// operatore identificato in lettura e scrittura. Vedi backend/src/ai/auth.ts.
router.use(requireOperator);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

// Contratto scalabile per tutti i consumer di elenco; il roster legacy e' dismesso sotto.
router.get('/page', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    const input = parsePatientPageQuery(req.query as Record<string, unknown>);
    const filters = { q: input.q, sex: input.sex };
    const position = input.cursor ? decodePatientPageCursor(input.cursor, filters) : undefined;
    const searchTokens =
      input.q
        ?.split(/[,\s]+/)
        .filter(Boolean)
        .slice(0, 5) ?? [];

    const baseWhere = {
      ...patientScopeWhere(actor),
      ...(input.sex && { sex: input.sex }),
      ...(searchTokens.length > 0 && {
        AND: searchTokens.map((token) => ({
          OR: [
            { lastName: { contains: token, mode: 'insensitive' as const } },
            { firstName: { contains: token, mode: 'insensitive' as const } },
            { medicalRecordNumber: { contains: token, mode: 'insensitive' as const } },
          ],
        })),
      }),
    };
    const cursorWhere = position
      ? {
          OR: [
            { lastName: { gt: position.lastName } },
            { lastName: position.lastName, firstName: { gt: position.firstName } },
            {
              lastName: position.lastName,
              firstName: position.firstName,
              id: { gt: position.id },
            },
          ],
        }
      : undefined;

    const rows = await prisma.patient.findMany({
      where: cursorWhere ? { AND: [baseWhere, cursorWhere] } : baseWhere,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      take: input.limit + 1,
      select: {
        id: true,
        medicalRecordNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        sex: true,
        email: true,
        phone: true,
      },
    });
    const hasMore = rows.length > input.limit;
    const items = hasMore ? rows.slice(0, input.limit) : rows;
    const last = items.at(-1);
    res.status(200).json({
      items,
      hasMore,
      nextCursor:
        hasMore && last
          ? encodePatientPageCursor(
              { lastName: last.lastName, firstName: last.firstName, id: last.id },
              filters,
            )
          : null,
    });
  } catch (error) {
    if (error instanceof PatientPageInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /patients/page error:', error);
    res.status(500).json({ error: 'Errore nel recupero della pagina pazienti' });
  }
});

// Bounded projection for the multi-patient vital-sign editor. Unlike the legacy roster + one
// cartella request per patient, this returns at most 25 identities and only the JSON fields the
// screen renders. It deliberately shares the signed cursor/filter contract with /patients/page.
router.get('/parameters/page', async (req, res) => {
  try {
    const actor = (req as AuthedRequest).operator!;
    res
      .status(200)
      .json(await loadPatientParametersPage(req.query as Record<string, unknown>, actor));
  } catch (error) {
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
    const scopeSql = hasGlobalPatientScope(actor.role)
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
    const patientIds = parsePatientSummaryIds(req.query.patientIds);
    const allowedPatients = await prisma.patient.findMany({
      where: { id: { in: patientIds }, ...patientScopeWhere(actor) },
      select: { id: true },
    });
    const allowedIds = new Set(allowedPatients.map((patient) => patient.id));
    const scopedPatientIds = patientIds.filter((patientId) => allowedIds.has(patientId));
    const [clinicalRows, consegneCounts] = await Promise.all([
      loadPatientClinicalSummaryRows(scopedPatientIds),
      loadPatientConsegnaCounts(scopedPatientIds),
    ]);
    const summary = assemblePatientClinicalSummaries(
      scopedPatientIds,
      clinicalRows,
      consegneCounts,
    );
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

router.post('/seed', async (_req, res) => {
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

router.post('/demo-setup', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Endpoint di seed/demo non disponibile in produzione' });
    return;
  }
  const DEMO_MRN = 'DEMO-FULL-001';
  const DEMO_EMAIL = 'fabio.forlano@example.local';
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  try {
    // Upsert patient by MRN
    let patient = await prisma.patient.findFirst({
      where: { OR: [{ medicalRecordNumber: DEMO_MRN }, { email: DEMO_EMAIL }] },
    });

    if (patient) {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          medicalRecordNumber: DEMO_MRN,
          firstName: 'Fabio',
          lastName: 'Forlano',
          dateOfBirth: new Date('1948-05-12'),
          sex: 'M',
          phone: '+39 333 0000001',
          email: DEMO_EMAIL,
          emergencyContactName: 'Maria Forlano',
          emergencyContactPhone: '+39 333 0000002',
        },
      });
    } else {
      patient = await prisma.patient.create({
        data: {
          medicalRecordNumber: DEMO_MRN,
          firstName: 'Fabio',
          lastName: 'Forlano',
          dateOfBirth: new Date('1948-05-12'),
          sex: 'M',
          phone: '+39 333 0000001',
          email: DEMO_EMAIL,
          emergencyContactName: 'Maria Forlano',
          emergencyContactPhone: '+39 333 0000002',
        },
      });
    }

    // Build complete cartella
    const cartella = {
      pazienteId: patient.id,
      statoRicovero: 'ricoverato',
      cameraNumero: '12',
      lettoNumero: 'A',
      // #294 (QA F6): carattere di controllo corretto ('N', il vecchio 'X' era invalido).
      codiceFiscale: 'FRLFBA48E12H501N',
      contattoEmergenzaNome: 'Maria Forlano',
      contattoEmergenzaTel: '+39 333 0000002',
      contattoEmergenzaRel: 'Figlia',
      patologiaIngresso: 'Riabilitazione e monitoraggio clinico',
      diabetico: true,
      ipertensione: true,
      terapiaTriturata: false,
      dataRicovero: today,
      noteGenerali: 'Paziente collaborante, deambulazione assistita',
      medicoCurante: 'Dr. Bianchi',

      anamnesi: {
        fisiologica: 'Sesso maschile, 77 anni',
        patologicaRemota: 'Pregresso intervento chirurgico addominale',
        patologicaProssima: 'Ridotta autonomia nella deambulazione. Rischio caduta moderato.',
        familiare: 'Padre iperteso, madre diabetica',
        lavorativa: 'Pensionato, ex operaio',
        abitudini: 'Non fumatore, consumo modesto di alcol',
        note: '',
        updatedAt: now,
        operatore: 'Inf. Demo',
      },

      diagnosi: [
        {
          id: 'demo-diag-1',
          codiceICD: 'J44.1',
          descrizione: 'BPCO lieve',
          tipo: 'principale',
          stato: 'attiva',
          dataInsorgenza: '2020-01-15',
          operatore: 'Dr. Demo',
          note: 'In trattamento',
          createdAt: now,
        },
        {
          id: 'demo-diag-2',
          codiceICD: 'I10',
          descrizione: 'Ipertensione arteriosa',
          tipo: 'comorbidita',
          stato: 'attiva',
          dataInsorgenza: '2015-06-01',
          operatore: 'Dr. Demo',
          note: '',
          createdAt: now,
        },
        {
          id: 'demo-diag-3',
          codiceICD: 'E11',
          descrizione: 'Diabete mellito tipo 2',
          tipo: 'comorbidita',
          stato: 'attiva',
          dataInsorgenza: '2018-03-10',
          operatore: 'Dr. Demo',
          note: 'Controllato con Metformina',
          createdAt: now,
        },
      ],

      allergie: [
        {
          id: 'demo-all-1',
          allergene: 'Penicillina',
          reazione: 'Rash cutaneo',
          gravita: 'grave',
          documentato: today,
          documentatoDa: 'Inf. Demo',
          note: 'Documentata in cartella ospedaliera',
        },
      ],

      farmaci: [
        {
          id: 'demo-farm-1',
          nome: 'Claritromicina',
          dose: '500 mg',
          frequenza: 'mattina e sera',
          via: 'orale',
          inizio: today,
          stato: 'attivo',
          prescrittoDA: 'Dr. Demo',
          h08: '✓',
          h20: '✓',
        },
        {
          id: 'demo-farm-2',
          nome: 'Ramipril',
          dose: '5 mg',
          frequenza: '1x/die mattina',
          via: 'orale',
          inizio: today,
          stato: 'attivo',
          prescrittoDA: 'Dr. Demo',
          h08: '✓',
        },
        {
          id: 'demo-farm-3',
          nome: 'Metformina',
          dose: '500 mg',
          frequenza: 'pranzo e cena',
          via: 'orale',
          inizio: today,
          stato: 'attivo',
          prescrittoDA: 'Dr. Demo',
          h12: '✓',
          h20: '✓',
        },
        {
          id: 'demo-farm-4',
          nome: 'Paracetamolo',
          dose: '1000 mg',
          frequenza: 'al bisogno',
          via: 'orale',
          inizio: today,
          stato: 'attivo',
          prescrittoDA: 'Dr. Demo',
          indicazione: 'Dolore o febbre > 38°C',
        },
      ],

      terapie: [
        {
          id: 'demo-ter-1',
          tipo: 'farmacologica',
          descrizione:
            'Schema insulinico: 100-150→3U, 151-200→5U, 201-250→7U, >250→avvisare medico',
          dataInizio: today,
          stato: 'attiva',
          operatore: 'Dr. Demo',
          note: 'Insulina rapida SC',
          createdAt: now,
        },
      ],

      parametriVitali: [
        {
          id: 'demo-pv-1',
          etichetta: 'PA',
          valore: '130/85',
          unita: 'mmHg',
          stato: 'normale',
          rilevato: today,
          rilevatoDa: 'Inf. Demo',
        },
        {
          id: 'demo-pv-2',
          etichetta: 'FC',
          valore: '78',
          unita: 'bpm',
          stato: 'normale',
          rilevato: today,
          rilevatoDa: 'Inf. Demo',
        },
        {
          id: 'demo-pv-3',
          etichetta: 'SpO2',
          valore: '96',
          unita: '%',
          stato: 'normale',
          rilevato: today,
          rilevatoDa: 'Inf. Demo',
        },
        {
          id: 'demo-pv-4',
          etichetta: 'TC',
          valore: '36.5',
          unita: '°C',
          stato: 'normale',
          rilevato: today,
          rilevatoDa: 'Inf. Demo',
        },
        {
          id: 'demo-pv-5',
          etichetta: 'DTX',
          valore: '145',
          unita: 'mg/dL',
          stato: 'attenzione',
          rilevato: today,
          rilevatoDa: 'Inf. Demo',
        },
      ],

      parametriMensili: [
        {
          id: 'demo-pm-1',
          mese: new Date().getMonth() + 1,
          anno: new Date().getFullYear(),
          createdAt: now,
          giorni: [
            {
              giorno: 1,
              pa: '130/85',
              fc: '78',
              spo2: '96',
              temperatura: '36.5',
              dtx08: '145',
              evacuazione: 'Sì',
              note: 'Stabile',
            },
            {
              giorno: 2,
              pa: '125/80',
              fc: '82',
              spo2: '97',
              temperatura: '36.4',
              dtx08: '138',
              dtx12: '155',
              evacuazione: 'No',
            },
            {
              giorno: 3,
              pa: '140/90',
              fc: '75',
              spo2: '95',
              temperatura: '36.8',
              dtx08: '160',
              evacuazione: 'Sì',
              note: 'PA leggermente alta',
            },
            {
              giorno: 4,
              pa: '135/85',
              fc: '80',
              spo2: '96',
              temperatura: '36.6',
              dtx08: '142',
              dtx18: '150',
              evacuazione: 'Sì',
            },
            {
              giorno: 5,
              pa: '128/82',
              fc: '76',
              spo2: '97',
              temperatura: '36.3',
              dtx08: '135',
              evacuazione: 'No',
              note: 'Valori ottimali',
            },
          ],
        },
      ],

      diarioInfermieristico: [
        {
          id: 'demo-di-1',
          data: today,
          ora: '08:00',
          turno: 'mattina',
          tipo: 'ordinario',
          testo: 'Paziente collaborante, ha assunto terapia regolarmente. Parametri nella norma.',
          operatore: 'Inf. Demo',
          createdAt: now,
          priorita: 'normale',
          stato: 'completata',
        },
        {
          id: 'demo-di-2',
          data: today,
          ora: '10:30',
          turno: 'mattina',
          tipo: 'urgente',
          testo: 'PA 160/95 dopo sforzo. Monitoraggio ravvicinato. Avvisato medico.',
          operatore: 'Inf. Demo',
          createdAt: now,
          priorita: 'urgente',
          stato: 'completata',
        },
        {
          id: 'demo-di-3',
          data: today,
          ora: '14:00',
          turno: 'pomeriggio',
          tipo: 'ordinario',
          testo: 'Deambulazione assistita con fisioterapista. Buona tolleranza allo sforzo.',
          operatore: 'Inf. Demo',
          createdAt: now,
          priorita: 'normale',
          stato: 'completata',
        },
        {
          id: 'demo-di-4',
          data: today,
          ora: '20:00',
          turno: 'notte',
          tipo: 'segnalazione',
          testo: 'Paziente riferisce leggero dolore toracico. Monitorare durante la notte.',
          operatore: 'Inf. Demo',
          createdAt: now,
          priorita: 'alta',
          stato: 'aperta',
        },
      ],

      diarioMedico: [
        {
          id: 'demo-dm-1',
          data: today,
          ora: '09:00',
          turno: 'mattina',
          tipo: 'ordinario',
          testo:
            'Tosse produttiva persistente. Si prescrive Claritromicina 500 mg x 2/die per 7 giorni.',
          operatore: 'Dr. Demo',
          createdAt: now,
          prescrizione: 'Claritromicina 500 mg 1 cp mattina + 1 cp sera x 7 gg',
          firmaMedico: 'Dr. Demo',
        },
        {
          id: 'demo-dm-2',
          data: today,
          ora: '15:00',
          turno: 'pomeriggio',
          tipo: 'ordinario',
          testo: 'Rivalutazione parametri. PA rientrata nei limiti dopo riposo. DTX da monitorare.',
          operatore: 'Dr. Demo',
          createdAt: now,
          evoluzione: 'Condizioni stabili, proseguire monitoraggio',
          firmaMedico: 'Dr. Demo',
        },
      ],

      medicazioniFerite: [
        {
          id: 'demo-med-1',
          data: today,
          sede: 'Tallone destro',
          tipoLesione: 'LDP',
          grado: '1',
          tipoMedicazione: 'Medicazione protettiva',
          materiale: 'Film in poliuretano',
          aspettoLesione: 'Eritema non sbiancabile',
          dimensioni: '2x2 cm',
          odore: false,
          essudato: 'assente',
          cutePerilisionale: 'Integra',
          prossimaMedicazione: 'Controllo programmato fra 3 giorni',
          operatore: 'Inf. Demo',
          note: 'Primo rilevamento',
          createdAt: now,
          followUps: [
            {
              id: 'demo-fu-1',
              data: today,
              siglaOperatore: 'ID',
              motivoSostituzione: 'termine',
              note: 'Controllo programmato',
              createdAt: now,
            },
          ],
        },
      ],

      documentiConsegnati: [
        {
          id: 'demo-doc-1',
          tipo: 'documento_identita',
          descrizione: "Carta d'identità",
          dataConsegna: today,
          firmatoDA: 'Fabio Forlano',
          operatore: 'Inf. Demo',
          note: '',
          stato: 'ricevuto',
        },
        {
          id: 'demo-doc-2',
          tipo: 'tessera_sanitaria',
          descrizione: 'Tessera sanitaria',
          dataConsegna: today,
          firmatoDA: 'Fabio Forlano',
          operatore: 'Inf. Demo',
          note: '',
          stato: 'ricevuto',
        },
        {
          id: 'demo-doc-3',
          tipo: 'consenso_privacy',
          descrizione: 'Consenso privacy firmato',
          dataConsegna: today,
          firmatoDA: 'Fabio Forlano',
          operatore: 'Inf. Demo',
          note: '',
          stato: 'firmato',
        },
        {
          id: 'demo-doc-4',
          tipo: 'lettera_dimissione',
          descrizione: 'Lettera dimissione ospedaliera',
          dataConsegna: today,
          firmatoDA: 'Ospedale Demo',
          operatore: 'Inf. Demo',
          note: 'Dal ricovero precedente',
          stato: 'ricevuto',
        },
        {
          id: 'demo-doc-5',
          tipo: 'prescrizione',
          descrizione: 'Piano terapeutico',
          dataConsegna: today,
          firmatoDA: 'Dr. Demo',
          operatore: 'Inf. Demo',
          note: '',
          stato: 'ricevuto',
        },
      ],

      valutazioniBraden: [
        {
          id: 'demo-br-1',
          data: today,
          percezioneSensoriale: 3,
          umidita: 3,
          attivita: 3,
          mobilita: 2,
          nutrizione: 3,
          frizione: 2,
          operatore: 'Inf. Demo',
          note: 'Valutazione iniziale — rischio moderato',
          createdAt: now,
        },
      ],

      contenzioni: [
        {
          id: 'demo-cont-1',
          dataInizio: today,
          oraInizio: '22:00',
          tipo: 'spondina',
          motivoClinico: 'Rischio caduta notturno',
          autorizzazioneMedico: true,
          autorizzazioneTutore: true,
          intervalloRivalutazione: 24,
          dataFine: '',
          oraFine: '',
          attiva: false,
          operatore: 'Inf. Demo',
          note: 'Dato demo per test funzionale',
          createdAt: now,
          spondineAttive: true,
          spondineFrequenza: 'notturna',
          motivCadute: true,
          firmaPazienteReferente: 'Maria Forlano',
        },
      ],

      indicatoriRischio: [
        {
          id: 'demo-risk-1',
          tipo: 'caduta',
          livello: 'medio',
          descrizione: 'Rischio caduta moderato per deambulazione assistita',
          dataValutazione: today,
          operatore: 'Inf. Demo',
        },
        {
          id: 'demo-risk-2',
          tipo: 'lesioni_pressione',
          livello: 'medio',
          descrizione: 'Braden 16 — rischio moderato LDP',
          dataValutazione: today,
          operatore: 'Inf. Demo',
        },
      ],

      pianoCura: {
        obiettivi: 'Ripristino autonomia deambulatoria. Stabilizzazione parametri vitali.',
        interventiPrevisti: 'Fisioterapia quotidiana, monitoraggio PA e DTX, terapia farmacologica',
        notePianificazione: 'Rivalutazione settimanale',
        dataAggiornamento: today,
        operatore: 'Dr. Demo',
      },

      noteClinica: [
        {
          id: 'demo-nc-1',
          tipo: 'clinica',
          contenuto:
            'Paziente in buone condizioni generali. Collaborante. Obiettivo: recupero deambulazione autonoma entro 30 giorni.',
          operatore: 'Dr. Demo',
          createdAt: now,
        },
        {
          id: 'demo-nc-2',
          tipo: 'nursing',
          contenuto: 'Cute integra eccetto tallone dx (LDP grado 1). Piano medicazioni attivato.',
          operatore: 'Inf. Demo',
          createdAt: now,
        },
      ],

      visite: [
        {
          id: 'demo-vis-1',
          tipo: 'Visita medica',
          data: today,
          ora: '09:00',
          operatore: 'Dr. Demo',
          descrizione: 'Prima visita dopo ingresso. Valutazione clinica completa.',
          esito: 'Condizioni discrete, terapia impostata',
          followUp: 'Rivalutazione fra 7 giorni',
          createdAt: now,
        },
        {
          id: 'demo-vis-2',
          tipo: 'Fisioterapia',
          data: today,
          ora: '14:00',
          operatore: 'Ft. Demo',
          descrizione: 'Valutazione motoria. Deambulazione assistita 50m con deambulatore.',
          esito: 'Buona tolleranza, proseguire programma riabilitativo',
          createdAt: now,
        },
      ],

      interventi: [],

      presaInCarico: {
        dataIngresso: today,
        oraIngresso: '08:00',
        provenienza: 'dimissione_ospedaliera',
        centroInviante: 'Ospedale Demo',
        modalitaIngresso: 'ambulante',
        accompagnatoDa: 'Maria Forlano (figlia)',
        motivoIngresso: 'Riabilitazione e monitoraggio clinico',
        operatoreResponsabile: 'Inf. Demo',
        condizioniGenerali: 'discrete',
        condizioniIniziali: 'Paziente collaborante, deambulazione assistita',
        noteIniziali: 'Proveniente da Ospedale Demo dopo intervento chirurgico addominale',
        camera: '12',
        letto: 'A',
        statoCoscienza: 'vigile',
        orientamento: 'orientato',
        autonomia: 'parzialmente_autonomo',
        comunicazione: 'Buona',
        udito: 'Nella norma',
        vista: 'Nella norma con correzione',
        dentizione: 'Protesi parziale',
        alimentazione: 'Autonomo, dieta diabetica',
        eliminazioneUrinaria: 'Autonoma',
        eliminazioneIntestinale: 'Regolare',
        mobilita: 'Deambulazione assistita',
        cuteIntegrita: 'Eritema non sbiancabile tallone destro',
        dolore: 'assente',
        doloreLivello: 0,
        materialeConsegnato: true,
        operatore: 'Inf. Demo',
        note: '',
        compilatoAt: now,
      },
    };

    // Upsert cartella
    await prisma.cartella.upsert({
      where: { patientId: patient.id },
      create: { patientId: patient.id, data: cartella as object },
      update: { data: cartella as object },
    });

    console.log(
      `POST /patients/demo-setup → Fabio Forlano id=${patient.id} MRN=${DEMO_MRN} — cartella completa`,
    );
    res.status(200).json({
      message: 'Demo patient Fabio Forlano created/updated with complete cartella',
      patientId: patient.id,
      medicalRecordNumber: DEMO_MRN,
      sections: [
        'anamnesi',
        'diagnosi',
        'allergie',
        'farmaci',
        'terapie',
        'parametriVitali',
        'parametriMensili',
        'diarioInfermieristico',
        'diarioMedico',
        'medicazioniFerite',
        'documentiConsegnati',
        'valutazioniBraden',
        'contenzioni',
        'indicatoriRischio',
        'pianoCura',
        'noteClinica',
        'visite',
        'presaInCarico',
      ],
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

  if (
    !body.firstName ||
    typeof body.firstName !== 'string' ||
    body.firstName.trim() === '' ||
    !body.lastName ||
    typeof body.lastName !== 'string' ||
    body.lastName.trim() === '' ||
    !body.dateOfBirth ||
    typeof body.dateOfBirth !== 'string' ||
    body.dateOfBirth.trim() === ''
  ) {
    res.status(400).json({ error: 'Nome, cognome e data di nascita sono obbligatori' });
    return;
  }

  // #294: il CF è la chiave univoca del paziente — obbligatorio e formalmente valido.
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

  const buildData = (mrn: string) => ({
    medicalRecordNumber: mrn,
    firstName: body.firstName!.trim(),
    lastName: body.lastName!.trim(),
    dateOfBirth: new Date(body.dateOfBirth!),
    codiceFiscale,
    ...(body.sex !== undefined && { sex: body.sex }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.address !== undefined && { address: body.address }),
    ...(body.emergencyContactName !== undefined && {
      emergencyContactName: body.emergencyContactName,
    }),
    ...(body.emergencyContactPhone !== undefined && {
      emergencyContactPhone: body.emergencyContactPhone,
    }),
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
      updates[key] = key === 'dateOfBirth' ? new Date(req.body[key]) : req.body[key];
    }
  }

  // #294: CF aggiornabile solo con un valore valido; mai azzerabile da qui.
  if (req.body.codiceFiscale !== undefined) {
    const cf = normalizeCodiceFiscale(req.body.codiceFiscale);
    if (!isValidCodiceFiscale(cf)) {
      res.status(400).json({
        error: 'Codice fiscale non valido (16 caratteri, carattere di controllo)',
      });
      return;
    }
    const other = await prisma.patient.findUnique({
      where: { codiceFiscale: cf },
      select: { id: true },
    });
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
    const patient = await prisma.patient.update({ where: { id }, data: updates });
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

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Campo "data" obbligatorio (oggetto JSON)' });
    return;
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }

    const cartella = await prisma.cartella.upsert({
      where: { patientId: id },
      create: { patientId: id, data: data as object },
      update: { data: data as object },
    });

    console.log(`PUT /patients/${id}/cartella → salvata`);
    res.status(200).json({ patientId: id, data: cartella.data });
  } catch (error) {
    console.error('PUT /patients/:id/cartella error:', error);
    res.status(500).json({ error: 'Errore durante salvataggio cartella clinica' });
  }
});

export default router;
