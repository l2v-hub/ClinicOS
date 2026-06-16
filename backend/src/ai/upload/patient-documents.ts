// Persist imported documents permanently on the patient (REQ-035 v2).
//
// File bytes are stored in Postgres (base64) so they survive Railway redeploy/restart with no
// external object storage. onDelete: Cascade on PatientDocument means deleting the patient
// removes the documents and their bytes — there is no separate storage to clean up.

import type { Prisma } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { prisma } from '../../lib/prisma.js';

export interface PublicPatientDocument {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  documentType: string;
  sortOrder: number;
  importJobId: string | null;
  createdAt: string;
}

/**
 * Copy a job's uploaded files into permanent PatientDocument rows, inside the patient-create
 * transaction. Best-effort per file: a missing file on disk is skipped (never blocks the import).
 */
export async function persistImportDocuments(
  tx: Prisma.TransactionClient,
  patientId: string,
  jobId: string,
  createdById?: string,
): Promise<number> {
  const docs = await tx.importDocument.findMany({
    where: { jobId, status: 'uploaded' },
    orderBy: { sortOrder: 'asc' },
  });
  let saved = 0;
  for (const d of docs) {
    try {
      const buf = await readFile(d.storagePath);
      await tx.patientDocument.create({
        data: {
          patientId, importJobId: jobId, originalName: d.filename, mimeType: d.mimeType,
          sizeBytes: d.sizeBytes, sha256: d.sha256, dataBase64: buf.toString('base64'),
          sortOrder: d.sortOrder, ...(createdById ? { createdById } : {}),
        },
      });
      saved++;
    } catch {
      /* file no longer on disk (swept/redeploy) — skip; never block patient creation */
    }
  }
  return saved;
}

/** Document metadata for the patient (never includes the base64 bytes). */
export async function listPatientDocuments(patientId: string): Promise<PublicPatientDocument[]> {
  const rows = await prisma.patientDocument.findMany({
    where: { patientId },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, originalName: true, mimeType: true, sizeBytes: true, sha256: true,
      documentType: true, sortOrder: true, importJobId: true, createdAt: true,
    },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Fetch one document's bytes, verifying it belongs to the patient. Returns null if not found. */
export async function getPatientDocumentContent(
  patientId: string,
  documentId: string,
): Promise<{ mimeType: string; originalName: string; buffer: Buffer } | null> {
  const row = await prisma.patientDocument.findFirst({
    where: { id: documentId, patientId }, // ownership check (REQ-035 v2 §12)
    select: { mimeType: true, originalName: true, dataBase64: true },
  });
  if (!row) return null;
  return { mimeType: row.mimeType, originalName: row.originalName, buffer: Buffer.from(row.dataBase64, 'base64') };
}
