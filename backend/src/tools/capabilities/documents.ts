// Patient documents tools — thin adapters over ai/upload/patient-documents.ts, the same services
// used by routes/patient-documents.ts.
//
// Scope deviation (documented in the catalog): the route gate `requirePatientDocumentAccess` gives
// Entra operators facility-wide access and pins demo callers to X-Demo-Patient-Id. Tools use the
// registry's ownership scope (`patientScoped: true`, same check as `requirePatientScope`), which is
// STRICTER than the Entra route and never looser than the demo route.
//
// List parsing is the route's shared parser (ai/upload/patient-document-list-query.ts); upload
// MIME/size checks reuse the route's exported helpers/constants.

import {
  createPatientDocument,
  getPatientDocumentContent,
  getPatientDocumentMetadata,
  listPatientDocuments,
  updatePatientDocumentType,
} from '../../ai/upload/patient-documents.js';
import { parsePatientDocumentType } from '../../ai/upload/patient-document-types.js';
import { parsePatientDocumentListQuery } from '../../ai/upload/patient-document-list-query.js';
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  mimeFamily,
  sniffAllowedMime,
} from '../../routes/patient-documents.js';
import { ToolError, toolError } from '../errors.js';
import { actorOf, type ToolDefinition } from '../types.js';

const ENTRY = 'backend/src/routes/patient-documents.ts';
const idField = { type: 'string', minLength: 1 } as const;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

const pid = (input: Record<string, unknown>) => String(input.patientId);
const did = (input: Record<string, unknown>) => String(input.documentId);
const access = (ctx: Parameters<typeof actorOf>[0]) => ({ actor: actorOf(ctx) });
const documentNotFound = () =>
  new ToolError('not_found', 'Documento non trovato', { domainCode: 'document_not_found' });
const invalid = (message: string, domainCode: string, status?: number) =>
  new ToolError('invalid_input', message, { domainCode, ...(status ? { status } : {}) });

export const documentTools: ToolDefinition[] = [
  {
    name: 'documents.list',
    domain: 'documents',
    kind: 'read',
    auditKind: 'read',
    description:
      'Metadati paginati (keyset) dei documenti del paziente — mai i byte. Filtro opzionale sourceFileName.',
    sensitivity: 'medium',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId'],
      properties: {
        patientId: idField,
        query: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
            cursor: { type: 'string' },
            sourceFileName: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: `GET /patients/:patientId/documents (${ENTRY})`,
    services: [
      'ai/upload/patient-document-list-query.ts#parsePatientDocumentListQuery',
      'ai/upload/patient-documents.ts#listPatientDocuments',
    ],
    // Same parser as the route (PatientDocumentListQueryError carries status 400 + code).
    handler: async (input, ctx) => {
      const patientId = pid(input);
      const query = (input.query as Record<string, unknown> | undefined) ?? {};
      return listPatientDocuments(
        patientId,
        parsePatientDocumentListQuery(query, patientId),
        access(ctx),
      );
    },
  },
  {
    name: 'documents.get_metadata',
    domain: 'documents',
    kind: 'read',
    auditKind: 'read',
    description:
      'Metadati di un documento del paziente (nome, tipo, dimensione, sha256, tipologia).',
    sensitivity: 'medium',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'documentId'],
      properties: { patientId: idField, documentId: idField },
      additionalProperties: false,
    },
    entryPoint: `GET /patients/:patientId/documents/:documentId (${ENTRY})`,
    services: ['ai/upload/patient-documents.ts#getPatientDocumentMetadata'],
    handler: async (input, ctx) => {
      const document = await getPatientDocumentMetadata(pid(input), did(input), access(ctx));
      if (!document) throw documentNotFound();
      return { document };
    },
  },
  {
    name: 'documents.get_content',
    domain: 'documents',
    kind: 'read',
    auditKind: 'read',
    description:
      'Contenuto di un documento del paziente come base64 (contentType, fileName, byteLength). Dati clinici sensibili.',
    sensitivity: 'critical',
    patientScoped: true,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'documentId'],
      properties: { patientId: idField, documentId: idField },
      additionalProperties: false,
    },
    entryPoint: `GET /patients/:patientId/documents/:documentId/content (${ENTRY})`,
    services: ['ai/upload/patient-documents.ts#getPatientDocumentContent'],
    handler: async (input, ctx) => {
      const doc = await getPatientDocumentContent(pid(input), did(input), access(ctx));
      if (!doc) throw documentNotFound();
      return {
        contentType: doc.mimeType || 'application/octet-stream',
        fileName: doc.originalName,
        byteLength: doc.buffer.length,
        base64: doc.buffer.toString('base64'),
      };
    },
  },
  {
    name: 'documents.update_type',
    domain: 'documents',
    kind: 'write',
    auditKind: 'update',
    description:
      'Riclassifica la tipologia di un documento del paziente (i PDF delle valutazioni sono immutabili).',
    sensitivity: 'medium',
    patientScoped: true,
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['patientId', 'documentId', 'body'],
      properties: {
        patientId: idField,
        documentId: idField,
        body: {
          type: 'object',
          required: ['documentType'],
          properties: { documentType: { type: 'string' } },
        },
      },
      additionalProperties: false,
    },
    entryPoint: `PATCH /patients/:patientId/documents/:documentId (${ENTRY})`,
    services: [
      'ai/upload/patient-document-types.ts#parsePatientDocumentType',
      'ai/upload/patient-documents.ts#updatePatientDocumentType',
    ],
    handler: async (input, ctx) => {
      // Same body check as the route: only `documentType`, and it must be a known type.
      const body = input.body as Record<string, unknown>;
      const documentType = parsePatientDocumentType(body?.documentType);
      if (Object.keys(body).some((key) => key !== 'documentType') || !documentType)
        throw invalid('Tipologia documento non valida', 'invalid_document_type');
      const document = await updatePatientDocumentType(
        pid(input),
        did(input),
        documentType,
        access(ctx),
      );
      if (!document) throw documentNotFound();
      return { document };
    },
  },
  {
    name: 'documents.upload',
    domain: 'documents',
    kind: 'write',
    auditKind: 'create',
    description:
      'Allega una foto/scansione/PDF (base64, max 15 MB, immagini o PDF verificati sui byte) alla cartella del paziente.',
    sensitivity: 'high',
    patientScoped: true,
    idempotency: 'none',
    // base64 of the 15 MB route limit (+4/3) plus JSON envelope headroom.
    maxBodyBytes: Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 64 * 1024,
    inputSchema: {
      type: 'object',
      required: ['patientId', 'body'],
      properties: {
        patientId: idField,
        body: {
          type: 'object',
          required: ['fileName', 'mimeType', 'base64'],
          properties: {
            documentType: { type: 'string' },
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
            base64: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    entryPoint: `POST /patients/:patientId/documents (multipart, ${ENTRY})`,
    services: [
      'routes/patient-documents.ts#sniffAllowedMime',
      'ai/upload/patient-document-types.ts#parsePatientDocumentType',
      'ai/upload/patient-documents.ts#createPatientDocument',
    ],
    mapError: (error) =>
      error instanceof Error && error.message === 'patient_not_found'
        ? toolError('not_found', 'Paziente non trovato', { domainCode: 'patient_not_found' })
        : undefined,
    // WRAP: base64 → Multer-like file, then the route's own checks in the route's order.
    handler: async (input) => {
      const body = input.body as {
        documentType?: string;
        fileName: string;
        mimeType: string;
        base64: string;
      };
      const encoded = body.base64.replace(/\s+/g, '');
      if (encoded.length % 4 !== 0 || !BASE64.test(encoded))
        throw invalid('Upload non valido', 'invalid_upload');
      // Size bound before decoding (base64 expands by 4/3), then exact check like multer's limit.
      if (Math.floor((encoded.length * 3) / 4) > MAX_UPLOAD_BYTES + 2)
        throw invalid('File troppo grande', 'file_too_large', 413);
      const file = {
        originalname: body.fileName,
        mimetype: body.mimeType,
        buffer: Buffer.from(encoded, 'base64'),
      };
      if (file.buffer.length > MAX_UPLOAD_BYTES)
        throw invalid('File troppo grande', 'file_too_large', 413);
      if (!ALLOWED_MIME.has(file.mimetype))
        throw invalid(
          'Tipo file non supportato (solo immagini o PDF)',
          'unsupported_media_type',
          415,
        );
      const sniffed = sniffAllowedMime(file.buffer);
      if (!sniffed || mimeFamily(sniffed) !== mimeFamily(file.mimetype))
        throw invalid(
          'Il contenuto del file non corrisponde al tipo dichiarato',
          'content_type_mismatch',
          415,
        );
      const documentType = parsePatientDocumentType(body.documentType, true);
      if (!documentType) throw invalid('Tipologia documento non valida', 'invalid_document_type');
      const document = await createPatientDocument(pid(input), file, documentType);
      return { document };
    },
  },
];
