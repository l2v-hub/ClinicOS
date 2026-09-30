// Agenda tools — adapters over services/appointment-service (the service shared by
// routes/appointments.ts and the Agnos create/update actions).
// `appointments.delete` is deliberately NOT a tool: SPEC-015 FR-010 keeps deletion UI-only.

import {
  AppointmentForbiddenError,
  AppointmentNotFoundError,
  AppointmentViewCapacityError,
  SlotConflictError,
  createAppointment,
  listAppointments,
  updateAppointment,
  type AppointmentActor,
} from '../../services/appointment-service.js';
import { parseAppointmentListQuery } from '../../appointments/list-query.js';
import {
  parseAppointmentCreateBody,
  parseAppointmentId,
  parseAppointmentPatchBody,
} from '../../appointments/write-validation.js';
import { toolError } from '../errors.js';
import type { ToolContext, ToolDefinition, ToolErrorShape } from '../types.js';

function appointmentActor(ctx: ToolContext): AppointmentActor {
  return {
    operatorId: ctx.identity.operatorId,
    role: ctx.identity.role,
    name: ctx.identity.name,
  };
}

// Same translation as routes/appointments.ts (status per error class).
function mapAppointmentError(error: unknown): ToolErrorShape | undefined {
  if (error instanceof AppointmentForbiddenError) {
    return toolError('forbidden', error.message, { domainCode: 'forbidden' });
  }
  if (error instanceof AppointmentNotFoundError) {
    return toolError('not_found', error.message, { domainCode: 'not_found' });
  }
  if (error instanceof SlotConflictError) {
    return toolError('conflict', error.message, { domainCode: 'slot_conflict' });
  }
  if (error instanceof AppointmentViewCapacityError) {
    return toolError('unprocessable', error.message, { domainCode: 'capacity' });
  }
  if (
    error instanceof Error &&
    (/non valida/.test(error.message) || error.message.includes('Foreign key'))
  ) {
    return toolError('invalid_input', error.message, { domainCode: 'bad_request' });
  }
  return undefined;
}

const appointmentBody = {
  type: 'object',
  properties: {
    patientId: { type: 'string' },
    operatorId: { type: 'string' },
    data: { type: 'string', description: 'YYYY-MM-DD' },
    ora: { type: 'string', description: 'HH:MM, slot da 30 minuti' },
    tipologia: { type: 'string' },
    note: { type: 'string' },
    durata: { type: 'number' },
    stato: { type: 'string' },
  },
} as const;

export const appointmentTools: ToolDefinition[] = [
  {
    name: 'appointments.list',
    domain: 'agenda',
    kind: 'read',
    auditKind: 'read',
    description:
      'Appuntamenti in un giorno (query.date) o intervallo (query.from/query.to, max 42 giorni); operatorId filtrabile solo da ruoli privilegiati.',
    sensitivity: 'medium',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: { query: { type: 'object', additionalProperties: true } },
      additionalProperties: false,
    },
    entryPoint: 'GET /appointments',
    services: [
      'appointments/list-query.ts#parseAppointmentListQuery',
      'services/appointment-service.ts#listAppointments',
    ],
    mapError: mapAppointmentError,
    handler: async (input, ctx) =>
      listAppointments({
        ...parseAppointmentListQuery(input.query as Record<string, unknown>),
        actor: appointmentActor(ctx),
      }),
  },
  {
    name: 'appointments.create',
    domain: 'agenda',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea un appuntamento con controllo conflitti sullo slot da 30 minuti (lock advisory).',
    sensitivity: 'medium',
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { ...appointmentBody, required: ['patientId', 'operatorId', 'data', 'ora'] },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /appointments',
    services: [
      'appointments/write-validation.ts#parseAppointmentCreateBody',
      'services/appointment-service.ts#createAppointment',
    ],
    mapError: mapAppointmentError,
    handler: async (input, ctx) =>
      createAppointment({
        ...parseAppointmentCreateBody(input.body),
        actor: appointmentActor(ctx),
      }),
  },
  {
    name: 'appointments.update',
    domain: 'agenda',
    kind: 'write',
    auditKind: 'update',
    description: 'Aggiorna/sposta/riassegna un appuntamento esistente (no cambio paziente).',
    sensitivity: 'medium',
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['appointmentId', 'body'],
      properties: {
        appointmentId: { type: 'string', minLength: 1 },
        body: appointmentBody,
      },
      additionalProperties: false,
    },
    entryPoint: 'PATCH /appointments/:id',
    services: [
      'appointments/write-validation.ts#parseAppointmentPatchBody',
      'services/appointment-service.ts#updateAppointment',
    ],
    mapError: mapAppointmentError,
    handler: async (input, ctx) =>
      updateAppointment(
        parseAppointmentId(String(input.appointmentId)),
        parseAppointmentPatchBody(input.body),
        appointmentActor(ctx),
      ),
  },
];
