// OCR text of single pages of a page session: the GET /ai/extraction/jobs/:id/pages/:pageId/text
// view and the loader the AI → draft merge uses for page provenance.
//
// A page's text is its OCR processing unit (`kind: 'ocr'`, `unitKey = pageId`) at the page's
// CURRENT input hash: a replaced page (new document bytes) never returns the old text.
// Privacy: the text is clinical data — never logged, never in URLs, served with no-store.
import type { Request, Response } from 'express';
import { prisma } from '../../../lib/prisma.js';
import { pageHash } from './inputs.js';
import {
  ImportSessionError,
  manifest,
  object,
  orderPages,
  type Manifest,
  type Tx,
} from './model.js';
import type { PageText } from './page-locate.js';

type Db = Pick<Tx, 'importDocument' | 'importProcessingUnit'>;
type OcrUnit = { unitKey: string; inputHash: string; status: string; result: unknown };

export type PageTextView = {
  pageId: string;
  status: string;
  rawText: string | null;
  manifestRevision: number;
};

/** Pure view of one page's text. Throws 404 for a page that is not in the manifest. */
export function pageTextView(
  m: Manifest,
  manifestRevision: number,
  shas: Map<string, string>,
  pageId: string,
  units: OcrUnit[],
): PageTextView {
  const page = m.pages.find((p) => p.id === pageId);
  if (!page) throw new ImportSessionError(404, 'not_found', 'Pagina non trovata');
  const inputHash = pageHash(page, shas.get(page.documentId) ?? '');
  const unit = units.find((u) => u.unitKey === page.id && u.inputHash === inputHash);
  const status = unit?.status ?? 'pending';
  const text = object(unit?.result).rawText;
  return {
    pageId: page.id,
    status,
    rawText: status === 'completed' && typeof text === 'string' ? text : null,
    manifestRevision,
  };
}

/** Loads the current text view of one page (only that page's OCR rows are read). */
export async function loadPageText(jobId: string, pageId: string): Promise<PageTextView> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    select: { manifest: true, manifestRevision: true },
  });
  if (!job) throw new ImportSessionError(404, 'not_found', 'Sessione non trovata');
  const m = manifest(job.manifest);
  const page = m.pages.find((p) => p.id === pageId);
  if (!page) throw new ImportSessionError(404, 'not_found', 'Pagina non trovata');
  const [doc, units] = await Promise.all([
    prisma.importDocument.findFirst({
      where: { id: page.documentId, jobId },
      select: { id: true, sha256: true },
    }),
    prisma.importProcessingUnit.findMany({
      where: { jobId, kind: 'ocr', unitKey: page.id },
      select: { unitKey: true, inputHash: true, status: true, result: true },
    }),
  ]);
  const shas = new Map(doc ? [[doc.id, doc.sha256]] : []);
  return pageTextView(m, job.manifestRevision, shas, pageId, units);
}

/** Express handler factory; the loader is injectable so the HTTP contract is testable offline. */
export const pageTextHandler =
  (load: (jobId: string, pageId: string) => Promise<PageTextView> = loadPageText) =>
  async (req: Request, res: Response) => {
    const view = await load(String(req.params.id), String(req.params.pageId));
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(view);
  };

/**
 * Current, completed OCR text of the pages of the given letters (all letters when omitted), in
 * manifest order, for the draft merge. Pages without a current completed OCR row are skipped.
 * Reads only the OCR rows of those pages: never `_full` nor the assembled result.
 */
export async function loadPageTexts(
  db: Db,
  jobId: string,
  m: Manifest,
  groupIds?: string[],
): Promise<PageText[]> {
  const pages = orderPages(m).filter((p) => !groupIds || groupIds.includes(p.groupId));
  if (!pages.length) return [];
  const [documents, units] = await Promise.all([
    db.importDocument.findMany({
      where: { jobId, id: { in: [...new Set(pages.map((p) => p.documentId))] } },
      select: { id: true, sha256: true },
    }),
    db.importProcessingUnit.findMany({
      where: { jobId, kind: 'ocr', status: 'completed', unitKey: { in: pages.map((p) => p.id) } },
      select: { unitKey: true, inputHash: true, result: true },
    }),
  ]);
  const shas = new Map(documents.map((d) => [d.id, d.sha256]));
  const texts: PageText[] = [];
  for (const p of pages) {
    const inputHash = pageHash(p, shas.get(p.documentId) ?? '');
    const unit = units.find((u) => u.unitKey === p.id && u.inputHash === inputHash);
    const text = object(unit?.result).rawText;
    if (typeof text === 'string' && text)
      texts.push({ groupId: p.groupId, pageId: p.id, documentId: p.documentId, text });
  }
  return texts;
}
