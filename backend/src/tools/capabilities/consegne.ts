// Consegne (handover) tools — thin adapters over consegne/read-service, consegne/patient-summary
// and services/consegna-service (the same symbols used by routes/consegne.ts and by Agnos).

import { parseConsegnaFeedQuery } from '../../consegne/query.js';
import { loadConsegnaFeed, loadConsegnaOverview } from '../../consegne/read-service.js';
import { loadConsegnaPatientSummary } from '../../consegne/patient-summary.js';
import { parseConsegnaCreateBody } from '../../consegne/write-validation.js';
import { ConsegnaCreationError } from '../../consegne/create-receipt.js';
import { createConsegna, ConsegnaPatientNotFoundError } from '../../services/consegna-service.js';
import { toolError } from '../errors.js';
import { actorOf, type ToolDefinition } from '../types.js';

const queryObject = { type: 'object', additionalProperties: true } as const;

export const consegneTools: ToolDefinition[] = [
  {
    name: 'consegne.list',
    domain: 'consegne',
    kind: 'read',
    auditKind: 'read',
    description:
      'Elenco paginato (keyset) delle consegne visibili all’operatore, con riepilogo esatto e identità paziente.',
    sensitivity: 'medium',
    inputSchema: {
      type: 'object',
      properties: { query: queryObject },
      additionalProperties: false,
    },
    entryPoint: 'GET /consegne',
    services: [
      'consegne/query.ts#parseConsegnaFeedQuery',
      'consegne/read-service.ts#loadConsegnaFeed',
    ],
    handler: async (input, ctx) =>
      loadConsegnaFeed(
        actorOf(ctx),
        parseConsegnaFeedQuery((input.query as Record<string, unknown> | undefined) ?? {}),
      ),
  },
  {
    name: 'consegne.overview',
    domain: 'consegne',
    kind: 'read',
    auditKind: 'read',
    description:
      'Riepilogo consegne per dashboard (urgenti, aperte, per operatore se privilegiato).',
    sensitivity: 'medium',
    inputSchema: { type: 'object', additionalProperties: false },
    entryPoint: 'GET /consegne/overview',
    services: ['consegne/read-service.ts#loadConsegnaOverview'],
    handler: async (_input, ctx) => loadConsegnaOverview(actorOf(ctx)),
  },
  {
    name: 'consegne.patient_summary',
    domain: 'consegne',
    kind: 'read',
    auditKind: 'read',
    description: 'Conteggi consegne per un insieme di pazienti (max 50) visibili all’operatore.',
    sensitivity: 'medium',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['patientIds'],
          properties: { patientIds: { type: 'array', items: { type: 'string' } } },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /consegne/patient-summary',
    services: ['consegne/patient-summary.ts#loadConsegnaPatientSummary'],
    handler: async (input, ctx) => loadConsegnaPatientSummary(input.body, actorOf(ctx)),
  },
  {
    name: 'consegne.create',
    domain: 'consegne',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea una consegna per un paziente nello scope dell’operatore; idempotente tramite body.requestId.',
    sensitivity: 'high',
    idempotency: 'requestId',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['pazienteId', 'priorita', 'tipo', 'note'],
          properties: {
            pazienteId: { type: 'string' },
            priorita: { type: 'string', enum: ['normale', 'alta', 'urgente'] },
            tipo: { type: 'string' },
            note: { type: 'string' },
            scadenza: { type: ['string', 'null'] },
            oraScadenza: { type: ['string', 'null'] },
            operatoreAssegnatoId: { type: ['string', 'null'] },
            requestId: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /consegne',
    services: [
      'consegne/write-validation.ts#parseConsegnaCreateBody',
      'services/consegna-service.ts#createConsegna',
    ],
    mapError: (error) => {
      if (error instanceof ConsegnaCreationError) {
        return {
          code: error.status === 410 ? 'gone' : 'conflict',
          status: error.status,
          message: error.message,
          domainCode: error.code,
          details: { ...error.ids },
        };
      }
      if (error instanceof ConsegnaPatientNotFoundError) {
        return toolError('not_found', 'Paziente non trovato', { domainCode: 'patient_not_found' });
      }
      return undefined;
    },
    handler: async (input, ctx) =>
      createConsegna(parseConsegnaCreateBody(input.body), actorOf(ctx)),
  },
];
