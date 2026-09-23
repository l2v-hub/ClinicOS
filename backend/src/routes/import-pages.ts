import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import type { AuthedRequest } from '../ai/auth.js';
import { requireOwnedImportJob } from '../ai/ownership.js';
import { extractionCostGuard } from '../ai/rate-limit.js';
import { documentContentDisposition } from '../ai/upload/patient-document-types.js';
import { ImportSessionError, LIMITS, manifest, object } from '../ai/upload/pages/model.js';
import { getPageJob, isPageSession } from '../ai/upload/pages/repository.js';
import {
  createPageSession,
  addPageFiles,
  replacePage,
  removePage,
} from '../ai/upload/pages/uploads.js';
import {
  editManifest,
  processPages,
  reopenPages,
  cancelPages,
} from '../ai/upload/pages/lifecycle.js';
import { pageUpload, uploadMetadata } from '../ai/upload/pages/multipart.js';
import { groupPdf, verifiedBytes } from '../ai/upload/pages/pdf.js';
import { saveReview } from '../ai/upload/pages/review.js';
const router = Router();
router.param('id', requireOwnedImportJob);
type Handler = (req: Request, res: Response) => Promise<unknown>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(async (e) => {
    if (e instanceof ImportSessionError) {
      const details = { ...e.details };
      if (e.code === 'revision_conflict' && req.params.id)
        details.job = await getPageJob(String(req.params.id)).catch(() => null);
      res.status(e.status).json({ error: e.message, code: e.code, ...details });
    } else if (e instanceof multer.MulterError)
      res
        .status(413)
        .json({ error: 'Caricamento oltre il limite consentito', code: 'request_limit' });
    else next(e);
  });
};
const pageOnly = (req: Request, _res: Response, next: NextFunction) => {
  isPageSession(String(req.params.id))
    .then((ok) => next(ok ? undefined : 'route'))
    .catch(next);
};
const bounded = (req: Request, _res: Response, next: NextFunction) => {
  const length = Number(req.header('content-length'));
  if (Number.isFinite(length) && length > LIMITS.maxRequestBytes)
    return next(
      new ImportSessionError(413, 'request_limit', 'Caricamento oltre il limite consentito'),
    );
  next();
};
const files = (req: Request) =>
  ((req.files as Express.Multer.File[]) ?? []).map((f) => ({
    filename: f.originalname,
    declaredMime: f.mimetype,
    data: f.buffer,
  }));
router.post('/', (req, res, next) => {
  if (req.body?.sessionVersion !== 1) return next();
  handle(async (r, s) =>
    s
      .status(201)
      .json({
        job: await createPageSession(
          r.header('Idempotency-Key') ?? r.body?.idempotencyKey,
          (r as AuthedRequest).operator!.id,
        ),
        outcomes: [],
      }),
  )(req, res, next);
});
router.get(
  '/:id',
  pageOnly,
  handle(async (req, res) => res.json(await getPageJob(String(req.params.id)))),
);
router.post(
  '/:id/files',
  pageOnly,
  bounded,
  pageUpload,
  handle(async (req, res) =>
    res.json(
      await addPageFiles(String(req.params.id), files(req), uploadMetadata(req.body.metadata)),
    ),
  ),
);
router.put(
  '/:id/manifest',
  pageOnly,
  handle(async (req, res) => res.json(await editManifest(String(req.params.id), req.body))),
);
router.delete(
  '/:id/pages/:pageId',
  pageOnly,
  handle(async (req, res) =>
    res.json(await removePage(String(req.params.id), String(req.params.pageId), req.body)),
  ),
);
router.post(
  '/:id/pages/:pageId/replace',
  pageOnly,
  bounded,
  pageUpload,
  handle(async (req, res) =>
    res.json(
      await replacePage(
        String(req.params.id),
        String(req.params.pageId),
        files(req),
        uploadMetadata(req.body.metadata),
      ),
    ),
  ),
);
router.get(
  '/:id/files/:docId/content',
  pageOnly,
  handle(async (req, res) => {
    const doc = await prisma.importDocument.findFirst({
      where: { id: String(req.params.docId), jobId: String(req.params.id) },
    });
    if (!doc) throw new ImportSessionError(404, 'not_found', 'Documento non trovato');
    const bytes = await verifiedBytes(doc);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', documentContentDisposition(doc.filename));
    res.type(doc.mimeType).send(bytes);
  }),
);
router.get(
  '/:id/groups/:groupId/pdf',
  pageOnly,
  handle(async (req, res) => {
    const jobId = String(req.params.id);
    const job = await prisma.importJob.findUniqueOrThrow({
      where: { id: jobId },
      select: { manifest: true, manifestRevision: true },
    });
    const m = manifest(job.manifest);
    const group = m.groups.find((g) => g.id === req.params.groupId);
    if (!group) throw new ImportSessionError(404, 'not_found', 'Lettera non trovata');
    const bytes = await groupPdf(m, group.id, (documentId) =>
      prisma.importDocument.findFirstOrThrow({ where: { id: documentId, jobId } }),
    );
    res.setHeader('X-Import-Revision', String(job.manifestRevision));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', documentContentDisposition(`${group.label}.pdf`));
    res.type('application/pdf').send(bytes);
  }),
);
router.post(
  '/:id/process',
  pageOnly,
  extractionCostGuard,
  handle(async (req, res) =>
    res
      .status(202)
      .json({
        ...(await processPages(String(req.params.id), req.body)),
        message: 'Elaborazione avviata',
      }),
  ),
);
router.post(
  '/:id/retry',
  pageOnly,
  extractionCostGuard,
  handle(async (req, res) =>
    res
      .status(202)
      .json({
        ...(await processPages(String(req.params.id), req.body, true)),
        message: 'Nuovo tentativo avviato',
      }),
  ),
);
router.post(
  '/:id/reopen',
  pageOnly,
  handle(async (req, res) => res.json(await reopenPages(String(req.params.id), req.body))),
);
router.post(
  '/:id/cancel',
  pageOnly,
  handle(async (req, res) => res.json(await cancelPages(String(req.params.id)))),
);
router.get(
  '/:id/result',
  pageOnly,
  handle(async (req, res) => {
    const job = await prisma.importJob.findUniqueOrThrow({
      where: { id: String(req.params.id) },
      select: { status: true, model: true, resultData: true },
    });
    return res.json(job);
  }),
);
router.put(
  '/:id/review',
  pageOnly,
  handle(async (req, res) => res.json(await saveReview(String(req.params.id), req.body))),
);
for (const path of ['/:id/reorder', '/:id/files/:docId/logical'])
  router.post(
    path,
    pageOnly,
    handle(async () => {
      throw new ImportSessionError(
        409,
        'page_api_required',
        'Aggiorna le singole pagine dal manifest della sessione',
      );
    }),
  );
router.delete(
  '/:id/files/:docId',
  pageOnly,
  handle(async () => {
    throw new ImportSessionError(
      409,
      'page_api_required',
      'Rimuovi le singole pagine dal manifest della sessione',
    );
  }),
);
router.use((e: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (e instanceof ImportSessionError)
    res.status(e.status).json({ error: e.message, code: e.code, ...e.details });
  else if (e instanceof multer.MulterError)
    res
      .status(413)
      .json({ error: 'Caricamento oltre il limite consentito', code: 'request_limit' });
  else next(e);
});
export default router;
