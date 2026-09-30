// Operations tools — roster order (personal + department default) and facility occupancy.
// Thin adapters over roster/preferences.ts and rooms/occupancy-service.ts, the same symbols called
// by routes/roster-order.ts and routes/admin-rooms.ts (GET /admin/rooms/occupancy).
// Notes, operators, rooms/beds CRUD and room assignments stay GAP (logic inline in the routes).

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { rosterId } from '../../roster/order-contract.js';
import {
  listRosterContexts,
  patchRosterDefault,
  patchRosterPreference,
  readRosterPreference,
} from '../../roster/preferences.js';
import { getFacilityOccupancy } from '../../rooms/occupancy-service.js';
import { actorOf, type ToolDefinition } from '../types.js';

const ADMIN_ROLES = ['admin', 'manager'] as const;

const orderSchema = {
  type: ['object', 'null'],
  properties: {
    criterion: { type: 'string', enum: ['name', 'location'] },
    direction: { type: 'string', enum: ['asc', 'desc'] },
  },
} as const;

export const operationsTools: ToolDefinition[] = [
  {
    name: 'roster.get_my_order',
    domain: 'roster',
    kind: 'read',
    auditKind: 'read',
    description:
      'Ordinamento effettivo dell’elenco pazienti dell’operatore (personale > default reparto > sistema).',
    sensitivity: 'low',
    inputSchema: { type: 'object', additionalProperties: false },
    entryPoint: 'GET /me/roster-order',
    services: ['roster/preferences.ts#readRosterPreference'],
    // Same RepeatableRead snapshot the route opens around the read.
    handler: async (_input, ctx) =>
      prisma.$transaction((tx) => readRosterPreference(actorOf(ctx), tx), {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      }),
  },
  {
    name: 'roster.set_my_order',
    domain: 'roster',
    kind: 'write',
    auditKind: 'update',
    description:
      'Imposta o rimuove (override null) l’ordinamento personale dell’elenco pazienti; concorrenza ottimistica via expectedVersion.',
    sensitivity: 'low',
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['contextId', 'override', 'expectedVersion'],
          properties: {
            contextId: { type: 'string' },
            override: orderSchema,
            expectedVersion: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'PATCH /me/roster-order',
    services: ['roster/preferences.ts#patchRosterPreference'],
    handler: async (input, ctx) => patchRosterPreference(actorOf(ctx), input.body),
  },
  {
    name: 'roster.list_contexts',
    domain: 'roster',
    kind: 'read',
    auditKind: 'read',
    description:
      'Elenco paginato dei contesti reparto con l’ordinamento di default (admin/manager).',
    sensitivity: 'low',
    legacyRoles: ADMIN_ROLES,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'object',
          properties: { limit: { type: 'string' }, cursor: { type: 'string' } },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'GET /admin/roster-contexts',
    services: ['roster/preferences.ts#listRosterContexts'],
    handler: async (input) =>
      listRosterContexts((input.query as Record<string, unknown> | undefined) ?? {}),
  },
  {
    name: 'roster.set_context_default',
    domain: 'roster',
    kind: 'write',
    auditKind: 'update',
    description:
      'Imposta o rimuove l’ordinamento di default di un reparto (admin/manager); concorrenza ottimistica via expectedVersion.',
    sensitivity: 'low',
    legacyRoles: ADMIN_ROLES,
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['contextId', 'body'],
      properties: {
        contextId: { type: 'string' },
        body: {
          type: 'object',
          required: ['default', 'expectedVersion'],
          properties: { default: orderSchema, expectedVersion: { type: 'string' } },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'PATCH /admin/roster-contexts/:id',
    services: ['roster/order-contract.ts#rosterId', 'roster/preferences.ts#patchRosterDefault'],
    handler: async (input) => patchRosterDefault(rosterId(input.contextId), input.body),
  },
  {
    name: 'rooms.occupancy',
    domain: 'rooms',
    kind: 'read',
    auditKind: 'read',
    description:
      'KPI di occupazione della struttura (camere, letti totali/occupati/liberi/in manutenzione, %).',
    sensitivity: 'low',
    legacyRoles: ADMIN_ROLES,
    inputSchema: { type: 'object', additionalProperties: false },
    entryPoint: 'GET /admin/rooms/occupancy',
    services: ['rooms/occupancy-service.ts#getFacilityOccupancy'],
    handler: async () => getFacilityOccupancy(),
  },
];
