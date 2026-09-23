import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import { hasGlobalPatientScope } from '../patients/patient-scope.js';
import {
  changed,
  nullableOrder,
  object,
  onlyKeys,
  rosterId,
  version,
  RosterError,
  type RosterOrder,
  type RosterPreferenceDto,
} from './order-contract.js';

export const SYSTEM_ORDER: RosterOrder = { criterion: 'name', direction: 'asc' };

export async function readRosterPreference(
  actor: Operator,
  tx: Prisma.TransactionClient = prisma,
): Promise<RosterPreferenceDto> {
  const profile = await tx.operator.findUnique({
    where: { id: actor.id },
    select: {
      rosterContext: {
        select: {
          id: true,
          label: true,
          version: true,
          defaultCriterion: true,
          defaultDirection: true,
        },
      },
    },
  });
  const canEditDefault = hasGlobalPatientScope(actor.role);
  if (!profile)
    return {
      context: null,
      default: null,
      override: null,
      effective: SYSTEM_ORDER,
      source: 'system',
      revision: null,
      canEdit: false,
      canEditDefault,
      temporary: true,
      reason: 'profile_missing',
    };
  const context = profile.rosterContext;
  if (!context)
    throw new RosterError('Contesto reparto non disponibile', 503, 'roster_configuration_missing');
  const preference = await tx.operatorRosterPreference.findUnique({
    where: { operatorId_contextId: { operatorId: actor.id, contextId: context.id } },
    select: { criterion: true, direction: true, revision: true },
  });
  const defaultOrder =
    context.defaultCriterion && context.defaultDirection
      ? { criterion: context.defaultCriterion, direction: context.defaultDirection }
      : null;
  const override =
    preference?.criterion && preference.direction
      ? { criterion: preference.criterion, direction: preference.direction }
      : null;
  return {
    context: { id: context.id, label: context.label, version: context.version.toString() },
    default: defaultOrder,
    override,
    effective: override ?? defaultOrder ?? SYSTEM_ORDER,
    source: override ? 'personal' : defaultOrder ? 'department' : 'system',
    revision: preference?.revision.toString() ?? '0',
    canEdit: true,
    canEditDefault,
    temporary: false,
    reason: null,
  };
}

export async function patchRosterPreference(actor: Operator, value: unknown) {
  const input = object(value);
  onlyKeys(input, ['contextId', 'override', 'expectedVersion']);
  const contextId = rosterId(input.contextId);
  const override = nullableOrder(input.override);
  const expected = version(input.expectedVersion);
  return prisma.$transaction(async (tx) => {
    // Serialize with department changes, including writes outside this service.
    const operators = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "Operator" WHERE id = ${actor.id} FOR UPDATE
    `);
    if (!operators.length)
      throw new RosterError('Profilo operatore non disponibile', 403, 'roster_profile_missing');
    const current = await readRosterPreference(actor, tx);
    if (current.context?.id !== contextId) throw changed('context');
    if (current.revision !== expected.toString())
      throw new RosterError(
        'Preferenza aggiornata da un’altra sessione. Rileggi e riprova.',
        409,
        'roster_preference_conflict',
      );
    const data = { criterion: override?.criterion ?? null, direction: override?.direction ?? null };
    if (expected === 0n) {
      await tx.operatorRosterPreference.create({
        data: { operatorId: actor.id, contextId, ...data },
      });
    } else {
      const result = await tx.operatorRosterPreference.updateMany({
        where: { operatorId: actor.id, contextId, revision: expected },
        data: { ...data, revision: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new RosterError(
          'Preferenza aggiornata. Rileggi e riprova.',
          409,
          'roster_preference_conflict',
        );
    }
    return readRosterPreference(actor, tx);
  });
}

function contextItem(row: {
  id: string;
  label: string;
  defaultCriterion: RosterOrder['criterion'] | null;
  defaultDirection: RosterOrder['direction'] | null;
  version: bigint;
}) {
  return {
    id: row.id,
    label: row.label,
    default:
      row.defaultCriterion && row.defaultDirection
        ? { criterion: row.defaultCriterion, direction: row.defaultDirection }
        : null,
    version: row.version.toString(),
  };
}

export async function listRosterContexts(query: Record<string, unknown>) {
  onlyKeys(query, ['limit', 'cursor']);
  if (
    query.limit !== undefined &&
    (typeof query.limit !== 'string' || !/^[1-9]\d{0,2}$/.test(query.limit))
  )
    throw new RosterError('Limite non valido');
  const limit = Math.min(query.limit === undefined ? 50 : Number(query.limit), 100);
  const cursor = query.cursor === undefined ? undefined : rosterId(query.cursor);
  const rows = await prisma.rosterContext.findMany({
    where: cursor ? { id: { gt: cursor } } : {},
    orderBy: { id: 'asc' },
    take: limit + 1,
    select: {
      id: true,
      label: true,
      defaultCriterion: true,
      defaultDirection: true,
      version: true,
    },
  });
  const items = rows.slice(0, limit).map(contextItem);
  return {
    items,
    hasMore: rows.length > limit,
    nextCursor: rows.length > limit ? items.at(-1)!.id : null,
  };
}

export async function patchRosterDefault(contextId: string, value: unknown) {
  rosterId(contextId);
  const input = object(value);
  onlyKeys(input, ['default', 'expectedVersion']);
  const order = nullableOrder(input.default);
  const expected = version(input.expectedVersion);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.rosterContext.updateMany({
      where: { id: contextId, version: expected },
      data: {
        defaultCriterion: order?.criterion ?? null,
        defaultDirection: order?.direction ?? null,
        version: { increment: 1 },
      },
    });
    if (!updated.count) {
      const exists = await tx.rosterContext.findUnique({
        where: { id: contextId },
        select: { id: true },
      });
      if (!exists) throw new RosterError('Contesto non trovato', 404, 'roster_context_not_found');
      throw new RosterError(
        'Default aggiornato da un’altra sessione. Rileggi e riprova.',
        409,
        'roster_default_conflict',
      );
    }
    return contextItem(await tx.rosterContext.findUniqueOrThrow({ where: { id: contextId } }));
  });
}
