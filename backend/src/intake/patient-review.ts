import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { assessmentTransaction, lockPatient } from '../assessments/access.js';
import { deferredTherapies } from './therapy-selection.js';

export const LEGACY_PAIN_MAX_DRAFTS = 100;
export const LEGACY_PAIN_MAX_BYTES = 2 * 1024 * 1024;
export const LEGACY_PAIN_TOO_LARGE = 'intake_review_legacy_pain_too_large';
export interface LegacyPainDraft {
  draftId: string;
  confirmedAt: string | null;
  pain: Prisma.JsonValue;
}
export type LegacyPainReview =
  | { legacyPainDrafts: LegacyPainDraft[]; legacyPainError: null }
  | { legacyPainDrafts: null; legacyPainError: typeof LEGACY_PAIN_TOO_LARGE };
interface ReviewDraft {
  id: string;
  data: Record<string, unknown>;
  importJobId: string | null;
}

export function patientIntakeReview(patientId: string, actor: Operator) {
  return assessmentTransaction(
    async (tx) => {
      // Scope is locked; RepeatableRead also covers historical reconciliation without a parent write lock.
      await lockPatient(tx, patientId, actor);
      const drafts = await tx.$queryRaw<ReviewDraft[]>`
      SELECT id, "importJobId",
        CASE WHEN jsonb_typeof(data) = 'object' THEN data - 'dolore' ELSE '{}'::jsonb END AS data
      FROM "PatientIntakeDraft"
      WHERE "confirmedPatientId" = ${patientId} AND status = 'confirmed'
      ORDER BY "confirmedAt" DESC NULLS LAST, id DESC`;
      const [budget] = await tx.$queryRaw<Array<{ count: bigint; bytes: bigint }>>`
      SELECT COUNT(*)::bigint AS count,
        COALESCE(SUM(octet_length((data->'dolore')::text)), 0)::bigint AS bytes
      FROM "PatientIntakeDraft"
      WHERE "confirmedPatientId" = ${patientId} AND status = 'confirmed'
        AND jsonb_typeof(data) = 'object' AND data ? 'dolore'`;
      let legacy: LegacyPainReview;
      if (
        budget.count > BigInt(LEGACY_PAIN_MAX_DRAFTS) ||
        budget.bytes > BigInt(LEGACY_PAIN_MAX_BYTES)
      ) {
        legacy = { legacyPainDrafts: null, legacyPainError: LEGACY_PAIN_TOO_LARGE };
      } else {
        const rows = await tx.$queryRaw<
          Array<{ draftId: string; confirmedAt: Date | null; pain: Prisma.JsonValue }>
        >`
        SELECT id AS "draftId", "confirmedAt", data->'dolore' AS pain
        FROM "PatientIntakeDraft"
        WHERE "confirmedPatientId" = ${patientId} AND status = 'confirmed'
          AND jsonb_typeof(data) = 'object' AND data ? 'dolore'
        ORDER BY "confirmedAt" DESC NULLS LAST, id DESC`;
        legacy = {
          legacyPainDrafts: rows.map((row) => ({
            ...row,
            confirmedAt: row.confirmedAt?.toISOString() ?? null,
          })),
          legacyPainError: null,
        };
      }
      const documents = await tx.patientDocument.findMany({
        where: {
          patientId,
          importJobId: {
            in: drafts.flatMap((draft) => (draft.importJobId ? [draft.importJobId] : [])),
          },
        },
        select: { id: true },
      });
      return {
        draftId: drafts[0]?.id ?? null,
        deferredTherapies: drafts.flatMap((draft) => deferredTherapies(draft.data)),
        sourceDocumentIds: documents.map((document) => document.id),
        ...legacy,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
