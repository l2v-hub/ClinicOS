// Fresh-but-cheap read of the active policy: one small indexed query per call to learn the active
// version; the (validated) document is re-read only when that version changes. Revocations are
// therefore visible to the very next protected operation on every instance.

// Imports of the DB layer are lazy: ai/auth.ts (loaded by every router) must not require
// DATABASE_URL at module load.
import type { ActivePolicy } from './types.js';

let cached: ActivePolicy | null = null;

export async function loadActivePolicyCached(): Promise<ActivePolicy> {
  const { prisma } = await import('../lib/prisma.js');
  const head = await prisma.authzPolicyVersion.findFirst({
    where: { status: 'active' },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const activeVersion = head?.version ?? 0;
  if (cached && cached.version === activeVersion) return cached;
  const { loadActivePolicy } = await import('./policy-store.js');
  cached = await loadActivePolicy();
  return cached;
}

/** Test/ops hook: forget the cached document (the version check already covers normal changes). */
export function resetPolicyCache(): void {
  cached = null;
}
