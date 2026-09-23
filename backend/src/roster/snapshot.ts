import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { prisma } from '../lib/prisma.js';
import type { OperationalPatientAccess } from '../patients/operational-identity.js';
import { facilityToday } from '../patients/parameter-reading-input.js';
import { readRosterPreference } from './preferences.js';
import {
  changed,
  requestedRosterOrder,
  rosterDate,
  type AppliedRosterOrder,
} from './order-contract.js';
import {
  decodeRosterCursor,
  rosterScopeFingerprint,
  type RosterAnchor,
  type RosterBinding,
} from './cursor.js';

export interface RosterSnapshot {
  roster: AppliedRosterOrder;
  binding: RosterBinding;
  anchor?: RosterAnchor;
  today: string;
}
export async function withRosterSnapshot<T>(
  actor: Operator,
  access: OperationalPatientAccess,
  view: RosterBinding['view'],
  query: Record<string, unknown>,
  filters: Record<string, unknown>,
  asOf: string,
  read: (tx: Prisma.TransactionClient, snapshot: RosterSnapshot) => Promise<T>,
): Promise<T> {
  const request = requestedRosterOrder(query);
  rosterDate(asOf);
  const today = facilityToday();
  return prisma.$transaction(
    async (tx) => {
      const preference = await readRosterPreference(actor, tx);
      if (request.contextId !== undefined && request.contextId !== preference.context?.id)
        throw changed('context');
      const order = request.explicit ?? preference.effective;
      const temporary =
        preference.temporary ||
        order.criterion !== preference.effective.criterion ||
        order.direction !== preference.effective.direction;
      const epochs = await tx.rosterEpoch.findUniqueOrThrow({ where: { id: 1 } });
      const roster: AppliedRosterOrder = {
        context: preference.context,
        order,
        source: temporary ? 'temporary' : preference.source,
        revision: preference.revision,
        temporary,
        asOf,
        epoch: {
          roster: epochs.roster.toString(),
          ...(view === 'therapy' && { therapy: epochs.therapy.toString() }),
        },
      };
      const binding: RosterBinding = {
        view,
        scope: rosterScopeFingerprint(actor, access),
        contextId: roster.context?.id ?? null,
        contextVersion: roster.context?.version ?? null,
        revision: roster.revision,
        order,
        filters,
        asOf,
        epoch: roster.epoch,
      };
      const anchor =
        query.cursor === undefined ? undefined : decodeRosterCursor(query.cursor, binding);
      return read(tx, { roster, binding, anchor, today });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15_000 },
  );
}
