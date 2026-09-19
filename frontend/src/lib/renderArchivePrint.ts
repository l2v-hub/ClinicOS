import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RenderedPrintPage } from './archivePrint';

function canvasSize(width: number, height: number, scale = 1) {
  if (![width, height].every((size) => Number.isFinite(size) && size > 0))
    throw new Error('Dimensioni del documento non valide.');
  const fit = Math.min(scale, Math.sqrt(2_200_000 / (width * height)), 4096 / width, 4096 / height);
  return { width: Math.max(1, Math.floor(width * fit)), height: Math.max(1, Math.floor(height * fit)), scale: fit };
}

async function pageBlob(canvas: HTMLCanvasElement, signal: AbortSignal): Promise<RenderedPrintPage> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  signal.throwIfAborted();
  if (!blob) throw new Error('Impossibile preparare la pagina.');
  return { blob, width: canvas.width, height: canvas.height };
}

export async function* renderArchivePrint(
  blob: Blob, signal: AbortSignal, remainingPages: number,
): AsyncGenerator<RenderedPrintPage> {
  signal.throwIfAborted();
  if (remainingPages < 1) throw new Error('Massimo 40 pagine per ogni stampa.');
  if (blob.type.split(';')[0].trim().toLowerCase() === 'application/pdf') {
    const engine = await import('pdfjs-dist');
    signal.throwIfAborted();
    engine.GlobalWorkerOptions.workerSrc = workerUrl;
    const data = new Uint8Array(await blob.arrayBuffer());
    signal.throwIfAborted();
    const loading = engine.getDocument({ data, stopAtErrors: true });
    const abort = () => { void loading.destroy().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      const pdf = await loading.promise;
      signal.throwIfAborted();
      if (pdf.numPages > remainingPages) throw new Error('Massimo 40 pagine per ogni stampa.');
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        signal.throwIfAborted();
        const natural = page.getViewport({ scale: 1 });
        const size = canvasSize(natural.width, natural.height, 150 / 72);
        const canvas = document.createElement('canvas');
        canvas.width = size.width; canvas.height = size.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Stampa non disponibile nel browser.');
        const render = page.render({ canvas, canvasContext: context,
          viewport: page.getViewport({ scale: size.scale }), intent: 'print', background: '#ffffff' });
        const cancelRender = () => render.cancel();
        signal.addEventListener('abort', cancelRender, { once: true });
        try {
          await render.promise;
          signal.throwIfAborted();
          yield await pageBlob(canvas, signal);
        } finally {
          signal.removeEventListener('abort', cancelRender);
          canvas.width = 0; canvas.height = 0;
          page.cleanup();
        }
      }
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof Error && error.message.includes('40 pagine')) throw error;
      throw new Error('PDF non leggibile o protetto da password.');
    } finally {
      signal.removeEventListener('abort', abort);
      await loading.destroy().catch(() => {});
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  const abort = () => { image.src = ''; };
  signal.addEventListener('abort', abort, { once: true });
  const canvas = document.createElement('canvas');
  try {
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const size = canvasSize(image.naturalWidth, image.naturalHeight);
    canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Stampa non disponibile nel browser.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    yield await pageBlob(canvas, signal);
  } catch {
    signal.throwIfAborted();
    throw new Error('Immagine non leggibile.');
  } finally {
    signal.removeEventListener('abort', abort);
    image.src = ''; URL.revokeObjectURL(url);
    canvas.width = 0; canvas.height = 0;
  }
}
