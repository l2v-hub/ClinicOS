import { Prisma } from '@prisma/client';
import type { Operator } from '../ai/auth.js';
import type { UserContext } from '../ai/gateway/types.js';
import { hasGlobalPatientScope, patientScopeWhere } from '../patients/patient-scope.js';

export interface AssessmentDocumentAccess {
  actor: Operator;
  patientIds?: readonly string[] | null;
}
export function assessmentAccessForAi(ctx: UserContext): AssessmentDocumentAccess {
  // Public AI context deliberately uses a non-privileged role even for verified Entra globals.
  return {
    actor: {
      id: ctx.userId,
      role:
        ctx.permittedPatientIds === null
          ? 'manager'
          : (ctx.roles.find(hasGlobalPatientScope) ?? 'operator'),
    },
    patientIds: ctx.permittedPatientIds,
  };
}
/** Legacy files retain their existing gate. Missing actor can never grant access to generated files. */
export function assessmentDocumentWhere(
  access?: AssessmentDocumentAccess,
): Prisma.PatientDocumentWhereInput {
  if (!access) return { assessmentId: null };
  return {
    OR: [
      { assessmentId: null },
      {
        assessment: {
          is: {
            status: 'final',
            patient: {
              is: {
                ...patientScopeWhere(access.actor),
                ...(access.patientIds ? { id: { in: [...access.patientIds] } } : {}),
              },
            },
          },
        },
      },
    ],
  };
}
/** Fixed document alias, shared with the bounded AI search query. */
export function assessmentDocumentSql(access: AssessmentDocumentAccess): Prisma.Sql {
  const patientScope = hasGlobalPatientScope(access.actor.role)
    ? Prisma.empty
    : Prisma.sql`AND p."registeredById" = ${access.actor.id}`;
  const ids =
    access.patientIds == null
      ? Prisma.empty
      : access.patientIds.length
        ? Prisma.sql`AND p.id IN (${Prisma.join([...access.patientIds])})`
        : Prisma.sql`AND false`;
  return Prisma.sql`(document."assessmentId" IS NULL OR EXISTS (
    SELECT 1 FROM "PatientAssessment" assessment JOIN "Patient" p ON p.id = assessment."patientId"
    WHERE assessment.id = document."assessmentId" AND assessment."patientId" = document."patientId"
      AND assessment.status = 'final' ${patientScope} ${ids}
  ))`;
}
