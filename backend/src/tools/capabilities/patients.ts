// Patients / parameters / clinical record / intake-review tools — thin adapters over the same
// service symbols used by routes/patients.ts, routes/patient-parameter-readings.ts and
// routes/patient-intake-review.ts. No business rule lives here.
//
// Not exposed (see CAPABILITY_CATALOG.json): POST /patients, PATCH /patients/:id, GET /patients/:id,
// GET /patients/:id/cartella, GET /patients/clinical-summary/overview, GET /patients/settings
// (inline handlers → GAP); DELETE /patients/:id (GUI_ONLY); seed/demo-setup (DEV_ONLY);
// GET /patients (410, DEPRECATED).

import { loadPatientIdentityPage } from '../../patients/identity-page.js';
import { loadPatientParametersPage } from '../../patients/parameters-page.js';
import {
  PatientParametersNotFoundError,
  savePatientParameterMonth,
} from '../../patients/parameters-update.js';
import {
  createParameterReading,
  listParameterReadings,
} from '../../patients/parameter-readings.js';
import { saveCartella } from '../../patients/cartella-update.js';
import { loadScopedPatientClinicalSummaries } from '../../patients/clinical-summary-service.js';
import { patientIntakeReview } from '../../intake/patient-review.js';
import { toolError } from '../errors.js';
import { actorOf, type ToolDefinition } from '../types.js';

const queryObject = { type: 'object', additionalProperties: true } as const;
const patientIdField = { type: 'string', minLength: 1 } as const;

export const patientTools: ToolDefinition[] = [
  {
    name: 'patients.list_page',
    domain: 'patients',
    kind: 'read',
    auditKind: 'read',
    description:
      'Pagina (keyset) dell’elenco pazienti visibili all’operatore, con filtri non identificativi (sesso, stanza, ordine roster). La ricerca testuale usa patients.search.',
    sensitivity: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        // Same envelope rule as GET /patients/page: `q` is refused (text search → POST search).
        query: { ...queryObject, not: { required: ['q'] } },
      },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/page',
    services: ['patients/identity-page.ts#loadPatientIdentityPage'],
    handler: async (input, ctx) =>
      loadPatientIdentityPage(
        (input.query as Record<string, unknown> | undefined) ?? {},
        actorOf(ctx),
      ),
  },
  {
    name: 'patients.search',
    domain: 'patients',
    kind: 'read',
    auditKind: 'read',
    description:
      'Ricerca testuale (nome, cognome, codice fiscale) nell’elenco pazienti visibili all’operatore, paginata.',
    sensitivity: 'medium',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['q'],
          // Same envelope rule as POST /patients/page/search: q must be a non-blank string.
          properties: { q: { type: 'string', pattern: '\\S' } },
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /patients/page/search',
    services: ['patients/identity-page.ts#loadPatientIdentityPage'],
    handler: async (input, ctx) =>
      loadPatientIdentityPage(input.body as Record<string, unknown>, actorOf(ctx)),
  },
  {
    name: 'parameters.list_page',
    domain: 'parameters',
    kind: 'read',
    auditKind: 'read',
    description:
      'Pagina (max 25) di pazienti visibili con i soli parametri vitali per l’editor multi-paziente (view, month, year, date, cursor).',
    sensitivity: 'high',
    inputSchema: {
      type: 'object',
      properties: { query: queryObject },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/parameters/page',
    services: ['patients/parameters-page.ts#loadPatientParametersPage'],
    handler: async (input, ctx) =>
      loadPatientParametersPage(
        (input.query as Record<string, unknown> | undefined) ?? {},
        actorOf(ctx),
      ),
  },
  {
    name: 'parameters.save_month',
    domain: 'parameters',
    kind: 'write',
    auditKind: 'update',
    description:
      'Salva (merge) un mese di parametri giornalieri nella cartella del paziente; firma = operatore autenticato.',
    sensitivity: 'high',
    idempotency: 'natural',
    // The route has no requirePatientScope: the service scopes inside its transaction (→ 404).
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId: patientIdField,
        body: {
          type: 'object',
          required: ['month'],
          properties: {
            month: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                mese: { type: 'integer' },
                anno: { type: 'integer' },
                createdAt: { type: 'string' },
                giorni: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'PATCH /patients/:id/parameters',
    services: ['patients/parameters-update.ts#savePatientParameterMonth'],
    // Same translation as the route: PatientParametersNotFoundError → 404.
    mapError: (error) =>
      error instanceof PatientParametersNotFoundError
        ? toolError('not_found', 'Paziente non trovato', { domainCode: 'patient_not_found' })
        : undefined,
    handler: async (input, ctx) => {
      const patientId = String(input.patientId);
      const month = await savePatientParameterMonth(patientId, input.body, actorOf(ctx));
      return { patientId, month };
    },
  },
  {
    name: 'parameters.list_readings',
    domain: 'parameters',
    kind: 'read',
    auditKind: 'read',
    description:
      'Storico paginato delle rilevazioni di parametri vitali di un paziente (filtri date/month, limit, cursor).',
    sensitivity: 'high',
    // Route has no requirePatientScope: the service asserts scope (→ 404 not_found).
    inputSchema: {
      type: 'object',
      required: ['patientId'],
      properties: { patientId: patientIdField, query: queryObject },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/:id/parameter-readings',
    services: ['patients/parameter-readings.ts#listParameterReadings'],
    handler: async (input, ctx) =>
      listParameterReadings(
        String(input.patientId),
        (input.query as Record<string, unknown> | undefined) ?? {},
        actorOf(ctx),
      ),
  },
  {
    name: 'parameters.create_reading',
    domain: 'parameters',
    kind: 'write',
    auditKind: 'create',
    description:
      'Registra una rilevazione di parametri vitali (PA, FC, SpO2, temperatura, …) per un paziente; idempotente tramite body.requestId (UUID).',
    sensitivity: 'high',
    idempotency: 'requestId',
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId: patientIdField,
        body: {
          type: 'object',
          required: ['requestId', 'measuredAt', 'values'],
          properties: {
            requestId: { type: 'string' },
            measuredAt: { type: 'string' },
            values: { type: 'object' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /patients/:id/parameter-readings',
    services: [
      'patients/parameter-reading-input.ts#parseParameterReading',
      'patients/parameter-readings.ts#createParameterReading',
    ],
    handler: async (input, ctx) =>
      createParameterReading(String(input.patientId), input.body, actorOf(ctx)),
  },
  {
    name: 'clinical_record.save',
    domain: 'clinical_record',
    kind: 'write',
    auditKind: 'update',
    description:
      'Sostituisce l’intero JSON della cartella clinica del paziente (lock di riga; storico Tinetti/NRS legacy di sola lettura; il codice fiscale viene scartato).',
    sensitivity: 'critical',
    idempotency: 'natural',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId: patientIdField,
        body: {
          type: 'object',
          required: ['data'],
          properties: { data: { type: 'object' } },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'PUT /patients/:id/cartella',
    services: ['patients/cartella-update.ts#saveCartella'],
    handler: async (input, ctx) => {
      const patientId = String(input.patientId);
      const { data } = input.body as { data: unknown };
      const cartella = await saveCartella(patientId, data, actorOf(ctx));
      return { patientId, data: cartella.data };
    },
  },
  {
    name: 'patients.clinical_summary',
    domain: 'patients',
    kind: 'read',
    auditKind: 'read',
    description:
      'Riepilogo clinico sintetico (stato ricovero, parametri critici, rischi, allergie, terapie, urgenze da prendere in carico) per max 100 pazienti visibili.',
    sensitivity: 'high',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'object',
          required: ['patientIds'],
          properties: { patientIds: { type: 'string', description: 'id separati da virgola' } },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/clinical-summary',
    services: ['patients/clinical-summary-service.ts#loadScopedPatientClinicalSummaries'],
    // Same function as the route: out-of-scope ids are silently dropped.
    handler: async (input, ctx) =>
      loadScopedPatientClinicalSummaries(
        (input.query as Record<string, unknown>).patientIds,
        actorOf(ctx),
      ),
  },
  {
    name: 'intake.patient_review',
    domain: 'intake',
    kind: 'read',
    auditKind: 'read',
    description:
      'Revisione ingresso del paziente: bozze confermate, terapie differite da verificare, dolore legacy e documenti collegati.',
    sensitivity: 'high',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId'],
      properties: { patientId: patientIdField },
      additionalProperties: false,
    },
    entryPoint: 'GET /patients/:id/intake-review',
    services: ['intake/patient-review.ts#patientIntakeReview'],
    handler: async (input, ctx) => patientIntakeReview(String(input.patientId), actorOf(ctx)),
  },
];
