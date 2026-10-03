// Who can READ which handovers (owner decision 2026-10-03, urgency model): the patient's handovers
// are shared notes — every clinical identity that reaches the facility's residents (#389 default
// `facility`) reads all of them, like the diary, so «the next one» can take an urgency in charge.
// Management roles read everything. With the restricted `registered_by_me` scope config the
// historical author/assignee rule still applies. Writes (edit/delete) are NOT widened here.
import type { Operator } from '../ai/auth.js';
import { hasFacilityPatientScope } from '../patients/patient-scope.js';

const PRIVILEGED_ROLES = new Set(['admin', 'manager']);

export function readsAllConsegne(actor: Pick<Operator, 'role'>): boolean {
  const role = actor.role.toLowerCase();
  return PRIVILEGED_ROLES.has(role) || hasFacilityPatientScope(role);
}
