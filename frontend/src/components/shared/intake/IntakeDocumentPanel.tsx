// Documento a fianco della scheda d'ingresso (HMI 1, ciclo 3a, artifacts/hmi-parity/proto/ingresso-docs.png):
// "Lettera N · p. M" con chiusura, una scheda per pagina con lo stato della lettura e la pagina scelta.
// Terza colonna da 1180px; sotto è un pannello sovrapposto a tutta larghezza.
// Privacy: le pagine si scaricano solo con fetch e le intestazioni dell'operatore (ImportSourceCache),
// in blob tenuti in memoria; la cache si svuota (blob URL revocati) quando il pannello si chiude,
// quando i documenti si scollegano (il pannello sparisce) e all'uscita dalla scheda.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { IcoCheck, IcoWarning, IcoX } from '../../../icons';
import type { ImportSessionApi } from '../import/importSessionApi';
import type { ImportJob } from '../import/importSessionTypes';
import { ImportSourceCache } from '../import/importSourceCache';
import { ImportPageContent } from '../import/ImportPageView';
import {
  initialTab,
  keepTab,
  pageErrorMessage,
  pageErrorRetryable,
  pageTabs,
  panelTitle,
  tabKeyTarget,
  type PanelTarget,
} from './intakeDocumentPages';

/** Larghezza da cui il pannello è una terza colonna della scheda (come il prototipo). */
export const DOCUMENT_PANEL_COLUMN_QUERY = '(min-width: 1180px)';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DocumentPanelRequest {
  target: PanelTarget | null;
  /** Cresce a ogni apertura: un nuovo chip riporta il pannello sulla sua pagina. */
  seq: number;
}

export function IntakeDocumentPanel({
  job,
  api,
  request,
  onClose,
}: {
  job: ImportJob;
  api: ImportSessionApi;
  request: DocumentPanelRequest;
  onClose: () => void;
}) {
  const column = useMediaQuery(DOCUMENT_PANEL_COLUMN_QUERY);
  const root = useRef<HTMLElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Una sola cache per job, solo finché il pannello è aperto.
  const jobId = job.id;
  const maxFileBytes = job.limits.maxFileBytes;
  const [cacheEntry, setCacheEntry] = useState<{
    key: string;
    value: ImportSourceCache;
  } | null>(null);
  const cacheKey = `${jobId}:${maxFileBytes}`;
  const cache = cacheEntry?.key === cacheKey ? cacheEntry.value : null;
  useEffect(() => {
    const value = new ImportSourceCache(api.request, `${api.base}/${jobId}`, maxFileBytes);
    // La cache (byte e blob URL) vive esattamente quanto il pannello per questo job.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCacheEntry({ key: `${jobId}:${maxFileBytes}`, value });
    return () => value.clear();
  }, [api, jobId, maxFileBytes]);
  useEffect(() => {
    cache?.retain(job.documents);
  }, [cache, job.documents]);

  const tabs = pageTabs(job);
  const [selection, setSelection] = useState(() => ({
    seq: request.seq,
    pageId: initialTab(tabs, request.target),
  }));
  // Un nuovo chip (o "Vedi documenti") mentre il pannello è aperto: si torna sulla sua pagina.
  const fresh = selection.seq === request.seq;
  const wanted = fresh ? selection.pageId : initialTab(tabs, request.target);
  if (!fresh) setSelection({ seq: request.seq, pageId: wanted });
  const selectedId = keepTab(tabs, wanted);
  const index = tabs.findIndex((t) => t.pageId === selectedId);
  const current = index >= 0 ? tabs[index] : undefined;
  const title = panelTitle(current);

  // Documento e pagina stabili fra un'interrogazione e l'altra: la pagina non si riscarica né lampeggia.
  const found = current ? job.documents.find((d) => d.id === current.documentId) : undefined;
  const docKey = found ? `${found.id}|${found.mimeType}|${found.filename}` : '';
  const sourceDoc = useMemo(
    () => found,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docKey],
  );
  const foundPage = current ? job.manifest.pages.find((p) => p.id === current.pageId) : undefined;
  const pageKey = foundPage
    ? `${foundPage.id}|${foundPage.documentId}|${foundPage.sourcePageNumber}`
    : '';
  const page = useMemo(
    () => foundPage,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageKey],
  );

  // All'apertura (e a ogni nuovo chip) il focus va sulla scheda della pagina mostrata.
  useEffect(() => {
    const tab = selectedId ? tabRefs.current.get(selectedId) : null;
    (tab ?? root.current?.querySelector<HTMLElement>('[data-doc-panel-close]'))?.focus();
    // solo all'apertura: le schede successive prendono il focus con le frecce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.seq]);

  // Esc chiude il pannello, non la scheda: col focus nel pannello, nella scheda o perso sul body.
  // Con un'altra finestra sopra (es. la conferma di scollegamento) Esc resta a quella finestra.
  useEffect(() => {
    const DIALOGS = '[role="dialog"], [role="alertdialog"]';
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const panel = root.current;
      if (event.key !== 'Escape' || !panel) return;
      const target = event.target instanceof Node ? event.target : null;
      const scheda = panel.parentElement?.closest(DIALOGS) ?? null;
      const where = target instanceof Element ? target.closest(DIALOGS) : null;
      const inPanel = !!target && panel.contains(target);
      const inScheda = !!scheda && where === scheda;
      const lost =
        (target === document.body || target === document.documentElement) &&
        Array.from(document.querySelectorAll(DIALOGS)).every((d) => d === scheda || d === panel);
      if (!inPanel && !inScheda && !lost) return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  function select(pageId: string, focus = false) {
    setSelection({ seq: request.seq, pageId });
    if (focus) tabRefs.current.get(pageId)?.focus();
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, at: number) {
    const next = tabKeyTarget(event.key, at, tabs.length);
    if (next === null) return;
    event.preventDefault();
    select(tabs[next].pageId, true);
  }

  // Sovrapposto: il Tab resta nel pannello (il resto della scheda è coperto).
  function onPanelKey(event: KeyboardEvent<HTMLElement>) {
    if (column || event.key !== 'Tab' || !root.current) return;
    const items = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.getClientRects().length > 0,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const tabId = (pageId: string) => `intake-doc-tab-${pageId}`;
  const bodyId = 'intake-doc-panel-page';
  return (
    <aside
      ref={root}
      className={`intake-doc-panel${column ? '' : ' intake-doc-panel--overlay'}`}
      data-testid="intake-document-panel"
      data-layout={column ? 'column' : 'overlay'}
      role={column ? 'complementary' : 'dialog'}
      aria-modal={column ? undefined : true}
      aria-labelledby="intake-doc-panel-title"
      tabIndex={-1}
      onKeyDown={onPanelKey}
    >
      <header className="intake-doc-panel__head">
        <h3
          id="intake-doc-panel-title"
          className="intake-doc-panel__title"
          data-testid="intake-document-panel-title"
        >
          {title}
        </h3>
        <button
          type="button"
          className="ds-icon-btn"
          aria-label="Chiudi il documento"
          data-testid="intake-document-panel-close"
          data-doc-panel-close
          onClick={onClose}
        >
          <IcoX />
        </button>
      </header>
      {tabs.length > 0 ? (
        <div
          className="ds-chip-group intake-doc-panel__tabs"
          role="tablist"
          aria-label="Pagine dei documenti"
          data-testid="intake-document-panel-tabs"
        >
          {tabs.map((tab, at) => {
            const selected = tab.pageId === selectedId;
            return (
              <button
                key={tab.pageId}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.pageId, node);
                  else tabRefs.current.delete(tab.pageId);
                }}
                type="button"
                role="tab"
                id={tabId(tab.pageId)}
                className="ds-chip intake-doc-panel__tab"
                aria-selected={selected}
                aria-controls={bodyId}
                aria-label={`Lettera ${tab.letter}, pagina ${tab.number}, ${tab.stateText}`}
                tabIndex={selected ? 0 : -1}
                data-testid={`intake-document-tab-${tab.label}`}
                data-state={tab.state}
                onClick={() => select(tab.pageId)}
                onKeyDown={(event) => onTabKey(event, at)}
              >
                {tab.state !== 'waiting' && (
                  <span className="intake-doc-panel__state" aria-hidden="true">
                    {tab.state === 'done' ? (
                      <IcoCheck />
                    ) : tab.state === 'error' ? (
                      <IcoWarning />
                    ) : (
                      <span className="import-modal__spinner" />
                    )}
                  </span>
                )}
                <span aria-hidden="true">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        id={bodyId}
        className="intake-doc-panel__body"
        role={current ? 'tabpanel' : undefined}
        aria-labelledby={current ? tabId(current.pageId) : undefined}
        tabIndex={current ? 0 : undefined}
        data-testid="intake-document-panel-page"
      >
        {!current ? (
          <p className="intake-doc-panel__note">Nessuna pagina caricata.</p>
        ) : !sourceDoc || !page ? (
          <p className="intake-doc-panel__note" role="status">
            Pagina non ancora disponibile: il caricamento è in corso.
          </p>
        ) : !cache ? (
          <p className="intake-doc-panel__note" role="status">
            Caricamento della pagina…
          </p>
        ) : (
          <ImportPageContent
            key={page.id}
            document={sourceDoc}
            page={page}
            cache={cache}
            errorMessage={pageErrorMessage}
            canRetry={pageErrorRetryable}
          />
        )}
      </div>
    </aside>
  );
}
