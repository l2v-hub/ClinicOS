// Audit trail for the AI import flow (REQ-018/019).
// Records job lifecycle events linking job ↔ patient ↔ operator. Never stores
// clinical content — only action + short, content-free detail.

import { prisma } from '../lib/prisma.js';

export type AuditAction =
  | 'job_created'
  | 'files_added'
  | 'files_removed'
  | 'process_started'
  | 'process_completed'
  | 'process_failed'
  | 'job_cancelled'
  | 'confirm_started'
  | 'patient_created'
  | 'confirm_committed'
  | 'duplicate_flagged'
  | 'confirm_failed';

export async function recordAudit(
  jobId: string,
  action: AuditAction,
  opts: { patientId?: string; operatorId?: string; detail?: string } = {},
): Promise<void> {
  const detail =
    [opts.operatorId ? `op:${opts.operatorId}` : '', opts.detail ?? '']
      .filter(Boolean)
      .join(' ')
      .slice(0, 200) || null;
  try {
    await prisma.importAudit.create({ data: { jobId, action, patientId: opts.patientId, detail } });
  } catch {
    /* audit must never break the main flow */
  }
}
