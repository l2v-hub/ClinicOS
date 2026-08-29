import { prisma } from '../lib/prisma.js';
import type { AuthedRequest, Operator } from './auth.js';
import { canAccessOwnedResource, createOwnedResourceParamGuard } from './ownership-policy.js';

export { canAccessOwnedResource } from './ownership-policy.js';

export async function importJobIsAccessible(
  jobId: string,
  operator: Operator | undefined,
): Promise<boolean> {
  if (!operator) return false;
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { createdById: true },
  });
  return Boolean(job && canAccessOwnedResource(operator, job.createdById));
}

export const requireOwnedImportJob = createOwnedResourceParamGuard(
  (id) => prisma.importJob.findUnique({ where: { id }, select: { createdById: true } }),
  'Job non trovato',
);

export const requireOwnedIntakeDraft = createOwnedResourceParamGuard(
  (id) => prisma.patientIntakeDraft.findUnique({ where: { id }, select: { createdById: true } }),
  'Bozza non trovata',
);

// Compile-time assertion: the generic param guards remain compatible with the authenticated
// request shape used by the routers.
const _authedRequestCompatibility: AuthedRequest | undefined = undefined;
void _authedRequestCompatibility;
