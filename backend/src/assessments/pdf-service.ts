import { createHash, randomUUID } from 'node:crypto';
import type { Operator } from '../ai/auth.js';
import { assessmentNotFound, assessmentTransaction, lockAssessment } from './access.js';
import { AssessmentError, type AssessmentSnapshot } from './types.js';
import { getAssessment } from './service.js';
import {
  ASSESSMENT_RENDERER_VERSION,
  AssessmentPdfError,
  renderAssessmentPdf,
} from './pdf-renderer.js';

export interface AssessmentPdfJob {
  patientId: string;
  id: string;
  token: string;
  snapshot: AssessmentSnapshot;
  snapshotSha256: string;
}
export async function claimAssessmentPdf(
  patientId: string,
  id: string,
  actor: Operator,
  clock: () => Date = () => new Date(),
  leaseMs = 60_000,
): Promise<AssessmentPdfJob | null> {
  return assessmentTransaction(async (tx) => {
    const row = await lockAssessment(tx, patientId, id, actor);
    const now = clock();
    if (row.status !== 'final')
      throw new AssessmentError(
        'Finalizza la valutazione prima di creare il PDF',
        409,
        'assessment_not_final',
      );
    if (row.pdfStatus === 'ready' || (row.pdfLeaseUntil && row.pdfLeaseUntil > now)) return null;
    const token = randomUUID();
    await tx.patientAssessment.update({
      where: { id },
      data: {
        pdfStatus: 'pending',
        pdfAttemptToken: token,
        pdfLeaseUntil: new Date(now.getTime() + leaseMs),
        pdfAttemptCount: { increment: 1 },
        pdfErrorCode: null,
        pdfUpdatedAt: now,
      },
    });
    return {
      patientId,
      id,
      token,
      snapshot: row.finalSnapshot as unknown as AssessmentSnapshot,
      snapshotSha256: row.snapshotSha256!,
    };
  });
}
export async function completeAssessmentPdf(
  job: AssessmentPdfJob,
  bytes: Buffer,
  actor: Operator,
  clock: () => Date = () => new Date(),
): Promise<boolean> {
  if (bytes.length > 15 * 1024 * 1024 || bytes.subarray(0, 4).toString('ascii') !== '%PDF')
    throw new AssessmentPdfError('assessment_pdf_invalid');
  return assessmentTransaction(async (tx) => {
    const row = await lockAssessment(tx, job.patientId, job.id, actor);
    const now = clock();
    if (
      row.pdfStatus !== 'pending' ||
      row.pdfAttemptToken !== job.token ||
      !row.pdfLeaseUntil ||
      row.pdfLeaseUntil <= now
    )
      return false;
    if (row.snapshotSha256 !== job.snapshotSha256) throw assessmentNotFound();
    const order = await tx.patientDocument.aggregate({
      where: { patientId: job.patientId },
      _max: { sortOrder: true },
    });
    await tx.patientDocument.create({
      data: {
        id: randomUUID(),
        patientId: job.patientId,
        assessmentId: job.id,
        documentType: 'patient_assessment',
        originalName: `PAINAD_${row.assessedAt.toISOString().slice(0, 10)}_${job.id}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        dataBase64: bytes.toString('base64'),
        sortOrder: (order._max.sortOrder ?? -1) + 1,
        createdById: row.authorOperatorId,
        sourceManifest: {
          kind: 'assessment',
          assessmentId: job.id,
          snapshotSha256: job.snapshotSha256,
          rendererVersion: ASSESSMENT_RENDERER_VERSION,
        },
      },
    });
    await tx.patientAssessment.update({
      where: { id: job.id },
      data: {
        pdfStatus: 'ready',
        pdfLeaseUntil: null,
        pdfAttemptToken: null,
        pdfErrorCode: null,
        pdfUpdatedAt: now,
      },
    });
    return true;
  });
}
export async function failAssessmentPdf(
  job: AssessmentPdfJob,
  actor: Operator,
  error: unknown,
  clock: () => Date = () => new Date(),
) {
  const code = error instanceof AssessmentPdfError ? error.code : 'assessment_pdf_failed';
  return assessmentTransaction(async (tx) => {
    const row = await lockAssessment(tx, job.patientId, job.id, actor);
    const now = clock();
    if (
      row.pdfStatus !== 'pending' ||
      row.pdfAttemptToken !== job.token ||
      !row.pdfLeaseUntil ||
      row.pdfLeaseUntil <= now
    )
      return false;
    await tx.patientAssessment.update({
      where: { id: job.id },
      data: {
        pdfStatus: 'failed',
        pdfErrorCode: code,
        pdfLeaseUntil: null,
        pdfAttemptToken: null,
        pdfUpdatedAt: now,
      },
    });
    return true;
  });
}
export async function retryAssessmentPdf(
  patientId: string,
  id: string,
  actor: Operator,
  render: (snapshot: AssessmentSnapshot) => Promise<Buffer> = renderAssessmentPdf,
) {
  const job = await claimAssessmentPdf(patientId, id, actor);
  if (job) {
    try {
      await completeAssessmentPdf(job, await render(job.snapshot), actor);
    } catch (error) {
      await failAssessmentPdf(job, actor, error);
    }
  }
  return getAssessment(patientId, id, actor);
}
