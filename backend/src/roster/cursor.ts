import { createHash } from 'node:crypto';
import type { Operator } from '../ai/auth.js';
import type { OperationalPatientAccess } from '../patients/operational-identity.js';
import { changed, rosterId, RosterError, type AppliedRosterOrder } from './order-contract.js';

export interface RosterAnchor {
  patientId: string;
  therapyId?: string;
}
export interface RosterBinding {
  view: 'patients' | 'parameters' | 'therapy';
  scope: string;
  contextId: string | null;
  contextVersion: string | null;
  revision: string | null;
  order: AppliedRosterOrder['order'];
  filters: Record<string, unknown>;
  asOf: string;
  epoch: AppliedRosterOrder['epoch'];
}
export const MAX_ROSTER_CURSOR = 4096;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function rosterScopeFingerprint(actor: Operator, access: OperationalPatientAccess): string {
  return createHash('sha256')
    .update(
      canonical({
        actor: actor.id,
        role: actor.role.trim().toLowerCase(),
        patientIds: access.patientIds ? [...new Set(access.patientIds)].sort() : null,
        registeredById: access.registeredById ?? null,
      }),
    )
    .digest('base64url');
}
export function encodeRosterCursor(binding: RosterBinding, anchor: RosterAnchor): string {
  return Buffer.from(JSON.stringify({ v: 3, binding, anchor })).toString('base64url');
}
export function decodeRosterCursor(value: unknown, binding: RosterBinding): RosterAnchor {
  let payload: { v?: unknown; binding?: RosterBinding; anchor?: RosterAnchor };
  try {
    if (
      typeof value !== 'string' ||
      !value.length ||
      value.length > MAX_ROSTER_CURSOR ||
      !/^[A-Za-z0-9_-]+$/.test(value)
    )
      throw new Error();
    const text = Buffer.from(value, 'base64url').toString('utf8');
    if (Buffer.from(text).toString('base64url') !== value) throw new Error();
    payload = JSON.parse(text);
    if (!payload || payload.v !== 3 || !payload.binding || !payload.anchor) throw new Error();
    rosterId(payload.anchor.patientId);
    if (binding.view === 'therapy') rosterId(payload.anchor.therapyId);
    else if (payload.anchor.therapyId !== undefined) throw new Error();
  } catch {
    throw new RosterError('Cursore non valido');
  }
  if (canonical(payload.binding) !== canonical(binding)) throw changed('cursor');
  return payload.anchor!;
}
