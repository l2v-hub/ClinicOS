// Diary write compositions, extracted verbatim from routes/patient-diary.ts (POST /diary and
// POST /diary/with-therapy) so the HTTP route and the Tool Layer run the same code path.
// PRIVACY: clinical text never reaches logs or audit here (audit = field NAMES only).

import type { PatientDiaryEntry } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { recordOperationalAudit } from '../ai/audit-store.js';
import { prisma } from '../lib/prisma.js';
import { InvalidTherapySchedulesError, TherapyDateRangeError } from '../lib/therapy-dose.js';
import { TherapyInputError } from '../therapies/input-validation.js';
import { authoritativeDiaryAuthor } from './diary-author.js';
import {
  assertPrescriptionEntry,
  createDiaryEntryWithTherapy,
  DiaryTherapyInputError,
  diaryTherapyAuditFields,
  parseTherapyRequestId,
  prepareDiaryTherapyInput,
  type DiaryTherapyResult,
} from './diary-therapy-service.js';
import { parseDiaryTherapyText } from '../therapies/diary-therapy-parse.js';
import {
  DIARY_TIME_ZONE,
  DiaryWriteInputError,
  parseDiaryCreateBody,
} from './diary-write-validation.js';

/** Validation errors of the diary+therapy composition (route → 400). */
export function isTherapyValidationError(error: unknown): error is Error {
  return (
    error instanceof DiaryWriteInputError ||
    error instanceof DiaryTherapyInputError ||
    error instanceof TherapyInputError ||
    error instanceof InvalidTherapySchedulesError ||
    error instanceof TherapyDateRangeError ||
    (error instanceof Error && error.message.includes('Campi obbligatori'))
  );
}

/**
 * POST /patients/:patientId/diary. Validates the body (DiaryWriteInputError → 400), derives the
 * author from the authenticated operator (client author fields are discarded) and persists.
 */
export async function createPatientDiaryEntry(
  patientId: string,
  body: unknown,
  actor: Operator,
): Promise<PatientDiaryEntry> {
  const input = parseDiaryCreateBody(body);

  if (!patientId) {
    throw new DiaryWriteInputError('patientId non valido');
  }

  const author = await authoritativeDiaryAuthor(actor);
  return prisma.patientDiaryEntry.create({
    data: {
      patientId,
      ...author,
      ...input,
    },
  });
}

/**
 * POST /patients/:patientId/diary/with-therapy  { requestId, entry, therapy }.
 * Everything is validated before touching the database; then diary entry + therapy are created
 * in one transaction (replay by requestId returns the existing pair, `replay: true`).
 * Records the operational audit (field names only) exactly as the route did.
 */
export async function createPatientDiaryEntryWithTherapy(
  patientId: string,
  rawBody: unknown,
  actor: Operator,
): Promise<DiaryTherapyResult> {
  const body = rawBody as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DiaryWriteInputError('Corpo richiesta non valido');
  }
  const unknownKey = Object.keys(body).find(
    (k) => k !== 'requestId' && k !== 'entry' && k !== 'therapy',
  );
  if (unknownKey) {
    throw new DiaryWriteInputError(`Campo non consentito: ${unknownKey}`);
  }

  const requestId = parseTherapyRequestId(body.requestId);
  const entry = parseDiaryCreateBody(body.entry);
  assertPrescriptionEntry(entry);
  const therapy = prepareDiaryTherapyInput(body.therapy, actor.name || actor.id);

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
  return result;
}

// ── Anteprima terapia dal testo (POST /diary/therapy-preview), moved verbatim from the route ──

export const MAX_THERAPY_PREVIEW_CHARS = 2000;
const TODAY_IN_FACILITY = new Intl.DateTimeFormat('en-CA', {
  timeZone: DIARY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Read-only deterministic preview of a prescription written in diary text. Envelope errors throw
 * DiaryWriteInputError (route → 400 with the same messages); nothing is written or logged.
 */
export function previewDiaryTherapy(rawBody: unknown) {
  const body = rawBody as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DiaryWriteInputError('Corpo richiesta non valido');
  }
  const unknownKey = Object.keys(body).find((k) => k !== 'text' && k !== 'entryDateTime');
  if (unknownKey) {
    throw new DiaryWriteInputError(`Campo non consentito: ${unknownKey}`);
  }
  const { text, entryDateTime } = body;
  if (typeof text !== 'string' || !text.trim()) {
    throw new DiaryWriteInputError('text obbligatorio');
  }
  if (text.length > MAX_THERAPY_PREVIEW_CHARS) {
    throw new DiaryWriteInputError(`text supera ${MAX_THERAPY_PREVIEW_CHARS} caratteri`);
  }
  if (
    entryDateTime !== undefined &&
    (typeof entryDateTime !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(entryDateTime))
  ) {
    throw new DiaryWriteInputError('entryDateTime non valida');
  }
  const entryDate =
    typeof entryDateTime === 'string' ? entryDateTime : TODAY_IN_FACILITY.format(new Date());
  const parsed = parseDiaryTherapyText(text, entryDate);
  return { ...parsed, source: 'deterministic' as const };
}
