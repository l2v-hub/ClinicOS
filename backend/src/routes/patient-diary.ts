import { IdempotencyError, runIdempotent, takeRequestId } from '../lib/idempotency.js';
import { prisma } from '../lib/prisma.js';
import { Router } from 'express';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { requirePatientScope } from '../patients/access.js';
import { DiaryPageInputError } from '../patients/diary-pagination.js';
import { acknowledgeDiaryEntry } from '../patients/diary-ack-service.js';
import { UrgencyAckError } from '../lib/urgency.js';
import { loadPatientDiary } from '../patients/diary-read-service.js';
import { countUnreadDiary } from '../patients/diary-reading.js';
import {
  loadUnreadDiary,
  loadUnreadPatientCounts,
  parseUnreadPatientIds,
} from '../patients/diary-unread-service.js';
import { DiaryWriteInputError, parseDiaryPatchBody } from '../patients/diary-write-validation.js';
import {
  DiaryTherapyInputError,
  DiaryTherapyReplayConflictError,
} from '../patients/diary-therapy-service.js';
import {
  createPatientDiaryEntry,
  createPatientDiaryEntryWithTherapy,
  isTherapyValidationError,
  previewDiaryTherapy,
} from '../patients/diary-write-service.js';

const router = Router();

// Gate minimo (header-based, non IdP): il diario paziente e' un dato clinico reale,
// richiede un operatore identificato. Vedi backend/src/ai/auth.ts.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(requireOperator);
router.use('/:patientId/diary', requirePatientScope);

router.get('/diary-unread-count', async (req: AuthedRequest, res) => {
  try {
    res.status(200).json({ unreadCount: await countUnreadDiary(req.operator!) });
  } catch {
    res.status(503).json({ error: 'Conteggio delle note da leggere non disponibile' });
  }
});

router.get('/diary-unread', async (req: AuthedRequest, res) => {
  try {
    res
      .status(200)
      .json(await loadUnreadDiary(req.query as Record<string, unknown>, req.operator!));
  } catch (error) {
    res
      .status(error instanceof DiaryPageInputError ? 400 : 503)
      .json({
        error:
          error instanceof DiaryPageInputError
            ? error.message
            : 'Coda delle note non confermate non disponibile',
      });
  }
});
router.get('/diary-unread-patient-counts', async (req: AuthedRequest, res) => {
  try {
    res
      .status(200)
      .json({
        items: await loadUnreadPatientCounts(
          parseUnreadPatientIds(req.query.patientIds),
          req.operator!,
        ),
      });
  } catch (error) {
    res
      .status(error instanceof DiaryPageInputError ? 400 : 503)
      .json({
        error:
          error instanceof DiaryPageInputError
            ? error.message
            : 'Conteggi delle note non confermate non disponibili',
      });
  }
});

// Authorship: patients/diary-author.ts#authoritativeDiaryAuthor (server-authoritative).

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
// Logic (validation, server-authoritative author, persistence):
// patients/diary-write-service.ts#createPatientDiaryEntry.
router.post('/:patientId/diary', async (req: AuthedRequest, res) => {
  const rawPatientId = req.params.patientId;
  const patientId = (Array.isArray(rawPatientId) ? rawPatientId[0] : rawPatientId) ?? '';
  try {
    // Phase 6: optional idempotency key (retry/double submit never creates a second entry).
    const { requestId, rest } = takeRequestId(req.body);
    const outcome = await runIdempotent(
      'diary.create',
      req.operator!.id,
      requestId,
      { patientId, rest },
      async () => ({
        status: 201,
        body: { entry: await createPatientDiaryEntry(patientId, rest, req.operator!) },
      }),
    );
    if (outcome.replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(outcome.status).json(outcome.body);
  } catch (error) {
    if (error instanceof IdempotencyError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    if (error instanceof DiaryWriteInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
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

// POST /patients/:patientId/diary/:entryId/ack
// «Ho capito» su una voce URGENTE (UX2 W8, patients/diary-ack-service.ts): il primo operatore
// diverso dall'autore prende in carico l'urgenza per tutti (201); se era gia' presa in carico 200
// senza scrivere nulla. 409 se la voce non e' urgente o se chi chiama ne e' l'autore.
// Capability: diary.list (chi puo' leggere il diario puo' prendere in carico l'urgenza).
router.post('/:patientId/diary/:entryId/ack', async (req: AuthedRequest, res) => {
  if (req.body?.purpose !== undefined && !['read', 'urgency'].includes(req.body.purpose)) {
    res.status(400).json({ error: 'Conferma di lettura non valida' });
    return;
  }
  const patientId = String(req.params.patientId ?? '');
  const entryId = String(req.params.entryId ?? '');
  try {
    const result = await acknowledgeDiaryEntry(
      patientId,
      entryId,
      req.operator!,
      req.body?.purpose === 'read' ? 'read' : 'urgency',
    );
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    if (error instanceof UrgencyAckError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    console.error(
      'POST /diary/:entryId/ack error:',
      error instanceof Error ? error.name : 'unknown',
    );
    res.status(500).json({ error: 'Errore nella presa in carico dell’urgenza' });
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
// Sola lettura: regole deterministiche, poi proposta AI solo per i campi vuoti; non scrive nulla.
router.post('/:patientId/diary/therapy-preview', async (req: AuthedRequest, res) => {
  // Envelope checks + parse (+ AI fallback): patients/diary-write-service.ts#previewDiaryTherapy.
  try {
    res.status(200).json(await previewDiaryTherapy(req.body));
  } catch (error) {
    if (error instanceof DiaryWriteInputError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

// POST /patients/:patientId/diary/with-therapy  { requestId, entry, therapy }
// Voce di diario (category 'terapia') + terapia in una sola transazione. 201 alla creazione,
// 200 con la coppia esistente quando il requestId e' gia' stato usato per questo paziente con lo
// stesso contenuto; 409 request_id_reused se il contenuto e' diverso. Sospensione, somministrazione
// gia' fatta o modifica (400 intent_not_prescription) e una terapia periodica senza orari espliciti
// (400 schedule_required) non creano nulla.
router.post('/:patientId/diary/with-therapy', async (req: AuthedRequest, res) => {
  const patientId = routePatientId(req);
  // Logic (validation before any DB access, author, transaction, operational audit):
  // patients/diary-write-service.ts#createPatientDiaryEntryWithTherapy.
  try {
    const result = await createPatientDiaryEntryWithTherapy(patientId, req.body, req.operator!);
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
