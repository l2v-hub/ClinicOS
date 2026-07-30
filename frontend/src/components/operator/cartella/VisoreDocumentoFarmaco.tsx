// Visore del documento ufficiale AIFA dentro ClinicOS.
//
// PERCHE' NON UN LINK. AIFA serve il PDF con `content-disposition: attachment`,
// `content-type: application/octet-stream` e `x-content-type-options: nosniff`: quei tre header
// insieme impongono il download in ogni browser, e nessun `target="_blank"` lo evita. Scaricando
// il documento come blob e rendendolo qui, l'intestazione di AIFA diventa irrilevante — non e'
// piu' il browser a seguire il link.
//
// PERCHE' UN SELETTORE DI FORMULAZIONE. Il link e' per AIC6, che identifica il farmaco: un solo
// PDF contiene gli RCP di tutte le sue confezioni. L'RCP della Tachipirina ne contiene sei, con
// posologie inconciliabili fra loro. Evidenziare il blocco sbagliato indicherebbe all'operatore
// un dosaggio errato, percio' quando l'abbinamento e' incerto qui non si evidenzia nulla e si
// chiede di scegliere.
//
// pdf.js e' caricato con `import()` dinamico: chi non apre un documento non lo scarica mai.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IcoX } from '../../../icons';
import './VisoreDocumentoFarmaco.css';
import {
  dividiInBlocchi,
  raggruppaInRighe,
  scegliBlocco,
  type BloccoRcp,
  type FrammentoTesto,
} from './rcpStruttura';
import { etichettaDocumento, type DocumentoFarmaco } from './farmacoDocumento';
import type { PrescrizioneDaAbbinare } from './farmacoCorrispondenza';

/** Scala di rendering: leggibile su tablet senza produrre canvas ingestibili. */
const SCALA = 1.4;

/** Riferimento stabile per le pagine senza evidenziazioni: un `[]` nuovo rilancerebbe l'effetto. */
const NESSUNA_EVIDENZA: RettangoloEvidenziato[] = [];

/** Altezza minima di un'evidenziazione, in pixel di viewport. */
const ALTEZZA_MINIMA_EVIDENZA = 6;

interface RettangoloEvidenziato {
  pagina: number;
  sinistra: number;
  alto: number;
  larghezza: number;
  altezza: number;
  numero: string;
}

interface Documento {
  /** Istanza PDFDocumentProxy di pdf.js. Tipizzata larga per non dipendere dai suoi tipi. */
  pdf: { numPages: number; getPage: (n: number) => Promise<PaginaPdf> };
  frammenti: FrammentoTesto[];
  blocchi: BloccoRcp[];
}

interface PaginaPdf {
  getViewport: (opts: { scale: number }) => Viewport;
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: Viewport }) => {
    promise: Promise<void>;
  };
}

interface Viewport {
  width: number;
  height: number;
  /** pdf.js 6 espone solo la conversione per punti: `convertToViewportRectangle` non esiste piu'. */
  convertToViewportPoint: (x: number, y: number) => number[];
}

type Stato =
  | { fase: 'carico' }
  | { fase: 'pronto'; documento: Documento }
  | { fase: 'errore'; fonteIrraggiungibile: boolean; messaggio: string };

interface Props {
  documento: DocumentoFarmaco;
  /** Dosaggio e forma della prescrizione: servono a riconoscere la formulazione nel documento. */
  prescrizione: PrescrizioneDaAbbinare;
  onChiudi: () => void;
}

export function VisoreDocumentoFarmaco({ documento, prescrizione, onChiudi }: Props) {
  const [stato, setStato] = useState<Stato>({ fase: 'carico' });
  const [bloccoScelto, setBloccoScelto] = useState<number | null>(null);
  /** true quando la formulazione l'ha scelta l'operatore, non l'abbinamento automatico. */
  const [scegliaOperatore, setScegliaOperatore] = useState(false);
  const contenitore = useRef<HTMLDivElement | null>(null);

  // ── Caricamento e analisi ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let annullato = false;

    async function carica() {
      try {
        // Import dinamico: pdf.js resta fuori dal bundle iniziale.
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const risposta = await fetch(documento.href);
        if (!risposta.ok) {
          throw Object.assign(new Error(`AIFA ha risposto ${risposta.status}`), { fonte: true });
        }
        const dati = new Uint8Array(await risposta.arrayBuffer());
        if (annullato) return;

        const pdf = await pdfjs.getDocument({ data: dati }).promise;
        const frammenti: FrammentoTesto[] = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const contenuto = await (await pdf.getPage(p)).getTextContent();
          for (const item of contenuto.items) {
            if (!('str' in item) || !item.str.trim()) continue;
            frammenti.push({
              pagina: p,
              x: item.transform[4],
              y: item.transform[5],
              larghezza: item.width,
              altezza: item.height,
              testo: item.str,
            });
          }
        }
        if (annullato) return;

        const blocchi = dividiInBlocchi(raggruppaInRighe(frammenti));
        setStato({
          fase: 'pronto',
          documento: { pdf: pdf as unknown as Documento['pdf'], frammenti, blocchi },
        });
        setBloccoScelto(scegliBlocco(blocchi, prescrizione));
      } catch (errore) {
        if (annullato) return;
        const fonte = (errore as { fonte?: boolean }).fonte === true || errore instanceof TypeError;
        setStato({
          fase: 'errore',
          // Un TypeError da `fetch` e' rete o CORS: la fonte, non il documento.
          fonteIrraggiungibile: fonte,
          messaggio: errore instanceof Error ? errore.message : 'errore sconosciuto',
        });
      }
    }

    void carica();
    return () => {
      annullato = true;
    };
  }, [documento.href, prescrizione]);

  useEffect(() => {
    function chiudiConEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onChiudi();
    }
    window.addEventListener('keydown', chiudiConEsc);
    return () => window.removeEventListener('keydown', chiudiConEsc);
  }, [onChiudi]);

  // ── Pagine da mostrare e rettangoli da evidenziare ───────────────────────────────────────

  const pronto = stato.fase === 'pronto' ? stato.documento : null;
  const blocco = pronto && bloccoScelto !== null ? pronto.blocchi[bloccoScelto] : null;

  /** Pagine del blocco scelto: dalla sua apertura fino a quella del blocco successivo. */
  const pagine = useMemo(() => {
    if (!pronto) return [];
    if (!blocco) return Array.from({ length: pronto.pdf.numPages }, (_, i) => i + 1);
    const successivo = pronto.blocchi[(bloccoScelto ?? 0) + 1];
    const ultima = successivo ? successivo.paginaIniziale : pronto.pdf.numPages;
    const elenco: number[] = [];
    for (let p = blocco.paginaIniziale; p <= ultima; p++) elenco.push(p);
    return elenco;
  }, [pronto, blocco, bloccoScelto]);

  /**
   * Rettangoli da evidenziare, raggruppati per pagina e **memoizzati**.
   *
   * La memoizzazione non e' un'ottimizzazione: senza di essa ogni render creava un nuovo array
   * per ogni pagina, l'effetto di rendering si rilanciava, e la sua funzione di pulizia
   * annullava la trasformazione delle coordinate prima che finisse. Risultato osservato in
   * Playwright: sezioni individuate correttamente, zero rettangoli disegnati.
   */
  const evidenzePerPagina = useMemo(() => {
    const mappa = new Map<number, RettangoloEvidenziato[]>();
    if (!pronto || !blocco) return mappa;
    for (const sezione of blocco.sezioni) {
      for (const indice of sezione.frammenti) {
        const f = pronto.frammenti[indice];
        if (!f) continue;
        const perPagina = mappa.get(f.pagina) ?? [];
        perPagina.push({ ...rettangoloDi(f), numero: sezione.numero });
        mappa.set(f.pagina, perPagina);
      }
    }
    return mappa;
  }, [pronto, blocco]);

  const primaSezione = blocco?.sezioni[0];

  // Salta alla prima sezione evidenziata, non all'inizio del documento: e' il motivo per cui
  // l'operatore lo ha aperto.
  const vaiAllaSezione = useCallback((pagina: number) => {
    const nodo = contenitore.current?.querySelector(`[data-pagina="${pagina}"]`);
    nodo?.scrollIntoView({ block: 'start' });
  }, []);

  useEffect(() => {
    if (primaSezione) vaiAllaSezione(primaSezione.pagina);
  }, [primaSezione, vaiAllaSezione]);

  // ── Interfaccia ──────────────────────────────────────────────────────────────────────────

  const etichetta = etichettaDocumento(documento).replace(' (si apre in una nuova scheda)', '');

  // Portal su `document.body`. Il visore e' montato dentro la scheda terapia, che vive in un
  // contesto di impilamento locale: il suo `z-index: 1000` valeva solo dentro quel contesto, e
  // la barra di navigazione L2 finiva sopra il visore intercettandone i clic. Verificato in
  // Playwright, dove il pulsante di chiusura risultava visibile ma non cliccabile.
  return createPortal(
    <div className="modal-overlay" onClick={onChiudi}>
      <div
        className="modal-box visore-farmaco"
        role="dialog"
        aria-modal="true"
        aria-label={etichetta}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="visore-farmaco__testa">
          <div>
            <h2 className="visore-farmaco__titolo">{etichetta}</h2>
            {pronto && (
              <FormulazioneScelta
                blocchi={pronto.blocchi}
                scelto={bloccoScelto}
                daOperatore={scegliaOperatore}
                onScegli={(i) => {
                  setBloccoScelto(i);
                  setScegliaOperatore(true);
                }}
              />
            )}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onChiudi}
            aria-label="Chiudi il documento"
          >
            <IcoX />
          </button>
        </header>

        {blocco && blocco.sezioni.length > 0 && (
          <nav className="visore-farmaco__sezioni" aria-label="Sezioni evidenziate">
            <span className="visore-farmaco__sezioni-etichetta">Evidenziate:</span>
            {blocco.sezioni.map((s) => (
              <button
                key={s.numero}
                type="button"
                className="visore-farmaco__salto"
                onClick={() => vaiAllaSezione(s.pagina)}
              >
                {s.numero} {s.titolo}
              </button>
            ))}
          </nav>
        )}

        <div className="visore-farmaco__corpo" ref={contenitore}>
          {stato.fase === 'carico' && (
            <p className="visore-farmaco__stato">Caricamento del documento ufficiale…</p>
          )}

          {stato.fase === 'errore' && (
            <div className="visore-farmaco__stato visore-farmaco__stato--errore">
              <p>
                {stato.fonteIrraggiungibile
                  ? 'La banca dati AIFA non risponde in questo momento. Il documento esiste: è la fonte a non essere raggiungibile.'
                  : `Il documento non è leggibile: ${stato.messaggio}.`}
              </p>
              <a href={documento.href} target="_blank" rel="noopener noreferrer">
                Riprova aprendo il documento direttamente su AIFA
              </a>
            </div>
          )}

          {pronto &&
            pagine.map((numero) => (
              <PaginaRenderizzata
                key={numero}
                pdf={pronto.pdf}
                numero={numero}
                evidenziati={evidenzePerPagina.get(numero) ?? NESSUNA_EVIDENZA}
              />
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Rettangolo del frammento in coordinate PDF, pronto per la trasformazione del viewport. */
function rettangoloDi(f: FrammentoTesto) {
  return {
    pagina: f.pagina,
    sinistra: f.x,
    alto: f.y,
    larghezza: f.larghezza,
    altezza: f.altezza,
  };
}

// ── Intestazione: quale formulazione si sta leggendo ────────────────────────────────────────

function FormulazioneScelta({
  blocchi,
  scelto,
  daOperatore,
  onScegli,
}: {
  blocchi: BloccoRcp[];
  scelto: number | null;
  daOperatore: boolean;
  onScegli: (indice: number) => void;
}) {
  if (blocchi.length <= 1) return null;

  // Nessuna formulazione riconosciuta: si chiede, non si indovina. E' il caso in cui evidenziare
  // qualcosa sarebbe pericoloso, quindi l'elenco non e' un dettaglio ma la richiesta principale.
  if (scelto === null) {
    return (
      <div className="visore-farmaco__scelta visore-farmaco__scelta--richiesta">
        <p>
          Questo documento contiene <strong>{blocchi.length} RCP</strong>, uno per formulazione, con
          posologie diverse. La prescrizione non basta a stabilire quale: scegliere la formulazione
          per evidenziare le sezioni cliniche.
        </p>
        <ul>
          {blocchi.map((b, i) => (
            <li key={i}>
              <button type="button" onClick={() => onScegli(i)}>
                {b.denominazione || `Formulazione ${i + 1}`}{' '}
                <span className="visore-farmaco__pagina">p. {b.paginaIniziale}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="visore-farmaco__scelta">
      <p>
        {daOperatore ? 'Formulazione scelta' : 'Formulazione riconosciuta dalla prescrizione'}:{' '}
        <strong>{blocchi[scelto].denominazione || `Formulazione ${scelto + 1}`}</strong>
      </p>
      <label>
        Cambia formulazione
        <select
          value={scelto}
          onChange={(e) => onScegli(Number(e.target.value))}
          className="visore-farmaco__select"
        >
          {blocchi.map((b, i) => (
            <option key={i} value={i}>
              {b.denominazione || `Formulazione ${i + 1}`} — p. {b.paginaIniziale}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// ── Una pagina: canvas + rettangoli di evidenziazione ───────────────────────────────────────

function PaginaRenderizzata({
  pdf,
  numero,
  evidenziati,
}: {
  pdf: Documento['pdf'];
  numero: number;
  evidenziati: RettangoloEvidenziato[];
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [misure, setMisure] = useState<{ larghezza: number; altezza: number } | null>(null);
  const [rettangoli, setRettangoli] = useState<RettangoloEvidenziato[]>([]);

  useEffect(() => {
    let annullato = false;

    void (async () => {
      const pagina = await pdf.getPage(numero);
      const viewport = pagina.getViewport({ scale: SCALA });
      if (annullato || !canvas.current) return;

      canvas.current.width = viewport.width;
      canvas.current.height = viewport.height;
      const contesto = canvas.current.getContext('2d');
      if (!contesto) return;
      await pagina.render({ canvasContext: contesto, viewport }).promise;
      if (annullato) return;

      setMisure({ larghezza: viewport.width, altezza: viewport.height });
      // Le coordinate dei frammenti sono in spazio PDF: la trasformazione al viewport la fa
      // pdf.js, cosi' l'evidenziazione resta allineata a qualunque scala. Si convertono i due
      // angoli e si ricompone il rettangolo, perche' `convertToViewportRectangle` non esiste
      // piu' da pdf.js 6 — chiamarlo lanciava un TypeError che azzerava le evidenziazioni.
      setRettangoli(
        evidenziati.map((e) => {
          const [x1, y1] = viewport.convertToViewportPoint(e.sinistra, e.alto);
          const [x2, y2] = viewport.convertToViewportPoint(
            e.sinistra + e.larghezza,
            e.alto + e.altezza,
          );
          return {
            ...e,
            sinistra: Math.min(x1, x2),
            alto: Math.min(y1, y2),
            larghezza: Math.abs(x2 - x1),
            // Alcuni frammenti dichiarano altezza 0: senza un minimo l'evidenziazione esisterebbe
            // nel DOM ma sarebbe invisibile, che e' il modo peggiore di fallire.
            altezza: Math.max(Math.abs(y2 - y1), ALTEZZA_MINIMA_EVIDENZA),
          };
        }),
      );
    })();

    return () => {
      annullato = true;
    };
  }, [pdf, numero, evidenziati]);

  return (
    <div className="visore-farmaco__pagina-blocco" data-pagina={numero}>
      <div
        className="visore-farmaco__tela"
        style={misure ? { width: misure.larghezza, height: misure.altezza } : undefined}
      >
        <canvas ref={canvas} />
        {rettangoli.map((r, i) => (
          <span
            key={i}
            className="visore-farmaco__evidenza"
            data-sezione={r.numero}
            style={{
              left: r.sinistra,
              top: r.alto,
              width: r.larghezza,
              height: r.altezza,
            }}
          />
        ))}
      </div>
      <p className="visore-farmaco__numero-pagina">Pagina {numero}</p>
    </div>
  );
}
