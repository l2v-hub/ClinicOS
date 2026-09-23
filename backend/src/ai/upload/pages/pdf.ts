import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { ImportSessionError, orderPages, type Manifest } from './model.js';
type Original = {
  id: string;
  mimeType: string;
  dataBase64: string | null;
  storagePath: string;
  sizeBytes: number;
  sha256: string;
};
async function deterministicPdf() {
  const pdf = await PDFDocument.create();
  pdf.setCreationDate(new Date('2000-01-01T00:00:00.000Z'));
  pdf.setModificationDate(new Date('2000-01-01T00:00:00.000Z'));
  pdf.setCreator('ClinicOS');
  pdf.setProducer('ClinicOS page import v1');
  return pdf;
}
export async function verifiedBytes(doc: Original): Promise<Buffer> {
  const valid = (b: Buffer) =>
    b.length === doc.sizeBytes && createHash('sha256').update(b).digest('hex') === doc.sha256;
  if (doc.dataBase64) {
    const bytes = Buffer.from(doc.dataBase64, 'base64');
    if (valid(bytes)) return bytes;
    throw new ImportSessionError(
      422,
      'source_integrity',
      'Il documento salvato non supera il controllo di integrità. Ricaricalo.',
    );
  }
  try {
    const bytes = await readFile(doc.storagePath);
    if (valid(bytes)) return bytes;
  } catch {
    /* fixed safe error */
  }
  throw new ImportSessionError(422, 'source_missing', 'Documento non disponibile. Ricaricalo.');
}
export async function pageCount(bytes: Buffer, mime: string): Promise<number> {
  try {
    if (mime === 'application/pdf') {
      const pdf = await PDFDocument.load(bytes);
      const n = pdf.getPageCount();
      if (n > 0) return n;
    } else if (mime === 'image/jpeg' || mime === 'image/png') {
      const pdf = await PDFDocument.create();
      if (mime === 'image/jpeg') await pdf.embedJpg(bytes);
      else await pdf.embedPng(bytes);
      return 1;
    }
  } catch {
    /* encrypted, malformed and unsupported files remain explicit failures */
  }
  throw new ImportSessionError(
    422,
    'invalid_document',
    'PDF o immagine non leggibile. Carica un PDF non protetto, JPEG o PNG.',
  );
}
async function appendPage(target: PDFDocument, bytes: Buffer, mime: string, number: number) {
  if (mime === 'application/pdf') {
    const source = await PDFDocument.load(bytes);
    if (!Number.isInteger(number) || number < 1 || number > source.getPageCount())
      throw new Error('page');
    const [page] = await target.copyPages(source, [number - 1]);
    target.addPage(page);
  } else {
    if (number !== 1) throw new Error('page');
    const img = mime === 'image/jpeg' ? await target.embedJpg(bytes) : await target.embedPng(bytes);
    const page = target.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
}
export async function singlePage(doc: Original, number: number): Promise<Buffer> {
  const bytes = await verifiedBytes(doc);
  if (doc.mimeType !== 'application/pdf') return bytes;
  try {
    const pdf = await deterministicPdf();
    await appendPage(pdf, bytes, doc.mimeType, number);
    return Buffer.from(await pdf.save());
  } catch {
    throw new ImportSessionError(422, 'invalid_document', 'Pagina PDF non disponibile');
  }
}
type Descriptor = Pick<Original, 'id' | 'mimeType' | 'sizeBytes' | 'sha256'>;
/** One source per run. Evict before loading another original; never retain every PDF. */
export function createPageReader(load: (id: string) => Promise<Original>) {
  let entry: { key: string; bytes: Buffer; pdf: PDFDocument | null } | null = null;
  return {
    clear() {
      entry = null;
    },
    async read(doc: Descriptor, number: number): Promise<Buffer> {
      const key = JSON.stringify([doc.id, doc.sha256, doc.sizeBytes, doc.mimeType]);
      if (entry?.key !== key) {
        entry = null;
        const source = await load(doc.id);
        if (
          source.sha256 !== doc.sha256 ||
          source.sizeBytes !== doc.sizeBytes ||
          source.mimeType !== doc.mimeType
        )
          throw new ImportSessionError(
            422,
            'source_integrity',
            'Il documento non corrisponde alla sorgente della sessione',
          );
        const bytes = await verifiedBytes(source);
        let pdf: PDFDocument | null = null;
        try {
          if (doc.mimeType === 'application/pdf') pdf = await PDFDocument.load(bytes);
        } catch {
          throw new ImportSessionError(422, 'invalid_document', 'Pagina PDF non disponibile');
        }
        entry = { key, bytes, pdf };
      }
      if (!entry.pdf) {
        if (number !== 1)
          throw new ImportSessionError(422, 'invalid_document', 'Pagina immagine non disponibile');
        return entry.bytes;
      }
      try {
        if (!Number.isInteger(number) || number < 1 || number > entry.pdf.getPageCount())
          throw new Error('page');
        const target = await deterministicPdf();
        const [page] = await target.copyPages(entry.pdf, [number - 1]);
        target.addPage(page);
        return Buffer.from(await target.save());
      } catch {
        throw new ImportSessionError(422, 'invalid_document', 'Pagina PDF non disponibile');
      }
    },
  };
}
export async function groupPdf(
  m: Manifest,
  groupId: string,
  load: (id: string) => Promise<Original>,
): Promise<Buffer> {
  const pages = orderPages(m, groupId);
  if (!pages.length)
    throw new ImportSessionError(400, 'empty_group', 'La lettera non contiene pagine');
  const first = await load(pages[0].documentId);
  if (pages.every((p) => p.documentId === first.id) && first.mimeType === 'application/pdf') {
    const bytes = await verifiedBytes(first);
    const count = await pageCount(bytes, first.mimeType);
    if (pages.length === count && pages.every((p, i) => p.sourcePageNumber === i + 1)) return bytes;
  }
  try {
    const pdf = await deterministicPdf();
    // One original at a time; repeated pages may reload their original, keeping memory bounded.
    for (const page of pages) {
      const doc = await load(page.documentId);
      await appendPage(pdf, await verifiedBytes(doc), doc.mimeType, page.sourcePageNumber);
    }
    return Buffer.from(await pdf.save());
  } catch (e) {
    if (e instanceof ImportSessionError) throw e;
    throw new ImportSessionError(
      422,
      'invalid_document',
      'Impossibile comporre il PDF della lettera',
    );
  }
}
