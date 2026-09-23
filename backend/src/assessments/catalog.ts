import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import { assessmentTransaction, lockPatient } from './access.js';
import {
  AssessmentError,
  PAINAD_VERSION,
  TRANSFERS_VERSION,
  TINETTI_VERSION,
  MNA_VERSION,
  GDS15_VERSION,
  type AssessmentType,
} from './types.js';

export const CATALOG_FORMS = [
  { type: 'painad', formVersion: PAINAD_VERSION },
  { type: 'postural_transfers', formVersion: TRANSFERS_VERSION },
  { type: 'tinetti', formVersion: TINETTI_VERSION },
  { type: 'mna', formVersion: MNA_VERSION },
  { type: 'gds15', formVersion: GDS15_VERSION },
] as const;
interface CatalogReference {
  id: string;
  formVersion: string;
  assessedAt: string;
  createdAt: string;
}
export interface AssessmentCatalogItem {
  type: AssessmentType;
  formVersion: string;
  latestFinal: (CatalogReference & { finalizedAt: string }) | null;
  ownDraftCount: number;
  latestOwnDraft: (CatalogReference & { updatedAt: string }) | null;
}
interface CatalogRow {
  type: AssessmentType;
  formVersion: string;
  finalId: string | null;
  finalFormVersion: string | null;
  finalAssessedAt: Date | null;
  finalCreatedAt: Date | null;
  finalizedAt: Date | null;
  ownDraftCount: bigint;
  draftId: string | null;
  draftFormVersion: string | null;
  draftAssessedAt: Date | null;
  draftCreatedAt: Date | null;
  draftUpdatedAt: Date | null;
}

export function assessmentCatalog(
  patientId: string,
  query: Record<string, unknown>,
  actor: Operator,
) {
  if (Object.keys(query).length) throw new AssessmentError('Il catalogo non accetta parametri');
  return assessmentTransaction(async (tx) => {
    await lockPatient(tx, patientId, actor);
    const supported = Prisma.join(
      CATALOG_FORMS.map(
        (form, index) => Prisma.sql`(${form.type}::text, ${form.formVersion}::text, ${index}::int)`,
      ),
    );
    // This projection never fetches clinical JSON, PDF state or document contents.
    const rows = await tx.$queryRaw<CatalogRow[]>(Prisma.sql`
      WITH supported(type, version, position) AS (VALUES ${supported})
      SELECT s.type, s.version AS "formVersion",
        f.id AS "finalId", f."formVersion" AS "finalFormVersion",
        f."assessedAt" AS "finalAssessedAt", f."createdAt" AS "finalCreatedAt", f."finalizedAt",
        COALESCE(d."ownDraftCount", 0)::bigint AS "ownDraftCount",
        d.id AS "draftId", d."formVersion" AS "draftFormVersion",
        d."assessedAt" AS "draftAssessedAt", d."createdAt" AS "draftCreatedAt", d."updatedAt" AS "draftUpdatedAt"
      FROM supported s
      LEFT JOIN LATERAL (
        SELECT a.id, a."formVersion", a."assessedAt", a."createdAt", a."finalizedAt"
        FROM "PatientAssessment" a
        WHERE a."patientId" = ${patientId} AND a.type = s.type AND a.status = 'final'
          AND NOT EXISTS (SELECT 1 FROM "PatientAssessment" child
            WHERE child."predecessorId" = a.id AND child.status = 'final')
        ORDER BY a."assessedAt" DESC, a."createdAt" DESC, a.id DESC LIMIT 1
      ) f ON true
      LEFT JOIN LATERAL (
        SELECT a.id, a."formVersion", a."assessedAt", a."createdAt", a."updatedAt",
          COUNT(*) OVER () AS "ownDraftCount"
        FROM "PatientAssessment" a
        WHERE a."patientId" = ${patientId} AND a.type = s.type
          AND a.status = 'draft' AND a."authorOperatorId" = ${actor.id}
        ORDER BY a."updatedAt" DESC, a."createdAt" DESC, a.id DESC LIMIT 1
      ) d ON true
      ORDER BY s.position`);
    const items: AssessmentCatalogItem[] = rows.map((row) => {
      const ownDraftCount = Number(row.ownDraftCount);
      if (
        !Number.isSafeInteger(ownDraftCount) ||
        ownDraftCount < 0 ||
        (ownDraftCount === 0) !== (row.draftId === null)
      )
        throw new AssessmentError('Catalogo non disponibile', 500, 'assessment_unavailable');
      return {
        type: row.type,
        formVersion: row.formVersion,
        ownDraftCount,
        latestFinal:
          row.finalId === null
            ? null
            : {
                id: row.finalId,
                formVersion: row.finalFormVersion!,
                assessedAt: row.finalAssessedAt!.toISOString(),
                createdAt: row.finalCreatedAt!.toISOString(),
                finalizedAt: row.finalizedAt!.toISOString(),
              },
        latestOwnDraft:
          row.draftId === null
            ? null
            : {
                id: row.draftId,
                formVersion: row.draftFormVersion!,
                assessedAt: row.draftAssessedAt!.toISOString(),
                createdAt: row.draftCreatedAt!.toISOString(),
                updatedAt: row.draftUpdatedAt!.toISOString(),
              },
      };
    });
    return { items };
  });
}
