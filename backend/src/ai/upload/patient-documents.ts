// Persist imported documents permanently on the patient (REQ-035 v2).
//
// File bytes are stored in Postgres (base64) so they survive Railway redeploy/restart with no
// external object storage. onDelete: Cascade on PatientDocument means deleting the patient
// removes the documents and their bytes — there is no separate storage to clean up.

import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import {
  assessmentDocumentWhere,
  type AssessmentDocumentAccess,
} from '../../assessments/document-access.js';
import { AssessmentError, type AssessmentDocumentMeta } from '../../assessments/types.js';
import { assessmentTransaction } from '../../assessments/access.js';
import {
  encodePatientDocumentCursor,
  type DecodedPatientDocumentCursor,
} from './patient-document-cursor.js';
export { persistImportDocuments } from './import-document-archive.js';

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
  sourceManifest?: unknown;
  assessment: AssessmentDocumentMeta | null;
}

export interface AiPatientDocument {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string;
  createdAt: string;
}

export const AI_PATIENT_DOCUMENT_LIMIT = 100;
export const AI_PATIENT_DOCUMENT_LOOKAHEAD = AI_PATIENT_DOCUMENT_LIMIT + 1;

export interface PatientDocumentPage {
  documents: PublicPatientDocument[];
  total: number | null;
  sourceMatch: PublicPatientDocument | null;
  pageInfo: { loadedCount: number; hasMore: boolean; nextCursor: string | null };
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
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  });
  if (!patient) throw new Error('patient_not_found');
  const buf = file.buffer;
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const agg = await prisma.patientDocument.aggregate({
    where: { patientId },
    _max: { sortOrder: true },
  });
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
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      documentType: true,
      sortOrder: true,
      importJobId: true,
      createdAt: true,
    },
  });
  return { ...row, createdAt: row.createdAt.toISOString(), assessment: null };
}

const PATIENT_DOCUMENT_PUBLIC_SELECT = {
  assessment: { select: { id: true, type: true, formVersion: true, assessedAt: true } },
  sourceManifest: true,
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  documentType: true,
  sortOrder: true,
  importJobId: true,
  createdAt: true,
} satisfies Prisma.PatientDocumentSelect;

/** Reclassify only the named patient's file; bytes and original filename are immutable here. */
export async function updatePatientDocumentType(
  patientId: string,
  documentId: string,
  documentType: string,
  access?: AssessmentDocumentAccess,
): Promise<PublicPatientDocument | null> {
  const where = { id: documentId, patientId, ...assessmentDocumentWhere(access) };
  const existing = await prisma.patientDocument.findFirst({
    where,
    select: { assessmentId: true },
  });
  if (existing?.assessmentId)
    throw new AssessmentError(
      'Il documento della valutazione è immutabile',
      409,
      'assessment_document_immutable',
    );
  const updated = await prisma.patientDocument.updateMany({ where, data: { documentType } });
  if (updated.count !== 1) return null;
  const row = await prisma.patientDocument.findFirst({
    where,
    select: PATIENT_DOCUMENT_PUBLIC_SELECT,
  });
  return row ? documentDto(row) : null;
}

type DocumentRow = Prisma.PatientDocumentGetPayload<{
  select: typeof PATIENT_DOCUMENT_PUBLIC_SELECT;
}>;
function documentDto(row: DocumentRow): PublicPatientDocument {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    assessment: row.assessment
      ? {
          id: row.assessment.id,
          type: 'painad',
          formVersion: row.assessment.formVersion,
          assessedAt: row.assessment.assessedAt.toISOString(),
        }
      : null,
  };
}
export async function getPatientDocumentMetadata(
  patientId: string,
  documentId: string,
  access?: AssessmentDocumentAccess,
) {
  const row = await assessmentTransaction((tx) =>
    tx.patientDocument.findFirst({
      where: { id: documentId, patientId, ...assessmentDocumentWhere(access) },
      select: PATIENT_DOCUMENT_PUBLIC_SELECT,
    }),
  );
  return row ? documentDto(row) : null;
}

/** Bounded document metadata page for the patient (never includes the base64 bytes). */
export async function listPatientDocuments(
  patientId: string,
  options: {
    limit: number;
    cursor?: DecodedPatientDocumentCursor;
    sourceFileName?: string;
  },
  access?: AssessmentDocumentAccess,
): Promise<PatientDocumentPage> {
  const { limit, cursor, sourceFileName } = options;
  const [rows, sourceRow, total] = await assessmentTransaction((tx) =>
    Promise.all([
      tx.patientDocument.findMany({
        where: {
          patientId,
          AND: [assessmentDocumentWhere(access)],
          ...(cursor
            ? {
                OR: [
                  { sortOrder: { gt: cursor.sortOrder } },
                  { sortOrder: cursor.sortOrder, id: { gt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        select: PATIENT_DOCUMENT_PUBLIC_SELECT,
      }),
      sourceFileName
        ? tx.patientDocument.findFirst({
            where: { patientId, originalName: sourceFileName, ...assessmentDocumentWhere(access) },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            select: PATIENT_DOCUMENT_PUBLIC_SELECT,
          })
        : Promise.resolve(null),
      cursor
        ? Promise.resolve(null)
        : tx.patientDocument.count({ where: { patientId, ...assessmentDocumentWhere(access) } }),
    ]),
  );
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const documents = pageRows.map(documentDto);
  const last = documents.at(-1);

  return {
    documents,
    total,
    sourceMatch: sourceRow ? documentDto(sourceRow) : null,
    pageInfo: {
      loadedCount: documents.length,
      hasMore,
      nextCursor: hasMore && last ? encodePatientDocumentCursor(patientId, last) : null,
    },
  };
}

/** Bounded, minimized metadata projection for the AI gateway; never used by the full UI list. */
export async function listPatientDocumentsForAi(
  patientId: string,
  access?: AssessmentDocumentAccess,
): Promise<AiPatientDocument[]> {
  const rows = await prisma.patientDocument.findMany({
    where: { patientId, ...assessmentDocumentWhere(access) },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    take: AI_PATIENT_DOCUMENT_LOOKAHEAD,
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      documentType: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/** Fetch one document's bytes, verifying it belongs to the patient. Returns null if not found. */
export async function getPatientDocumentContent(
  patientId: string,
  documentId: string,
  access?: AssessmentDocumentAccess,
): Promise<{ mimeType: string; originalName: string; buffer: Buffer } | null> {
  const row = await prisma.patientDocument.findFirst({
    where: { id: documentId, patientId, ...assessmentDocumentWhere(access) },
    select: { mimeType: true, originalName: true, dataBase64: true },
  });
  if (!row) return null;
  return {
    mimeType: row.mimeType,
    originalName: row.originalName,
    buffer: Buffer.from(row.dataBase64, 'base64'),
  };
}
