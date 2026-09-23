import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { AccessibleDialogSurface } from '../AccessibleDialogSurface';
import type { ImportDocument, ImportPage } from './importSessionTypes';
import type { ImportSourceCache } from './importSourceCache';
const PdfCanvasPreview = lazy(() =>
  import('../PdfCanvasPreview').then((module) => ({ default: module.PdfCanvasPreview })),
);

export function ImportThumbnail({
  document,
  page,
  cache,
}: {
  document: ImportDocument;
  page: ImportPage;
  cache: ImportSourceCache;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const target = node.current;
    if (!target) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    // A different immutable source resets this external preview lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl('');
    setFailed(false);
    void cache
      .thumbnail(document, page)
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [cache, document, page, visible]);
  return (
    <div className="import-page__thumbnail" ref={node}>
      {url ? <img src={url} alt="" /> : <span>{failed ? 'Apri anteprima' : 'Anteprima…'}</span>}
    </div>
  );
}

export function ImportPageContent({
  document,
  page,
  cache,
}: {
  document: ImportDocument;
  page: ImportPage;
  cache: ImportSourceCache;
}) {
  const [data, setData] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    // Reset old source bytes before fetching the selected authenticated original.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError('');
    void Promise.all([cache.blob(document), cache.url(document)])
      .then(([blob, url]) => {
        if (active) setData({ blob, url });
      })
      .catch(() => {
        if (active)
          setError('Impossibile caricare l’originale. Le pagine salvate sono conservate.');
      });
    return () => {
      active = false;
    };
  }, [cache, document, attempt]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => setAttempt((n) => n + 1)}>
          Riprova anteprima
        </button>
      </div>
    );
  if (!data) return <p role="status">Caricamento originale…</p>;
  return (
    <div className="import-page-preview">
      {document.mimeType === 'application/pdf' ? (
        <Suspense fallback={<p role="status">Preparazione PDF…</p>}>
          <PdfCanvasPreview
            file={data.blob}
            name={document.filename}
            pageNumber={page.sourcePageNumber}
          />
        </Suspense>
      ) : (
        <img
          src={data.url}
          alt={`Pagina ${page.sourcePageNumber} del documento ${document.filename}`}
        />
      )}
      <a className="btn-secondary" href={data.url} download={document.filename}>
        Scarica originale
      </a>
    </div>
  );
}

export function ImportPagePreview({
  document,
  page,
  cache,
  onClose,
  onRetake,
}: {
  document: ImportDocument;
  page: ImportPage;
  cache: ImportSourceCache;
  onClose(): void;
  onRetake?(): void;
}) {
  const title = useId();
  return (
    <AccessibleDialogSurface
      labelledBy={title}
      onClose={onClose}
      surfaceClassName="modal-card import-page-dialog"
    >
      <header className="import-modal__head">
        <h3 id={title}>Anteprima · pagina {page.sortOrder + 1}</h3>
        <button
          className="icon-btn"
          aria-label="Chiudi anteprima"
          onClick={onClose}
          data-dialog-initial-focus
        >
          ×
        </button>
      </header>
      <ImportPageContent document={document} page={page} cache={cache} />
      <footer className="import-modal__foot">
        {onRetake && (
          <button className="btn-secondary" onClick={onRetake}>
            Ripeti scansione
          </button>
        )}
        <button className="btn-primary" onClick={onClose}>
          Chiudi anteprima
        </button>
      </footer>
    </AccessibleDialogSurface>
  );
}
