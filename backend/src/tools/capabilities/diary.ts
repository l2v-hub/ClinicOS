// Diary tools — thin adapters over the SAME symbols used by routes/patient-diary.ts:
// patients/diary-read-service (list), patients/diary-write-service (create, create with therapy;
// extracted verbatim from the route) and therapies/diary-therapy-parse (deterministic preview).
// All tools are patient-scoped: the registry applies the `requirePatientScope` check.

import { loadPatientDiary } from '../../patients/diary-read-service.js';
import {
  DiaryTherapyInputError,
  DiaryTherapyReplayConflictError,
} from '../../patients/diary-therapy-service.js';
import {
  createPatientDiaryEntry,
  createPatientDiaryEntryWithTherapy,
  isTherapyValidationError,
  previewDiaryTherapy,
} from '../../patients/diary-write-service.js';
import { ToolError, toolError } from '../errors.js';
import { actorOf, type ToolDefinition } from '../types.js';

const patientId = { type: 'string', minLength: 1 } as const;
const queryObject = { type: 'object', additionalProperties: true } as const;

// Documentation of the known fields; parseDiaryCreateBody validates the content.
const diaryEntryBody = {
  type: 'object',
  properties: {
    title: { type: ['string', 'null'] },
    content: { type: 'string' },
    priority: { type: 'string' },
    status: { type: 'string' },
    entryDateTime: { type: 'string' },
    category: { type: ['string', 'null'] },
  },
} as const;

export const diaryTools: ToolDefinition[] = [
  {
    name: 'diary.list',
    domain: 'diary',
    kind: 'read',
    auditKind: 'read',
    description:
      'Diario clinico del paziente (voci di diario + consegne visibili), paginato keyset; filtri authorType, from, to, limit, cursor.',
    sensitivity: 'high',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId'],
      properties: { patientId, query: queryObject },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/:patientId/diary',
    services: ['patients/diary-read-service.ts#loadPatientDiary'],
    handler: async (input, ctx) => {
      const page = await loadPatientDiary(
        String(input.patientId),
        (input.query as Record<string, unknown> | undefined) ?? {},
        actorOf(ctx),
      );
      if (!page) {
        throw new ToolError('not_found', 'Paziente non trovato', {
          domainCode: 'patient_not_found',
        });
      }
      return page;
    },
  },
  {
    name: 'diary.create',
    domain: 'diary',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea una voce di diario; autore (authorType/authorName) derivato dal server dall’operatore autenticato, mai dal client.',
    sensitivity: 'high',
    patientScoped: true,
    idempotency: 'none',
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: { patientId, body: diaryEntryBody },
      additionalProperties: false,
    },
    entryPoint: 'POST /patients/:patientId/diary',
    services: [
      'patients/diary-write-service.ts#createPatientDiaryEntry',
      'patients/diary-write-validation.ts#parseDiaryCreateBody',
      'patients/diary-author.ts#authoritativeDiaryAuthor',
    ],
    handler: async (input, ctx) => ({
      entry: await createPatientDiaryEntry(String(input.patientId), input.body, actorOf(ctx)),
    }),
  },
  {
    name: 'diary.therapy_preview',
    domain: 'diary',
    kind: 'read',
    auditKind: 'read',
    description:
      'Anteprima deterministica (sola lettura) di una prescrizione scritta nel testo di una voce di diario; non scrive nulla.',
    sensitivity: 'medium',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId,
        body: {
          type: 'object',
          // Documentation only: previewDiaryTherapy validates with the route's messages.
          properties: {
            text: { type: 'string', description: 'testo non vuoto, max 2000 caratteri' },
            entryDateTime: {
              type: 'string',
              description: 'YYYY-MM-DD…; default oggi (Europe/Rome)',
            },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /patients/:patientId/diary/therapy-preview',
    services: [
      'patients/diary-write-service.ts#previewDiaryTherapy',
      'therapies/diary-therapy-parse.ts#parseDiaryTherapyText',
    ],
    handler: async (input) => previewDiaryTherapy(input.body),
  },
  {
    name: 'diary.create_with_therapy',
    domain: 'diary',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea in una transazione una voce di diario (categoria terapia) e la terapia prescritta; idempotente tramite body.requestId (replay → stessa coppia, contenuto diverso → conflict).',
    sensitivity: 'critical',
    patientScoped: true,
    idempotency: 'requestId',
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId,
        body: {
          type: 'object',
          required: ['requestId', 'entry', 'therapy'],
          properties: {
            requestId: { type: 'string' },
            entry: diaryEntryBody,
            therapy: { type: 'object' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /patients/:patientId/diary/with-therapy',
    services: [
      'patients/diary-write-service.ts#createPatientDiaryEntryWithTherapy',
      'patients/diary-therapy-service.ts#createDiaryEntryWithTherapy',
    ],
    mapError: (error) => {
      if (error instanceof DiaryTherapyReplayConflictError) {
        return toolError('conflict', error.message, { domainCode: error.code });
      }
      if (error instanceof DiaryTherapyInputError) {
        const details = {
          ...(error.fasciaConflicts.length ? { fasciaConflicts: error.fasciaConflicts } : {}),
          ...(error.intent ? { intent: error.intent } : {}),
        };
        return toolError('invalid_input', error.message, {
          domainCode: error.code,
          ...(Object.keys(details).length ? { details } : {}),
        });
      }
      if (isTherapyValidationError(error)) return toolError('invalid_input', error.message);
      return undefined;
    },
    handler: async (input, ctx) => {
      const result = await createPatientDiaryEntryWithTherapy(
        String(input.patientId),
        input.body,
        actorOf(ctx),
      );
      return { entry: result.entry, therapy: result.therapy, replayed: result.replay };
    },
  },
];
