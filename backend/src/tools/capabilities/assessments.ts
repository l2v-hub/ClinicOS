// Assessments (clinical scales) tools — thin adapters over the assessments/* services used by
// routes/patient-assessments.ts. The route has no requirePatientScope middleware: every service
// scopes the patient itself (assessments/access.ts lockPatient / assessmentWhere), so these tools
// are not `patientScoped` and an out-of-scope patient surfaces as the service's own 404
// (`assessment_not_found`). AssessmentError carries status/code/details → generic error mapping.

import { createAssessment, getAssessment, patchAssessment } from '../../assessments/service.js';
import { listAssessments } from '../../assessments/history.js';
import { retryAssessmentPdf } from '../../assessments/pdf-service.js';
import { bodyObject } from '../../assessments/input.js';
import { finalizeAssessmentWithPdf } from '../../assessments/finalize.js';
import { currentAssessment } from '../../assessments/current.js';
import { assessmentCatalog } from '../../assessments/catalog.js';
import { attestAssessment, listAttestations } from '../../assessments/attestations.js';
import { actorOf, type ToolDefinition } from '../types.js';
import { ASSESSMENT_TYPES as ALL_ASSESSMENT_TYPES } from '../../assessments/types.js';

const ASSESSMENT_TYPES = [...ALL_ASSESSMENT_TYPES];
const ENTRY = 'backend/src/routes/patient-assessments.ts';
const patientIdField = { type: 'string', minLength: 1 } as const;
const idField = { type: 'string', minLength: 1 } as const;
const queryObject = { type: 'object', additionalProperties: true } as const;
const bodyEnvelope = { type: 'object', additionalProperties: true } as const;

const pid = (input: Record<string, unknown>) => String(input.patientId);
const aid = (input: Record<string, unknown>) => String(input.assessmentId);
const query = (input: Record<string, unknown>) =>
  (input.query as Record<string, unknown> | undefined) ?? {};

function schema(properties: Record<string, unknown>, required: string[]): Record<string, unknown> {
  return { type: 'object', required, properties, additionalProperties: false };
}

export const assessmentTools: ToolDefinition[] = [
  {
    name: 'assessments.catalog',
    domain: 'assessments',
    kind: 'read',
    auditKind: 'read',
    description:
      'Catalogo delle scale di valutazione (PAINAD, trasferimenti, Tinetti, MNA-SF, GDS-15, Barthel, UCLA-NPI sonno) del paziente con ultima finale e bozze proprie.',
    sensitivity: 'medium',
    inputSchema: schema({ patientId: patientIdField, query: queryObject }, ['patientId']),
    entryPoint: `GET /patients/:patientId/assessments/catalog (${ENTRY})`,
    services: ['assessments/catalog.ts#assessmentCatalog'],
    handler: async (input, ctx) => assessmentCatalog(pid(input), query(input), actorOf(ctx)),
  },
  {
    name: 'assessments.current',
    domain: 'assessments',
    kind: 'read',
    auditKind: 'read',
    description: 'Valutazione finale corrente (non rettificata) di un tipo di scala.',
    sensitivity: 'high',
    inputSchema: schema(
      {
        patientId: patientIdField,
        query: {
          type: 'object',
          required: ['type'],
          properties: { type: { type: 'string', enum: ASSESSMENT_TYPES } },
        },
      },
      ['patientId', 'query'],
    ),
    entryPoint: `GET /patients/:patientId/assessments/current (${ENTRY})`,
    services: ['assessments/current.ts#currentAssessment'],
    handler: async (input, ctx) => ({
      assessment: await currentAssessment(pid(input), query(input), actorOf(ctx)),
    }),
  },
  {
    name: 'assessments.list',
    domain: 'assessments',
    kind: 'read',
    auditKind: 'read',
    description:
      'Storico paginato delle valutazioni del paziente (filtri type/status/from/to, cursore). Le bozze sono visibili solo all’autore.',
    sensitivity: 'high',
    inputSchema: schema(
      {
        patientId: patientIdField,
        query: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string' },
            limit: { type: 'string' },
            cursor: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
          },
        },
      },
      ['patientId'],
    ),
    entryPoint: `GET /patients/:patientId/assessments (${ENTRY})`,
    services: ['assessments/history.ts#listAssessments'],
    handler: async (input, ctx) => listAssessments(pid(input), query(input), actorOf(ctx)),
  },
  {
    name: 'assessments.get',
    domain: 'assessments',
    kind: 'read',
    auditKind: 'read',
    description: 'Dettaglio di una valutazione (risposte, punteggio, stato PDF).',
    sensitivity: 'high',
    inputSchema: schema({ patientId: patientIdField, assessmentId: idField }, [
      'patientId',
      'assessmentId',
    ]),
    entryPoint: `GET /patients/:patientId/assessments/:id (${ENTRY})`,
    services: ['assessments/service.ts#getAssessment'],
    handler: async (input, ctx) => ({
      assessment: await getAssessment(pid(input), aid(input), actorOf(ctx)),
    }),
  },
  {
    name: 'assessments.create_draft',
    domain: 'assessments',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea una bozza di valutazione (type + formVersion + assessedAt + answers); idempotente tramite body.requestId (UUID).',
    sensitivity: 'high',
    idempotency: 'requestId',
    inputSchema: schema(
      {
        patientId: patientIdField,
        body: {
          type: 'object',
          required: ['requestId', 'type', 'formVersion', 'assessedAt', 'answers'],
          properties: {
            requestId: { type: 'string' },
            type: { type: 'string', enum: ASSESSMENT_TYPES },
            formVersion: { type: 'string' },
            assessedAt: { type: 'string' },
            answers: { type: 'object' },
            predecessorId: { type: ['string', 'null'] },
            correctionReason: { type: ['string', 'null'] },
          },
        },
      },
      ['patientId', 'body'],
    ),
    entryPoint: `POST /patients/:patientId/assessments (${ENTRY})`,
    services: ['assessments/service.ts#createAssessment'],
    handler: async (input, ctx) => createAssessment(pid(input), input.body, actorOf(ctx)),
  },
  {
    name: 'assessments.update_draft',
    domain: 'assessments',
    kind: 'write',
    auditKind: 'update',
    description:
      'Aggiorna una bozza propria (answers, assessedAt) con controllo di versione ottimistico (expectedVersion).',
    sensitivity: 'high',
    idempotency: 'natural',
    inputSchema: schema(
      {
        patientId: patientIdField,
        assessmentId: idField,
        body: {
          type: 'object',
          required: ['expectedVersion', 'assessedAt', 'answers'],
          properties: {
            expectedVersion: { type: 'integer' },
            assessedAt: { type: 'string' },
            answers: { type: 'object' },
            correctionReason: { type: ['string', 'null'] },
          },
        },
      },
      ['patientId', 'assessmentId', 'body'],
    ),
    entryPoint: `PATCH /patients/:patientId/assessments/:id (${ENTRY})`,
    services: ['assessments/service.ts#patchAssessment'],
    handler: async (input, ctx) => ({
      assessment: await patchAssessment(pid(input), aid(input), input.body, actorOf(ctx)),
    }),
  },
  {
    name: 'assessments.finalize',
    domain: 'assessments',
    kind: 'action',
    auditKind: 'update',
    description:
      'Finalizza una bozza (snapshot immutabile) e genera subito il PDF archiviato nei documenti del paziente; idempotente tramite body.requestId.',
    sensitivity: 'critical',
    idempotency: 'requestId',
    inputSchema: schema(
      {
        patientId: patientIdField,
        assessmentId: idField,
        body: {
          type: 'object',
          required: ['requestId', 'expectedVersion'],
          properties: { requestId: { type: 'string' }, expectedVersion: { type: 'integer' } },
        },
      },
      ['patientId', 'assessmentId', 'body'],
    ),
    entryPoint: `POST /patients/:patientId/assessments/:id/finalize (${ENTRY})`,
    services: [
      'assessments/finalize.ts#finalizeAssessmentWithPdf',
      'assessments/service.ts#finalizeAssessment',
      'assessments/pdf-service.ts#retryAssessmentPdf',
    ],
    // Same function as the route (finalize, then PDF when not replayed).
    handler: async (input, ctx) =>
      finalizeAssessmentWithPdf(pid(input), aid(input), input.body, actorOf(ctx)),
  },
  {
    name: 'assessments.retry_pdf',
    domain: 'assessments',
    kind: 'action',
    auditKind: 'action',
    description:
      'Rigenera il PDF di una valutazione finale quando la generazione precedente è fallita.',
    sensitivity: 'high',
    idempotency: 'natural',
    inputSchema: schema({ patientId: patientIdField, assessmentId: idField, body: bodyEnvelope }, [
      'patientId',
      'assessmentId',
    ]),
    entryPoint: `POST /patients/:patientId/assessments/:id/pdf/retry (${ENTRY})`,
    services: ['assessments/input.ts#bodyObject', 'assessments/pdf-service.ts#retryAssessmentPdf'],
    handler: async (input, ctx) => {
      // express.json() yields {} for an empty body: same default here.
      bodyObject(input.body ?? {}, []);
      return { assessment: await retryAssessmentPdf(pid(input), aid(input), actorOf(ctx)) };
    },
  },
  {
    name: 'assessments.list_attestations',
    domain: 'assessments',
    kind: 'read',
    auditKind: 'read',
    description:
      'Conferme (presa visione / conferma fisioterapista) di una scheda trasferimenti finale, paginate.',
    sensitivity: 'medium',
    inputSchema: schema(
      {
        patientId: patientIdField,
        assessmentId: idField,
        query: {
          type: 'object',
          properties: { limit: { type: 'string' }, cursor: { type: 'string' } },
        },
      },
      ['patientId', 'assessmentId'],
    ),
    entryPoint: `GET /patients/:patientId/assessments/:id/attestations (${ENTRY})`,
    services: ['assessments/attestations.ts#listAttestations'],
    handler: async (input, ctx) =>
      listAttestations(pid(input), aid(input), query(input), actorOf(ctx)),
  },
  {
    name: 'assessments.attest',
    domain: 'assessments',
    kind: 'write',
    auditKind: 'create',
    description:
      'Registra la conferma dell’operatore su una scheda trasferimenti finale (kind + snapshotSha256); idempotente per operatore/tipo.',
    sensitivity: 'high',
    idempotency: 'natural',
    inputSchema: schema(
      {
        patientId: patientIdField,
        assessmentId: idField,
        body: {
          type: 'object',
          required: ['kind', 'snapshotSha256'],
          properties: {
            kind: {
              type: 'string',
              enum: ['operator_acknowledgement', 'physiotherapist_confirmation'],
            },
            snapshotSha256: { type: 'string' },
          },
        },
      },
      ['patientId', 'assessmentId', 'body'],
    ),
    entryPoint: `POST /patients/:patientId/assessments/:id/attestations (${ENTRY})`,
    services: ['assessments/attestations.ts#attestAssessment'],
    handler: async (input, ctx) =>
      attestAssessment(pid(input), aid(input), input.body, actorOf(ctx)),
  },
];
