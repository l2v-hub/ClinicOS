// 016 F3: patient identity in a query plan is AUTHORITATIVE server-side. The DSL names a patient by
// NAME or the literal "current"; the backend resolves it via the gateway (search_patients + authz),
// never trusting an id proposed by the LLM. Unique match only — ambiguous/absent → null (no invention).

import * as svc from '../services.js';
import type { UserContext } from '../types.js';
import type { RawFilter } from './dsl.js';

export async function resolvePatientFilter(
  filters: RawFilter[],
  ctx: UserContext,
  currentPatientId?: string,
): Promise<string | null> {
  const pf = filters.find((f) => f.field === 'patient');
  if (!pf) return null;
  if (pf.value === 'current') return currentPatientId ?? null;
  const name = String(pf.value ?? '').trim();
  if (!name) return null;
  const matches = await svc.searchPatients({ query: name } as never, ctx);
  return matches.length === 1 ? matches[0].patientId : null;
}
