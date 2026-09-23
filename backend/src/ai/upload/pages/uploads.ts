import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import { loadAiConfig } from '../../config.js';
import { validateFile, type IncomingFile } from '../validation.js';
import { pageCount } from './pdf.js';
import {
  LIMITS,
  ImportSessionError,
  id,
  jsonInput,
  object,
  orderPages,
  renumber,
  type Json,
  type Manifest,
  type Tx,
} from './model.js';
import { getPageJob, mutateSession } from './repository.js';

export async function createPageSession(key: unknown, owner: string) {
  const idempotencyKey = id(key, 'Idempotency-Key');
  const existing = await prisma.importJob.findUnique({
    where: { idempotencyKey },
    select: { id: true, createdById: true, manifest: true },
  });
  if (existing) {
    if (existing.createdById !== owner)
      throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
    if (object(existing.manifest).version !== 1)
      throw new ImportSessionError(
        409,
        'idempotency_conflict',
        'Chiave già usata per un altro formato di sessione',
      );
    return getPageJob(existing.id);
  }
  const cfg = loadAiConfig();
  try {
    const job = await prisma.importJob.create({
      data: {
        idempotencyKey,
        createdById: owner,
        status: 'uploaded',
        maxFiles: LIMITS.maxSourceFiles,
        maxPages: LIMITS.maxPages,
        maxTotalBytes: Math.min(LIMITS.maxTotalBytes, cfg.maxTotalMb * 1024 * 1024),
        expiresAt: new Date(Date.now() + cfg.jobRetentionMin * 60000),
        manifest: jsonInput({
          version: 1,
          groups: [{ id: randomUUID(), label: 'Lettera 1', sortOrder: 0 }],
          pages: [],
        }),
      },
    });
    return getPageJob(job.id);
  } catch (e) {
    if (object(e).code === 'P2002') {
      const raced = await prisma.importJob.findUnique({
        where: { idempotencyKey },
        select: { id: true, createdById: true },
      });
      if (raced?.createdById === owner) return getPageJob(raced.id);
    }
    throw e;
  }
}
type Prepared = {
  file: IncomingFile;
  clientFileId: string;
  validated: NonNullable<ReturnType<typeof validateFile>['file']>;
  count: number;
};
async function prepare(file: IncomingFile, clientId: unknown): Promise<Prepared> {
  const clientFileId = id(clientId, 'clientFileId');
  const validated = validateFile(file, { maxFileBytes: LIMITS.maxFileBytes });
  if (!validated.ok || !validated.file)
    throw new ImportSessionError(
      400,
      validated.reason ?? 'invalid_file',
      validated.message ?? 'File non valido',
    );
  if (!LIMITS.acceptedMimeTypes.includes(validated.file.mimeType))
    throw new ImportSessionError(400, 'type_not_allowed', 'Per le pagine usa PDF, JPEG o PNG');
  const count = await pageCount(file.data, validated.file.mimeType);
  if (count > LIMITS.maxPages)
    throw new ImportSessionError(
      413,
      'page_limit',
      `Il documento supera ${LIMITS.maxPages} pagine`,
    );
  return { file, clientFileId, validated: validated.file, count };
}
async function saveSource(tx: Tx, jobId: string, p: Prepared, sortOrder: number) {
  return tx.importDocument.create({
    data: {
      jobId,
      filename: p.validated.safeName,
      mimeType: p.validated.mimeType,
      sizeBytes: p.validated.sizeBytes,
      sha256: p.validated.sha256,
      dataBase64: p.file.data.toString('base64'),
      storagePath: '',
      pageCount: p.count,
      status: 'uploaded',
      sortOrder,
    },
  });
}
async function recount(tx: Tx, jobId: string, m: Manifest, maxFiles: number, maxBytes: number) {
  const ids = [...new Set(m.pages.map((p) => p.documentId))];
  const docs = await tx.importDocument.findMany({
    where: { jobId, id: { in: ids } },
    select: { id: true, sizeBytes: true },
  });
  const total = docs.reduce((n, d) => n + d.sizeBytes, 0);
  if (docs.length > maxFiles || total > maxBytes)
    throw new ImportSessionError(
      413,
      'session_limit',
      'Limite di file o dimensione totale della sessione superato',
    );
  // V1 originals are DB-only. Drop only bytes explicitly removed from every page reference.
  await tx.importDocument.deleteMany({ where: { jobId, id: { notIn: ids } } });
  await tx.importJob.update({ where: { id: jobId }, data: { totalBytes: total } });
}
export async function addPageFiles(jobId: string, files: IncomingFile[], metadata: unknown) {
  const meta = object(metadata);
  const items = Array.isArray(meta.items) ? meta.items : [];
  if (!files.length || files.length > LIMITS.maxFilesPerRequest || items.length !== files.length)
    throw new ImportSessionError(400, 'invalid_files', 'File e identificativi non corrispondono');
  if (files.reduce((n, f) => n + f.data.length, 0) > LIMITS.maxTotalBytes)
    throw new ImportSessionError(413, 'request_limit', 'Carica un gruppo di file più piccolo');
  const prepared: Array<
    Prepared | { error: ImportSessionError; file: IncomingFile; clientFileId: string }
  > = [];
  for (let i = 0; i < files.length; i++) {
    const clientFileId = id(object(items[i]).clientFileId, 'clientFileId');
    try {
      prepared.push(await prepare(files[i], clientFileId));
    } catch (e) {
      if (!(e instanceof ImportSessionError)) throw e;
      prepared.push({ error: e, file: files[i], clientFileId });
    }
  }
  const payload = {
    ...meta,
    files: files.map((f) => ({
      filename: f.filename,
      mime: f.declaredMime,
      size: f.data.length,
      hash: createHash('sha256').update(f.data).digest('hex'),
    })),
  };
  const outcomes = await mutateSession(
    jobId,
    meta.requestId,
    meta.expectedRevision,
    'upload',
    payload,
    async (tx, m, job) => {
      const groupId = id(meta.groupId, 'groupId');
      if (!m.groups.some((g) => g.id === groupId))
        throw new ImportSessionError(400, 'invalid_group', 'Lettera non trovata');
      const out: Json[] = [];
      let total = job.totalBytes;
      let sources = new Set(m.pages.map((p) => p.documentId)).size;
      for (const p of prepared) {
        if ('error' in p) {
          out.push({
            filename: p.file.filename,
            clientFileId: p.clientFileId,
            status: 'rejected',
            pageIds: [],
            reason: p.error.code,
            message: p.error.message,
          });
          continue;
        }
        const prior = await tx.importDocument.findUnique({
          where: { jobId_sha256: { jobId, sha256: p.validated.sha256 } },
          select: { id: true },
        });
        if (prior) {
          out.push({
            filename: p.file.filename,
            clientFileId: p.clientFileId,
            status: 'duplicate',
            documentId: prior.id,
            pageIds: m.pages.filter((x) => x.documentId === prior.id).map((x) => x.id),
            message: 'Documento già presente',
          });
          continue;
        }
        if (
          m.pages.length + p.count > (job.maxPages ?? 30) ||
          sources + 1 > job.maxFiles ||
          total + p.validated.sizeBytes > job.maxTotalBytes
        ) {
          out.push({
            filename: p.file.filename,
            clientFileId: p.clientFileId,
            status: 'rejected',
            pageIds: [],
            reason: 'session_limit',
            message: 'Limite pagine, file o dimensione totale superato',
          });
          continue;
        }
        const doc = await saveSource(tx, jobId, p, sources);
        const pageIds: string[] = [];
        const start = orderPages(m, groupId).length;
        for (let n = 1; n <= p.count; n++) {
          const pageId = randomUUID();
          pageIds.push(pageId);
          m.pages.push({
            id: pageId,
            documentId: doc.id,
            sourcePageNumber: n,
            groupId,
            sortOrder: start + n - 1,
          });
        }
        sources++;
        total += p.validated.sizeBytes;
        out.push({
          filename: p.file.filename,
          clientFileId: p.clientFileId,
          status: 'accepted',
          documentId: doc.id,
          pageIds,
        });
      }
      await recount(tx, jobId, m, job.maxFiles, job.maxTotalBytes);
      return out;
    },
  );
  return { job: await getPageJob(jobId), outcomes };
}
export async function replacePage(
  jobId: string,
  pageId: string,
  files: IncomingFile[],
  metadata: unknown,
) {
  const meta = object(metadata);
  if (files.length !== 1)
    throw new ImportSessionError(400, 'invalid_files', 'Scegli un solo file per rifare la pagina');
  const p = await prepare(files[0], meta.clientFileId);
  if (p.count !== 1)
    throw new ImportSessionError(
      400,
      'invalid_page',
      'La sostituzione deve contenere una sola pagina',
    );
  const outcomes = await mutateSession(
    jobId,
    meta.requestId,
    meta.expectedRevision,
    'replace',
    { ...meta, pageId, sha: p.validated.sha256 },
    async (tx, m, job) => {
      const page = m.pages.find((x) => x.id === id(pageId));
      if (!page) throw new ImportSessionError(404, 'not_found', 'Pagina non trovata');
      const prior = await tx.importDocument.findUnique({
        where: { jobId_sha256: { jobId, sha256: p.validated.sha256 } },
        select: { id: true },
      });
      if (prior && prior.id !== page.documentId)
        throw new ImportSessionError(
          409,
          'duplicate_source',
          'Questo documento è già presente: conserva la pagina corrente oppure riordina le pagine',
        );
      const doc = prior ?? (await saveSource(tx, jobId, p, page.sortOrder));
      page.documentId = doc.id;
      page.sourcePageNumber = 1;
      await recount(tx, jobId, m, job.maxFiles, job.maxTotalBytes);
      return [
        {
          filename: p.file.filename,
          clientFileId: p.clientFileId,
          status: prior ? 'duplicate' : 'accepted',
          documentId: doc.id,
          pageIds: [page.id],
        },
      ];
    },
  );
  return { job: await getPageJob(jobId), outcomes };
}
export async function removePage(jobId: string, pageId: string, metadata: unknown) {
  const meta = object(metadata);
  await mutateSession(
    jobId,
    meta.requestId,
    meta.expectedRevision,
    'remove-page',
    { ...meta, pageId },
    async (tx, m, job) => {
      if (!m.pages.some((p) => p.id === id(pageId)))
        throw new ImportSessionError(404, 'not_found', 'Pagina non trovata');
      m.pages = m.pages.filter((p) => p.id !== pageId);
      renumber(m);
      await recount(tx, jobId, m, job.maxFiles, job.maxTotalBytes);
      return {};
    },
  );
  return getPageJob(jobId);
}
