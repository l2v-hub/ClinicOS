// Therapy + administration tools — thin adapters over therapies/therapy-slots (slot agenda),
// therapies/therapy-create (prescription create, the helper shared with the intake confirm) and
// therapies/administration-record (the Serializable erogata/non_erogata upsert moved verbatim out
// of routes/therapy.ts so the route and the tool share one implementation).
// Hard delete of a therapy is deliberately NOT a tool (GUI only in Phase 1).

import { parseIsoCalendarDate } from '../../appointments/list-query.js';
import { InvalidTherapySchedulesError, TherapyDateRangeError } from '../../lib/therapy-dose.js';
import { prisma } from '../../lib/prisma.js';
import { therapySlotPatientAccess } from '../../routes/therapy.js';
import {
  recordTherapyAdministration,
  TherapyAlreadyAdministeredError,
} from '../../therapies/administration-record.js';
import { parseTherapySlotPageQuery } from '../../therapies/slot-page-query.js';
import { createTherapyInTx, type TherapyCreateInput } from '../../therapies/therapy-create.js';
import {
  buildTherapySlotPage,
  buildTherapySlots,
  TherapySlotCapacityError,
} from '../../therapies/therapy-slots.js';
import { TherapyNotDueError, TherapyNotFoundError } from '../../therapies/therapy-write.js';
import { toolError } from '../errors.js';
import { actorOf, type ToolDefinition, type ToolErrorShape } from '../types.js';

// Same translation as routes/therapy.ts and routes/patient-therapies.ts for errors that carry no
// numeric status (TherapyWriteInputError/RosterError keep their own status via the generic map;
// *InputError / *QueryError classes become invalid_input there as well).
function mapTherapyError(error: unknown): ToolErrorShape | undefined {
  if (error instanceof TherapySlotCapacityError) {
    return toolError('unprocessable', error.message, { domainCode: 'capacity' });
  }
  if (error instanceof TherapyNotDueError) {
    return toolError('conflict', error.message, { domainCode: 'therapy_not_due' });
  }
  if (error instanceof TherapyNotFoundError) {
    return toolError('not_found', error.message, { domainCode: 'therapy_not_found' });
  }
  if (error instanceof TherapyAlreadyAdministeredError) {
    return toolError('conflict', 'Terapia già erogata', { domainCode: 'already_administered' });
  }
  if (error instanceof InvalidTherapySchedulesError || error instanceof TherapyDateRangeError) {
    return toolError('invalid_input', error.message);
  }
  return undefined;
}

const dateQuery = {
  type: 'object',
  required: ['date'],
  properties: { date: { type: 'string', minLength: 1, description: 'YYYY-MM-DD' } },
} as const;

const administrationBody = {
  type: 'object',
  required: ['patientId', 'therapyId', 'date', 'fascia'],
  properties: {
    patientId: { type: 'string' },
    therapyId: { type: 'string' },
    date: { type: 'string', description: 'YYYY-MM-DD' },
    fascia: { type: 'string', description: 'mattina | pranzo | pomeriggio | sera | notte' },
  },
} as const;

export const therapyTools: ToolDefinition[] = [
  {
    name: 'administration.list_slots',
    domain: 'administration',
    kind: 'read',
    auditKind: 'read',
    description:
      'Slot di somministrazione del giorno (query.date) raggruppati per fascia e paziente, limitati ai pazienti nello scope dell’operatore; fallisce (unprocessable) oltre la capacità invece di troncare.',
    sensitivity: 'high',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: { query: dateQuery },
      additionalProperties: false,
    },
    entryPoint: 'GET /therapy-slots',
    services: [
      'appointments/list-query.ts#parseIsoCalendarDate',
      'routes/therapy.ts#therapySlotPatientAccess',
      'therapies/therapy-slots.ts#buildTherapySlots',
    ],
    mapError: mapTherapyError,
    handler: async (input, ctx) => {
      const query = input.query as { date: string };
      return buildTherapySlots(
        parseIsoCalendarDate(query.date, 'date'),
        therapySlotPatientAccess(actorOf(ctx)),
      );
    },
  },
  {
    name: 'administration.list_slots_page',
    domain: 'administration',
    kind: 'read',
    auditKind: 'read',
    description:
      'Agenda somministrazioni del giorno paginata a cursore (query.date, limit, cursor, sort, direction, contextId), con riepiloghi esatti e roster.',
    sensitivity: 'high',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: { query: { ...dateQuery, additionalProperties: true } },
      additionalProperties: false,
    },
    entryPoint: 'GET /therapy-slots/page',
    services: [
      'appointments/list-query.ts#parseIsoCalendarDate',
      'therapies/slot-page-query.ts#parseTherapySlotPageQuery',
      'routes/therapy.ts#therapySlotPatientAccess',
      'therapies/therapy-slots.ts#buildTherapySlotPage',
    ],
    mapError: mapTherapyError,
    // Returns the service page as-is ({slots, roster, pageInfo{hasMore,nextCursor,loadedTherapies}});
    // the route additionally derives `completeness` (from hasMore) and `summaryExact` (!cursor).
    handler: async (input, ctx) => {
      const query = input.query as Record<string, unknown> & { date: string };
      const actor = actorOf(ctx);
      return buildTherapySlotPage(
        parseIsoCalendarDate(query.date, 'date'),
        therapySlotPatientAccess(actor),
        parseTherapySlotPageQuery(query),
        actor,
      );
    },
  },
  {
    name: 'administration.confirm',
    domain: 'administration',
    kind: 'write',
    auditKind: 'create',
    description:
      'Registra la somministrazione (stato erogata) di una terapia prescritta per data e fascia. Farmaco, dose, via e ora sono risolti dalla prescrizione lato server; l’operatore è quello autenticato. Rifiuta slot non previsti o già erogati.',
    sensitivity: 'critical',
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: { body: administrationBody },
      additionalProperties: false,
    },
    entryPoint: 'POST /therapy-slots/confirm',
    services: [
      'therapies/therapy-write.ts#parseTherapyAdministrationBody',
      'therapies/therapy-write.ts#resolveAuthoritativeTherapy',
      'therapies/administration-record.ts#recordTherapyAdministration',
    ],
    mapError: mapTherapyError,
    handler: async (input, ctx) =>
      recordTherapyAdministration(input.body, actorOf(ctx), { notAdministered: false }),
  },
  {
    name: 'administration.record_not_administered',
    domain: 'administration',
    kind: 'write',
    auditKind: 'create',
    description:
      'Registra la mancata somministrazione (stato non_erogata) con motivo e nota per data e fascia; non può sovrascrivere uno slot già erogato.',
    sensitivity: 'critical',
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          ...administrationBody,
          required: ['patientId', 'therapyId', 'date', 'fascia', 'motivo'],
          properties: {
            ...administrationBody.properties,
            motivo: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /therapy-slots/not-administered',
    services: [
      'therapies/therapy-write.ts#parseTherapyAdministrationBody',
      'therapies/therapy-write.ts#resolveAuthoritativeTherapy',
      'therapies/administration-record.ts#recordTherapyAdministration',
    ],
    mapError: (error) =>
      error instanceof TherapyAlreadyAdministeredError
        ? toolError('conflict', 'Terapia già erogata: stato non modificabile', {
            domainCode: 'already_administered',
          })
        : mapTherapyError(error),
    handler: async (input, ctx) =>
      recordTherapyAdministration(input.body, actorOf(ctx), { notAdministered: true }),
  },
  {
    name: 'therapy.create',
    domain: 'therapy',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea una prescrizione (PatientTherapy + orari) per un paziente nello scope dell’operatore; farmacoNome e dataInizio obbligatori, operatore inseritore = operatore autenticato.',
    sensitivity: 'critical',
    idempotency: 'none',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId: { type: 'string', minLength: 1 },
        body: {
          type: 'object',
          properties: {
            farmacoNome: { type: 'string' },
            dataInizio: { type: 'string', description: 'YYYY-MM-DD' },
            dataFine: { type: 'string' },
            dosaggio: { type: 'string' },
            viaSomministrazione: { type: 'string' },
            tipo: { type: 'string' },
            stato: { type: 'string' },
            prescrittore: { type: 'string' },
            note: { type: 'string' },
            giorniSettimana: { description: 'ISO weekdays 1..7, comma string or array' },
            schedules: { description: 'structured schedules (validated by the service)' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /patients/:patientId/therapies',
    services: [
      'therapies/therapy-create.ts#validateTherapyCreateInput',
      'therapies/therapy-create.ts#createTherapyInTx',
    ],
    mapError: mapTherapyError,
    handler: async (input, ctx) => {
      const actor = actorOf(ctx);
      // Same envelope as the route: client body + server-owned inserting operator.
      const body = {
        ...(input.body as TherapyCreateInput),
        operatoreInseritore: actor.name || actor.id,
      };
      return prisma.$transaction((tx) => createTherapyInTx(tx, String(input.patientId), body));
    },
  },
];
