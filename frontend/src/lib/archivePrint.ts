import type { ArchiveEntry } from './patientDocumentArchive';
import type { PatientDocumentMeta } from './patientDocumentsPage';

export const ARCHIVE_PRINT_LIMITS = { documents: 20, pages: 40, bytes: 50 * 1024 * 1024, pixels: 60_000_000 };
const PRINT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
export const printableMime = (type: string) => PRINT_TYPES.has(type.split(';')[0].trim().toLowerCase());

export function archivePrintUnavailable(entry: ArchiveEntry): string {
  if (!entry.document) return entry.unavailable ? 'Allegato non disponibile' : 'Nessun file allegato';
  return printableMime(entry.document.mimeType) ? '' : 'Stampa disponibile per PDF e immagini JPEG, PNG o WebP';
}

export function selectedArchiveDocuments(entries: ArchiveEntry[], ids: ReadonlySet<string>) {
  const documents = new Map<string, PatientDocumentMeta>();
  for (const entry of entries)
    if (entry.document && ids.has(entry.document.id) && !archivePrintUnavailable(entry))
      documents.set(entry.document.id, entry.document);
  return [...documents.values()];
}

export interface ArchivePrintPage {
  blob: Blob;
  width: number;
  height: number;
  documentName: string;
  pageNumber: number;
}
export type RenderedPrintPage = Omit<ArchivePrintPage, 'documentName' | 'pageNumber'>;
export interface ArchivePrintDependencies {
  read: (id: string, signal: AbortSignal) => Promise<Blob>;
  render: (blob: Blob, signal: AbortSignal, remainingPages: number) => AsyncIterable<RenderedPrintPage>;
}

/** No printer is touched until this entire bounded batch succeeds. */
export async function prepareArchivePrint(
  documents: PatientDocumentMeta[],
  signal: AbortSignal,
  dependencies: ArchivePrintDependencies,
  progress: (completed: number, total: number) => void = () => {},
): Promise<ArchivePrintPage[]> {
  signal.throwIfAborted();
  const unique = [...new Map(documents.map((item) => [item.id, item])).values()];
  if (!unique.length) throw new Error('Seleziona almeno un documento.');
  if (unique.length > ARCHIVE_PRINT_LIMITS.documents)
    throw new Error('Seleziona al massimo 20 documenti per ogni stampa.');
  if (unique.some((item) => !printableMime(item.mimeType) || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes <= 0))
    throw new Error('Uno dei file selezionati non è disponibile per la stampa.');
  if (unique.reduce((sum, item) => sum + item.sizeBytes, 0) > ARCHIVE_PRINT_LIMITS.bytes)
    throw new Error('I documenti superano 50 MB. Riduci la selezione.');
  const pages: ArchivePrintPage[] = [];
  let bytes = 0;
  let pixels = 0;
  let renderedBytes = 0;
  for (const [index, document] of unique.entries()) {
    signal.throwIfAborted();
    progress(index, unique.length);
    try {
      const blob = await dependencies.read(document.id, signal);
      signal.throwIfAborted();
      bytes += blob.size;
      if (!printableMime(blob.type) || !blob.size) throw new Error('Formato non stampabile.');
      if (bytes > ARCHIVE_PRINT_LIMITS.bytes) throw new Error('Superato il limite complessivo di 50 MB.');
      let pageNumber = 0;
      for await (const page of dependencies.render(blob, signal, ARCHIVE_PRINT_LIMITS.pages - pages.length)) {
        signal.throwIfAborted();
        if (![page.width, page.height].every((size) => Number.isFinite(size) && size > 0) ||
            !['image/jpeg', 'image/png'].includes(page.blob.type) || !page.blob.size)
          throw new Error('Pagina non valida.');
        pixels += page.width * page.height;
        renderedBytes += page.blob.size;
        if (pages.length >= ARCHIVE_PRINT_LIMITS.pages || pixels > ARCHIVE_PRINT_LIMITS.pixels ||
            renderedBytes > ARCHIVE_PRINT_LIMITS.bytes)
          throw new Error('Troppi contenuti per una sola stampa. Riduci la selezione.');
        pages.push({ ...page, documentName: document.originalName, pageNumber: ++pageNumber });
      }
      if (!pageNumber) throw new Error('Il documento non contiene pagine stampabili.');
    } catch (error) {
      signal.throwIfAborted();
      const reason = error instanceof Error ? error.message : 'File non leggibile.';
      throw new Error(`Impossibile preparare “${document.originalName}”. ${reason} Nessun documento è stato stampato.`);
    }
    progress(index + 1, unique.length);
  }
  signal.throwIfAborted();
  return pages;
}
