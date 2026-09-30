// GET /patients/clinical-summary composition, moved verbatim from routes/patients.ts so the route
// and the Tool Layer (`patients.clinical_summary`) share one scope rule: ids outside the
// operator's ownership scope are silently dropped before any clinical data is read.

import type { Operator } from '../ai/auth.js';
import { loadPatientConsegnaCounts } from '../consegne/read-service.js';
import { prisma } from '../lib/prisma.js';
import {
  assemblePatientClinicalSummaries,
  loadPatientClinicalSummaryRows,
} from './clinical-summary.js';
import { patientScopeWhere } from './patient-scope.js';
import { parsePatientSummaryIds } from './summary-query.js';

export async function loadScopedPatientClinicalSummaries(rawPatientIds: unknown, actor: Operator) {
  const patientIds = parsePatientSummaryIds(rawPatientIds);
  const allowedPatients = await prisma.patient.findMany({
    where: { id: { in: patientIds }, ...patientScopeWhere(actor) },
    select: { id: true },
  });
  const allowedIds = new Set(allowedPatients.map((patient) => patient.id));
  const scopedPatientIds = patientIds.filter((patientId) => allowedIds.has(patientId));
  const [clinicalRows, consegneCounts] = await Promise.all([
    loadPatientClinicalSummaryRows(scopedPatientIds),
    loadPatientConsegnaCounts(scopedPatientIds),
  ]);
  return assemblePatientClinicalSummaries(scopedPatientIds, clinicalRows, consegneCounts);
}
