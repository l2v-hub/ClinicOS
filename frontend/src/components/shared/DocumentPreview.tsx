import { useEffect, useRef, useState } from 'react';

// Document preview workspace panel (REQ-032). Dependency-free: images use CSS transforms
// (zoom/rotate/drag); PDFs use the browser's native viewer via an <iframe> + #page/zoom
// fragment; an OCR text mode shows the recognised text. Rotating the preview never alters
// the original file. State (file index, page, zoom, rotation, mode) is kept across renders.

export interface PreviewDoc {
  name: string;
  type: string; // mime type
  url: string; // object URL of the uploaded file
}

interface Props {
  documents: PreviewDoc[];
  ocrText?: string;
  /** Controlled jump target (REQ-032 §6 "Vai alla fonte"): {fileName, page}. */
  sourceTarget?: { fileName?: string; page?: number } | null;
}

type Mode = 'document' | 'ocr';

export function DocumentPreview({ documents, ocrText = '', sourceTarget }: Props) {
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<Mode>('document');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [ocrQuery, setOcrQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const doc = documents[idx];
  const isPdf =
    !!doc && (doc.type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf'));
  const isImage = !!doc && doc.type.startsWith('image/');

  // Source link: switch to the named file + page (REQ-032 §6).
  useEffect(() => {
    if (!sourceTarget?.fileName) return;
    const found = documents.findIndex((d) => d.name === sourceTarget.fileName);
    if (found >= 0) {
      setIdx(found);
      setMode('document');
    }
    if (sourceTarget.page) setPage(sourceTarget.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTarget]);

  // Reset view when the file changes.
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPage(1);
    setPan({ x: 0, y: 0 });
  }, [idx]);

  if (documents.length === 0) {
    return (
      <div className="doc-preview doc-preview--empty">
        <p>Nessun documento da visualizzare.</p>
      </div>
    );
  }

  const zoomIn = () => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const rotate = () => setRotation((r) => (r + 90) % 360);
  const fit = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };
  const fullscreen = () => {
    containerRef.current?.requestFullscreen?.().catch(() => {});
  };
  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(documents.length - 1, i + 1));

  function onPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  const kind = isPdf ? 'PDF' : isImage ? 'Immagine' : 'Documento';

  return (
    <div className="doc-preview" ref={containerRef} data-testid="document-preview">
      <div className="doc-preview__toolbar">
        <div className="doc-preview__nav">
          <button
            className="icon-btn"
            disabled={idx === 0}
            onClick={prev}
            aria-label="Documento precedente"
            title="Precedente"
          >
            ←
          </button>
          <span className="doc-preview__counter" title={doc?.name}>
            {kind} {idx + 1} di {documents.length}
          </span>
          <button
            className="icon-btn"
            disabled={idx === documents.length - 1}
            onClick={next}
            aria-label="Documento successivo"
            title="Successivo"
          >
            →
          </button>
        </div>
        <div className="doc-preview__modes">
          <button
            className={`srev-chip${mode === 'document' ? ' is-on' : ''}`}
            onClick={() => setMode('document')}
          >
            Documento originale
          </button>
          <button
            className={`srev-chip${mode === 'ocr' ? ' is-on' : ''}`}
            onClick={() => setMode('ocr')}
          >
            Testo riconosciuto
          </button>
        </div>
        {mode === 'document' && (
          <div className="doc-preview__zoom">
            {isPdf && (
              <>
                <button
                  className="icon-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Pagina precedente"
                  title="Pagina precedente"
                >
                  ‹
                </button>
                <span className="doc-preview__page">Pag. {page}</span>
                <button
                  className="icon-btn"
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Pagina successiva"
                  title="Pagina successiva"
                >
                  ›
                </button>
              </>
            )}
            <button className="icon-btn" onClick={zoomOut} aria-label="Riduci zoom" title="Zoom −">
              −
            </button>
            <span className="doc-preview__zoomval">{Math.round(zoom * 100)}%</span>
            <button className="icon-btn" onClick={zoomIn} aria-label="Aumenta zoom" title="Zoom +">
              +
            </button>
            <button className="srev-chip" onClick={fit} title="Adatta">
              Adatta
            </button>
            {isImage && (
              <button className="srev-chip" onClick={rotate} title="Ruota 90°">
                Ruota
              </button>
            )}
            <button className="srev-chip" onClick={fullscreen} title="Schermo intero">
              ⛶
            </button>
          </div>
        )}
        {mode === 'ocr' && (
          <div className="doc-preview__ocrtools">
            <input
              className="doc-preview__search"
              placeholder="Cerca nel testo…"
              value={ocrQuery}
              onChange={(e) => setOcrQuery(e.target.value)}
            />
            <button
              className="srev-chip"
              onClick={() => navigator.clipboard?.writeText(ocrText)}
              title="Copia testo"
            >
              Copia
            </button>
          </div>
        )}
      </div>

      <div
        className="doc-preview__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: mode === 'document' && isImage && zoom > 1 ? 'grab' : 'default' }}
      >
        {mode === 'ocr' ? (
          <OcrText
            text={ocrText}
            query={ocrQuery}
            fileName={doc?.name}
            page={isPdf ? page : undefined}
          />
        ) : isPdf ? (
          <iframe
            key={`${doc.url}-${page}`}
            className="doc-preview__pdf"
            title={doc.name}
            src={`${doc.url}#page=${page}&zoom=${Math.round(zoom * 100)}`}
          />
        ) : isImage ? (
          <img
            className="doc-preview__img"
            src={doc.url}
            alt={doc.name}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <div className="doc-preview__unsupported">
            <p>{doc.name}</p>
            <a className="srev-chip" href={doc.url} target="_blank" rel="noreferrer">
              Apri documento
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function OcrText({
  text,
  query,
  fileName,
  page,
}: {
  text: string;
  query: string;
  fileName?: string;
  page?: number;
}) {
  if (!text.trim())
    return (
      <div className="doc-preview__ocr">
        <p className="cr-empty">Testo riconosciuto non disponibile.</p>
      </div>
    );
  // Split on [ILLEGGIBILE]-style markers and on the search query, never altering the text.
  const ILLEG = /(\[(?:ILLEGG?IBILE|ILLEGIBLE)\])/gi;
  const parts: { t: string; ill?: boolean; hit?: boolean }[] = [];
  for (const seg of text.split(ILLEG)) {
    if (!seg) continue;
    if (ILLEG.test(seg)) {
      parts.push({ t: seg, ill: true });
      ILLEG.lastIndex = 0;
      continue;
    }
    if (query && query.length >= 2) {
      const q = query.toLowerCase();
      let rest = seg;
      while (rest) {
        const i = rest.toLowerCase().indexOf(q);
        if (i < 0) {
          parts.push({ t: rest });
          break;
        }
        if (i > 0) parts.push({ t: rest.slice(0, i) });
        parts.push({ t: rest.slice(i, i + q.length), hit: true });
        rest = rest.slice(i + q.length);
      }
    } else parts.push({ t: seg });
  }
  return (
    <div className="doc-preview__ocr">
      {(fileName || page) && (
        <p className="doc-preview__ocrsrc">
          Fonte: {fileName}
          {page ? ` — pagina ${page}` : ''}
        </p>
      )}
      <pre className="doc-preview__ocrtext">
        {parts.map((p, i) =>
          p.ill ? (
            <mark key={i} className="stt-illegible">
              {p.t}
            </mark>
          ) : p.hit ? (
            <mark key={i} className="ocr-hit">
              {p.t}
            </mark>
          ) : (
            <span key={i}>{p.t}</span>
          ),
        )}
      </pre>
    </div>
  );
}
