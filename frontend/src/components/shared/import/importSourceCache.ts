import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { ImportFetch } from './importSessionApi';
import type { ImportDocument, ImportPage } from './importSessionTypes';

/** Active-session memory only. One download per immutable source, serialized bounded thumbnails. */
export class ImportSourceCache {
  private blobs = new Map<string, Promise<Blob>>();
  private urls = new Map<string, string>();
  private thumbnails = new Map<string, Promise<string>>();
  private pdfs = new Map<string, { task: PDFDocumentLoadingTask; pdf: PDFDocumentProxy }>();
  private controller = new AbortController();
  private queue: Promise<unknown> = Promise.resolve();
  private request: ImportFetch;
  private base: string;
  private maxFileBytes: number;
  private retained: Set<string> | null = null;
  constructor(request: ImportFetch, base: string, maxFileBytes: number) {
    this.request = request;
    this.base = base;
    this.maxFileBytes = maxFileBytes;
  }
  private ensureOpen() {
    if (this.controller.signal.aborted) throw new Error('Anteprima chiusa.');
  }
  private ensureDocument(id: string) {
    this.ensureOpen();
    if (this.retained && !this.retained.has(id)) throw new Error('Originale sostituito.');
  }
  retain(documents: ImportDocument[]) {
    this.retained = new Set(documents.map((document) => document.id));
    for (const id of this.blobs.keys())
      if (!this.retained.has(id)) {
        this.blobs.delete(id);
        const pdf = this.pdfs.get(id);
        if (pdf) void pdf.task.destroy().catch(() => {});
        this.pdfs.delete(id);
        for (const [key, url] of this.urls)
          if (key === id || key.startsWith(`thumb:${id}:`)) {
            URL.revokeObjectURL(url);
            this.urls.delete(key);
          }
        for (const key of this.thumbnails.keys())
          if (key.startsWith(`${id}:`)) this.thumbnails.delete(key);
      }
  }
  blob(document: ImportDocument): Promise<Blob> {
    this.ensureDocument(document.id);
    let pending = this.blobs.get(document.id);
    if (!pending) {
      pending = this.request(`${this.base}/files/${encodeURIComponent(document.id)}/content`, {
        signal: this.controller.signal,
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Originale non disponibile. Riprova.');
          const length = Number(response.headers.get('Content-Length') || 0);
          if (length > this.maxFileBytes)
            throw new Error('Anteprima oltre il limite della sessione.');
          const chunks: BlobPart[] = [];
          const reader = response.body?.getReader();
          let size = 0;
          if (reader) {
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > this.maxFileBytes) {
                  await reader.cancel();
                  throw new Error('Anteprima oltre il limite della sessione.');
                }
                chunks.push(new Uint8Array(value).buffer);
              }
            } finally {
              reader.releaseLock();
            }
          }
          const blob = reader
            ? new Blob(chunks, { type: response.headers.get('Content-Type') ?? document.mimeType })
            : await response.blob();
          this.ensureDocument(document.id);
          if (blob.size > this.maxFileBytes)
            throw new Error('Anteprima oltre il limite della sessione.');
          return blob;
        })
        .catch((error) => {
          this.blobs.delete(document.id);
          throw error;
        });
      this.blobs.set(document.id, pending);
    }
    return pending;
  }
  async url(document: ImportDocument) {
    const blob = await this.blob(document);
    this.ensureDocument(document.id);
    let url = this.urls.get(document.id);
    if (!url) {
      url = URL.createObjectURL(blob);
      this.urls.set(document.id, url);
    }
    return url;
  }
  thumbnail(document: ImportDocument, page: ImportPage): Promise<string> {
    const key = `${document.id}:${page.sourcePageNumber}`;
    let pending = this.thumbnails.get(key);
    if (!pending) {
      pending = this.queue.then(() => this.renderThumbnail(document, page));
      this.queue = pending.catch(() => {});
      this.thumbnails.set(key, pending);
      void pending.catch(() => this.thumbnails.delete(key));
    }
    return pending;
  }
  private async renderThumbnail(document: ImportDocument, page: ImportPage) {
    this.ensureDocument(document.id);
    const canvas = window.document.createElement('canvas');
    if (document.mimeType === 'application/pdf') {
      let entry = this.pdfs.get(document.id);
      if (!entry) {
        const [engine, worker] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        engine.GlobalWorkerOptions.workerSrc = worker.default;
        const bytes = new Uint8Array(await (await this.blob(document)).arrayBuffer());
        this.ensureOpen();
        const task = engine.getDocument({ data: bytes });
        const pdf = await task.promise;
        if (this.controller.signal.aborted || (this.retained && !this.retained.has(document.id))) {
          await task.destroy();
          throw new Error('Anteprima chiusa.');
        }
        entry = { task, pdf };
        this.pdfs.set(document.id, entry);
        if (this.pdfs.size > 2) {
          const [id, old] = this.pdfs.entries().next().value!;
          this.pdfs.delete(id);
          void old.task.destroy().catch(() => {});
        }
      }
      const source = await entry.pdf.getPage(page.sourcePageNumber);
      const natural = source.getViewport({ scale: 1 });
      const viewport = source.getViewport({
        scale: Math.min(180 / natural.width, 240 / natural.height),
      });
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Anteprima non disponibile.');
      await source.render({ canvas, canvasContext: context, viewport }).promise;
      source.cleanup();
    } else {
      const bitmap = await createImageBitmap(await this.blob(document));
      try {
        const scale = Math.min(180 / bitmap.width, 240 / bitmap.height, 1);
        canvas.width = Math.max(1, Math.ceil(bitmap.width * scale));
        canvas.height = Math.max(1, Math.ceil(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Anteprima non disponibile.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } finally {
        bitmap.close();
      }
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Anteprima non disponibile.'))),
        'image/jpeg',
        0.8,
      ),
    );
    this.ensureDocument(document.id);
    const url = URL.createObjectURL(blob);
    this.urls.set(`thumb:${document.id}:${page.sourcePageNumber}`, url);
    canvas.width = 0;
    canvas.height = 0;
    return url;
  }
  clear() {
    this.controller.abort();
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    for (const entry of this.pdfs.values()) void entry.task.destroy().catch(() => {});
    this.urls.clear();
    this.blobs.clear();
    this.thumbnails.clear();
    this.pdfs.clear();
  }
}
