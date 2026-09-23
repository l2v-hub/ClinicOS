import './PdfCanvasPreview.css';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/** Render original PDF bytes without depending on a browser PDF plugin. */
export function PdfCanvasPreview({
  file,
  name,
  pageNumber,
}: {
  file: Blob;
  name: string;
  pageNumber?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(640);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [text, setText] = useState('');

  useEffect(() => {
    let active = true;
    let loading: PDFDocumentLoadingTask | undefined;
    // The PDF.js document lifecycle replaces its prior render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPdf(null);
    setPage(1);
    setStatus('loading');
    setText('');
    void (async () => {
      const engine = await import('pdfjs-dist');
      if (!active) return;
      engine.GlobalWorkerOptions.workerSrc = workerUrl;
      const data = new Uint8Array(await file.arrayBuffer());
      if (!active) return;
      loading = engine.getDocument({ data });
      const document = await loading.promise;
      if (active) setPdf(document);
    })().catch(() => {
      if (active) setStatus('error');
    });
    return () => {
      active = false;
      void loading?.destroy().catch(() => {});
    };
  }, [file, revision]);

  const displayedPage = pageNumber ?? page;

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.observe(node);
    setWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let rendering: RenderTask | undefined;
    // A new PDF.js render must clear the previous page's accessible text.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading');
    setText('');
    void (async () => {
      const source = await pdf.getPage(displayedPage);
      if (!active || !canvas.current) return;
      const natural = source.getViewport({ scale: 1 });
      const fit = Math.max(200, width - 32) / natural.width;
      const scale = Math.min(
        fit * zoom * Math.min(window.devicePixelRatio || 1, 2),
        Math.sqrt(12_000_000 / (natural.width * natural.height)),
        16_000 / natural.width,
        16_000 / natural.height,
      );
      const viewport = source.getViewport({ scale });
      const target = canvas.current;
      target.width = Math.ceil(viewport.width);
      target.height = Math.ceil(viewport.height);
      target.style.width = `${Math.ceil(natural.width * fit * zoom)}px`;
      target.style.height = `${Math.ceil(natural.height * fit * zoom)}px`;
      const context = target.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      rendering = source.render({ canvas: target, canvasContext: context, viewport });
      await rendering.promise;
      if (!active) return;
      setStatus('ready');
      const content = await source.getTextContent();
      if (active)
        setText(
          content.items
            .flatMap((item) => ('str' in item ? [item.str] : []))
            .join(' ')
            .slice(0, 20_000),
        );
    })().catch(() => {
      if (active) setStatus('error');
    });
    return () => {
      active = false;
      rendering?.cancel();
    };
  }, [pdf, displayedPage, zoom, width]);

  return (
    <div className="document-pdf-preview">
      <div className="document-pdf-preview__toolbar" aria-label="Controlli PDF">
        <button
          type="button"
          className="btn-secondary btn-sm"
          aria-label="Pagina precedente"
          disabled={pageNumber !== undefined || !pdf || page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          ‹
        </button>
        <span>
          Pagina {displayedPage} di {pdf?.numPages ?? '…'}
        </span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          aria-label="Pagina successiva"
          disabled={pageNumber !== undefined || !pdf || page >= pdf.numPages}
          onClick={() => setPage((value) => value + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          aria-label="Riduci zoom"
          disabled={zoom <= 0.5}
          onClick={() => setZoom((value) => value - 0.25)}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          aria-label="Aumenta zoom"
          disabled={zoom >= 2}
          onClick={() => setZoom((value) => value + 0.25)}
        >
          +
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setZoom(1)}>
          Adatta
        </button>
      </div>
      <div ref={stage} className="document-pdf-preview__stage" aria-busy={status === 'loading'}>
        {status === 'loading' && <p role="status">Preparazione anteprima PDF…</p>}
        {status === 'error' && (
          <div role="alert">
            <p>Impossibile mostrare l’anteprima PDF. Puoi scaricare l’originale.</p>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setRevision((value) => value + 1)}
            >
              Riprova PDF
            </button>
          </div>
        )}
        <canvas
          ref={canvas}
          data-ready={status === 'ready'}
          aria-hidden={status !== 'ready'}
          role="img"
          aria-label={`${name} · pagina ${displayedPage}`}
        />
        {text && <p className="document-pdf-preview__accessible">{text}</p>}
      </div>
    </div>
  );
}
