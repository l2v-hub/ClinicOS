// Persist imported documents permanently on the patient (REQ-035 v2).
//
// File bytes are stored in Postgres (base64) so they survive Railway redeploy/restart with no
// external object storage. onDelete: Cascade on PatientDocument means deleting the patient
// removes the documents and their bytes — there is no separate storage to clean up.

import type { Prisma } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
      // BUG-049: prefer the durable in-DB copy; fall back to disk for jobs created before the
      // dataBase64 column existed. Only skip if neither source has the bytes.
      let dataBase64 = d.dataBase64 ?? null;
      if (!dataBase64) dataBase64 = (await readFile(d.storagePath)).toString('base64');
      await tx.patientDocument.create({
        data: {
          patientId, importJobId: jobId, originalName: d.filename, mimeType: d.mimeType,
          sizeBytes: d.sizeBytes, sha256: d.sha256, dataBase64,
          sortOrder: d.sortOrder, ...(createdById ? { createdById } : {}),
        },
      });
      saved++;
    } catch {
      /* neither DB bytes nor on-disk file available — skip; never block patient creation */
    }
  }
  return saved;
}

/**
 * #246: attach a photo/scan (or PDF) of an exam / RX / consultation to an EXISTING patient chart.
 * Bytes are stored in Postgres base64 on PatientDocument (same durable store as imported documents),
 * tagged with `documentType` (e.g. "esame" | "rx" | "consulenza"). No object storage, no public URL.
 */
export async function createPatientDocument(
  patientId: string,
  file: { originalname: string; mimetype: string; buffer: Buffer },
  documentType: string,
): Promise<PublicPatientDocument> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new Error('patient_not_found');
  const buf = file.buffer;
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const agg = await prisma.patientDocument.aggregate({ where: { patientId }, _max: { sortOrder: true } });
  const row = await prisma.patientDocument.create({
    data: {
      patientId,
      originalName: (file.originalname || 'foto.jpg').slice(0, 200),
      mimeType: file.mimetype,
      sizeBytes: buf.length,
      sha256,
      dataBase64: buf.toString('base64'),
      documentType,
      sortOrder: (agg._max.sortOrder ?? -1) + 1,
    },
    select: {
      id: true, originalName: true, mimeType: true, sizeBytes: true, sha256: true,
      documentType: true, sortOrder: true, importJobId: true, createdAt: true,
    },
  });
  return { ...row, createdAt: row.createdAt.toISOString() };
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
