import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import { requireOperator, type AuthedRequest, type Operator } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import { DiaryPageInputError } from '../patients/diary-pagination.js';
import { loadPatientDiary } from '../patients/diary-read-service.js';
import {
  DIARY_TIME_ZONE,
  DiaryWriteInputError,
  parseDiaryCreateBody,
  parseDiaryPatchBody,
} from '../patients/diary-write-validation.js';
import {
  assertPrescriptionEntry,
  createDiaryEntryWithTherapy,
  DiaryTherapyInputError,
  DiaryTherapyReplayConflictError,
  diaryTherapyAuditFields,
  parseTherapyRequestId,
  prepareDiaryTherapyInput,
} from '../patients/diary-therapy-service.js';
import { parseDiaryTherapyText } from '../therapies/diary-therapy-parse.js';
import { TherapyInputError } from '../therapies/input-validation.js';
import { InvalidTherapySchedulesError, TherapyDateRangeError } from '../lib/therapy-dose.js';
import { recordOperationalAudit } from '../ai/audit-store.js';

const router = Router();

// Gate minimo (header-based, non IdP): il diario paziente e' un dato clinico reale,
// richiede un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);
router.use('/:patientId/diary', requirePatientScope);

const DIARY_AUTHOR_TYPES = new Set([
  'medico',
  'infermiere',
  'oss',
  'fisioterapista',
  'operatore',
  'altro',
]);

async function authoritativeDiaryAuthor(operator: Operator): Promise<{
  authorType: string;
  authorName: string;
}> {
  const row = await prisma.operator.findUnique({
    where: { id: operator.id },
    select: { ruolo: true, user: { select: { fullName: true } } },
  });
  if (!row) throw new Error('operator_not_mapped');
  const normalizedRole = row.ruolo?.trim().toLowerCase() ?? '';
  return {
    authorType: DIARY_AUTHOR_TYPES.has(normalizedRole) ? normalizedRole : 'operatore',
    authorName: row.user.fullName.trim() || operator.name?.trim() || operator.id,
  };
}

// GET /patients/:patientId/diary
// Query params: authorType, from (YYYY-MM-DD), to (YYYY-MM-DD), limit, cursor.
// `offset` remains bounded for legacy clients; the UI uses the stable keyset cursor.
router.get('/:patientId/diary', async (req, res) => {
  const { patientId } = req.params;

  try {
    const page = await loadPatientDiary(
      patientId,
      req.query as Record<string, unknown>,
      (req as AuthedRequest).operator!,
    );
    if (!page) {
      res.status(404).json({ error: 'Paziente non trovato' });
      return;
    }
    res.status(200).json(page);
  } catch (error) {
    if (error instanceof DiaryPageInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /diary error:', error);
    res.status(500).json({ error: 'Errore nel recupero del diario' });
  }
});

// POST /patients/:patientId/diary
router.post('/:patientId/diary', async (req: AuthedRequest, res) => {
  const rawPatientId = req.params.patientId;
  const patientId = (Array.isArray(rawPatientId) ? rawPatientId[0] : rawPatientId) ?? '';
  let input;
  try {
    input = parseDiaryCreateBody(req.body);
  } catch (error) {
    if (error instanceof DiaryWriteInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  if (!patientId) {
    res.status(400).json({ error: 'patientId non valido' });
    return;
  }

  try {
    const author = await authoritativeDiaryAuthor(req.operator!);
    const entry = await prisma.patientDiaryEntry.create({
      data: {
        patientId,
        ...author,
        ...input,
      },
    });
    res.status(201).json({ entry });
  } catch (error) {
    console.error('POST /diary error:', error);
    res.status(500).json({ error: 'Errore nella creazione della voce' });
  }
});

// GET /patients/:patientId/diary/:entryId
router.get('/:patientId/diary/:entryId', async (req, res) => {
  const { patientId, entryId } = req.params;
  try {
    const entry = await prisma.patientDiaryEntry.findFirst({
      where: { id: entryId, patientId },
    });
    if (!entry) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    res.status(200).json({ entry });
  } catch (error) {
    console.error('GET /diary/:entryId error:', error);
    res.status(500).json({ error: 'Errore nel recupero della voce' });
  }
});

// PUT /patients/:patientId/diary/:entryId
router.put('/:patientId/diary/:entryId', async (req, res) => {
  const { patientId, entryId } = req.params;
  // Authorship is immutable and server-authoritative. Client author fields are ignored.
  let patch;
  try {
    patch = parseDiaryPatchBody(req.body);
  } catch (error) {
    if (error instanceof DiaryWriteInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  try {
    const existing = await prisma.patientDiaryEntry.findFirst({
      where: { id: entryId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    const entry = await prisma.patientDiaryEntry.update({
      where: { id: entryId },
      data: patch,
    });
    res.status(200).json({ entry });
  } catch (error) {
    console.error('PUT /diary/:entryId error:', error);
    res.status(500).json({ error: 'Errore nella modifica della voce' });
  }
});

// DELETE /patients/:patientId/diary/:entryId
router.delete('/:patientId/diary/:entryId', async (req, res) => {
  const { patientId, entryId } = req.params;
  try {
    const existing = await prisma.patientDiaryEntry.findFirst({
      where: { id: entryId, patientId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Voce non trovata' });
      return;
    }
    await prisma.patientDiaryEntry.delete({ where: { id: entryId } });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('DELETE /diary/:entryId error:', error);
    res.status(500).json({ error: 'Errore nella eliminazione della voce' });
  }
});

// ── Diario terapia (PR 1) ────────────────────────────────────────────────────────────────────
// Stesso gate del resto del diario (requireOperator + requirePatientScope via router.use).
// PRIVACY: il testo clinico viaggia solo nel corpo della richiesta, mai in URL, log o audit.

const MAX_THERAPY_PREVIEW_CHARS = 2000;
const TODAY_IN_FACILITY = new Intl.DateTimeFormat('en-CA', {
  timeZone: DIARY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function routePatientId(req: AuthedRequest): string {
  const raw = req.params.patientId;
  return (Array.isArray(raw) ? raw[0] : raw) ?? '';
}

/** Solo nome e codice dell'errore: il messaggio puo' contenere dati clinici. */
function safeErrorTag(error: unknown): [string, string] {
  const name = error instanceof Error ? error.name : 'unknown';
  const code = (error as { code?: unknown } | null)?.code;
  return [name, typeof code === 'string' ? code : ''];
}

function isTherapyValidationError(error: unknown): error is Error {
  return (
    error instanceof DiaryWriteInputError ||
    error instanceof DiaryTherapyInputError ||
    error instanceof TherapyInputError ||
    error instanceof InvalidTherapySchedulesError ||
    error instanceof TherapyDateRangeError ||
    (error instanceof Error && error.message.includes('Campi obbligatori'))
  );
}

function therapyValidationBody(error: Error): Record<string, unknown> {
  if (error instanceof DiaryTherapyInputError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.fasciaConflicts.length ? { fasciaConflicts: error.fasciaConflicts } : {}),
      ...(error.intent ? { intent: error.intent } : {}),
    };
  }
  return { error: error.message };
}

// POST /patients/:patientId/diary/therapy-preview  { text, entryDateTime? }
// Sola lettura: interpreta il testo in modo deterministico, non scrive nulla.
router.post('/:patientId/diary/therapy-preview', (req: AuthedRequest, res) => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Corpo richiesta non valido' });
    return;
  }
  const unknownKey = Object.keys(body).find((k) => k !== 'text' && k !== 'entryDateTime');
  if (unknownKey) {
    res.status(400).json({ error: `Campo non consentito: ${unknownKey}` });
    return;
  }
  const { text, entryDateTime } = body;
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text obbligatorio' });
    return;
  }
  if (text.length > MAX_THERAPY_PREVIEW_CHARS) {
    res.status(400).json({ error: `text supera ${MAX_THERAPY_PREVIEW_CHARS} caratteri` });
    return;
  }
  if (
    entryDateTime !== undefined &&
    (typeof entryDateTime !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(entryDateTime))
  ) {
    res.status(400).json({ error: 'entryDateTime non valida' });
    return;
  }
  const entryDate =
    typeof entryDateTime === 'string' ? entryDateTime : TODAY_IN_FACILITY.format(new Date());
  const parsed = parseDiaryTherapyText(text, entryDate);
  res.status(200).json({ ...parsed, source: 'deterministic' });
});

// POST /patients/:patientId/diary/with-therapy  { requestId, entry, therapy }
// Voce di diario (category 'terapia') + terapia in una sola transazione. 201 alla creazione,
// 200 con la coppia esistente quando il requestId e' gia' stato usato per questo paziente con lo
// stesso contenuto; 409 request_id_reused se il contenuto e' diverso. Sospensione, somministrazione
// gia' fatta o modifica (400 intent_not_prescription) e una terapia periodica senza orari espliciti
// (400 schedule_required) non creano nulla.
router.post('/:patientId/diary/with-therapy', async (req: AuthedRequest, res) => {
  const patientId = routePatientId(req);
  const actor = req.operator!;
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Corpo richiesta non valido' });
    return;
  }
  const unknownKey = Object.keys(body).find(
    (k) => k !== 'requestId' && k !== 'entry' && k !== 'therapy',
  );
  if (unknownKey) {
    res.status(400).json({ error: `Campo non consentito: ${unknownKey}` });
    return;
  }

  let requestId;
  let entry;
  let therapy;
  try {
    requestId = parseTherapyRequestId(body.requestId);
    entry = parseDiaryCreateBody(body.entry);
    assertPrescriptionEntry(entry);
    therapy = prepareDiaryTherapyInput(body.therapy, actor.name || actor.id);
  } catch (error) {
    if (isTherapyValidationError(error)) {
      res.status(400).json(therapyValidationBody(error));
      return;
    }
    console.error('POST /diary/with-therapy validation error:', ...safeErrorTag(error));
    res.status(500).json({ error: 'Errore durante creazione terapia' });
    return;
  }

  try {
    const author = await authoritativeDiaryAuthor(actor);
    const result = await createDiaryEntryWithTherapy({
      patientId,
      requestId,
      author,
      entry,
      therapy,
    });
    recordOperationalAudit({
      requestId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'diary_therapy_create',
      kind: 'create',
      patientId,
      fields: diaryTherapyAuditFields(entry, therapy),
      outcome: result.replay ? 'deduped' : 'ok',
    });
    console.log(
      `POST /patients/${patientId}/diary/with-therapy → ${result.replay ? 'replay' : 'created'} entry=${result.entry.id} therapy=${result.therapy?.id ?? 'null'}`,
    );
    res.status(result.replay ? 200 : 201).json({ entry: result.entry, therapy: result.therapy });
  } catch (error) {
    if (error instanceof DiaryTherapyReplayConflictError) {
      res.status(409).json({ error: error.message, code: error.code });
      return;
    }
    if (isTherapyValidationError(error)) {
      res.status(400).json(therapyValidationBody(error));
      return;
    }
    console.error('POST /diary/with-therapy error:', ...safeErrorTag(error));
    res.status(500).json({ error: 'Errore durante creazione terapia' });
  }
});

export default router;
