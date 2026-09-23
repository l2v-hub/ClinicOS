import { validAssessmentId } from './assessmentValidation';
export const ATTESTATION_KINDS = [
  'physiotherapist_confirmation',
  'operator_acknowledgement',
] as const;
export type AttestationKind = (typeof ATTESTATION_KINDS)[number];
export interface AssessmentAttestation {
  id: string;
  assessmentId: string;
  snapshotSha256: string;
  kind: AttestationKind;
  actor: { operatorId: string; name: string; registeredQualification: string | null };
  createdAt: string;
}
export interface AssessmentAttestationPage {
  assessmentId: string;
  snapshotSha256: string;
  correctedById: string | null;
  items: AssessmentAttestation[];
  counts: Record<AttestationKind, number>;
  me: {
    registeredQualification: string | null;
    allowedKinds: AttestationKind[];
    attestedKinds: AttestationKind[];
  };
  pageInfo: { loadedCount: number; hasMore: boolean; nextCursor: string | null };
}
export interface AttestationRequest {
  kind: AttestationKind;
  snapshotSha256: string;
}
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const qualification = (value: unknown) => value === null || typeof value === 'string';
function invalid(): never {
  throw new Error('Conferme personali non verificate.');
}
export function assertAttestation(
  value: unknown,
  id: string,
  snapshot: string,
): asserts value is AssessmentAttestation {
  const row = value as AssessmentAttestation;
  if (
    !row ||
    !validAssessmentId(row.id) ||
    row.assessmentId !== id ||
    !hash(row.snapshotSha256) ||
    row.snapshotSha256 !== snapshot ||
    !ATTESTATION_KINDS.includes(row.kind) ||
    !validAssessmentId(row.actor?.operatorId) ||
    typeof row.actor?.name !== 'string' ||
    !qualification(row.actor.registeredQualification) ||
    typeof row.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(row.createdAt))
  )
    invalid();
}
export function parseAttestationPage(
  value: unknown,
  id: string,
  snapshot: string,
): AssessmentAttestationPage {
  const page = value as AssessmentAttestationPage;
  if (
    !page ||
    page.assessmentId !== id ||
    page.snapshotSha256 !== snapshot ||
    !hash(snapshot) ||
    !(page.correctedById === null || validAssessmentId(page.correctedById)) ||
    !Array.isArray(page.items) ||
    page.items.length > 100 ||
    !page.counts ||
    ATTESTATION_KINDS.some(
      (kind) => !Number.isSafeInteger(page.counts[kind]) || page.counts[kind] < 0,
    ) ||
    !page.me ||
    !qualification(page.me.registeredQualification) ||
    !Array.isArray(page.me.allowedKinds) ||
    !Array.isArray(page.me.attestedKinds) ||
    [...page.me.allowedKinds, ...page.me.attestedKinds].some(
      (kind) => !ATTESTATION_KINDS.includes(kind),
    ) ||
    !page.pageInfo ||
    page.pageInfo.loadedCount !== page.items.length ||
    typeof page.pageInfo.hasMore !== 'boolean' ||
    (page.pageInfo.hasMore
      ? typeof page.pageInfo.nextCursor !== 'string' ||
        !page.pageInfo.nextCursor ||
        !page.items.length
      : page.pageInfo.nextCursor !== null)
  )
    invalid();
  page.items.forEach((item) => assertAttestation(item, id, snapshot));
  if (new Set(page.items.map((item) => item.id)).size !== page.items.length) invalid();
  return page;
}
export function assessmentAttestationMethods(
  request: (url: string, method?: string, body?: unknown, signal?: AbortSignal) => Promise<unknown>,
  base: (patientId: string) => string,
) {
  const path = (patientId: string, id: string) => {
    if (!validAssessmentId(id)) invalid();
    return `${base(patientId)}/${encodeURIComponent(id)}/attestations`;
  };
  return {
    async attestations(
      patientId: string,
      id: string,
      snapshot: string,
      cursor?: string,
      signal?: AbortSignal,
    ) {
      const query = new URLSearchParams({ limit: '25' });
      if (cursor) query.set('cursor', cursor);
      return parseAttestationPage(
        await request(`${path(patientId, id)}?${query}`, 'GET', undefined, signal),
        id,
        snapshot,
      );
    },
    async attest(
      patientId: string,
      id: string,
      body: Readonly<AttestationRequest>,
      operatorId?: string,
    ) {
      const value = (await request(path(patientId, id), 'POST', body)) as {
        attestation?: unknown;
        replayed?: unknown;
      };
      assertAttestation(value?.attestation, id, body.snapshotSha256);
      if (
        value.attestation.kind !== body.kind ||
        (operatorId && value.attestation.actor.operatorId !== operatorId) ||
        typeof value.replayed !== 'boolean'
      )
        invalid();
      return { attestation: value.attestation, replayed: value.replayed };
    },
  };
}
