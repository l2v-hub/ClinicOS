// Intestazioni e piè di pagina ripetuti fra le pagine di una stessa lettera.
//
// L'OCR lavora pagina per pagina: l'intestazione dell'ospedale e il piè di pagina tornano su ogni
// foglio e, una volta unite le pagine, finiscono in mezzo al testo clinico (un «Decorso» che
// continua sulla pagina dopo si ritrova dentro il codice del documento e l'indirizzo del reparto).
// Qui si riconoscono per ciò che sono — righe uguali in cima o in fondo a più pagine — e si tolgono
// dalle posizioni in cui interrompono il testo.
//
// Deterministico, senza modello, e senza perdita: nessuna riga sparisce del tutto.
//   - riga ripetuta in CIMA alle pagine  → resta solo sulla prima pagina in cui compare;
//   - riga ripetuta in FONDO alle pagine → resta solo sull'ultima pagina in cui compare.
// Così l'intestazione apre il documento e il piè di pagina lo chiude, e fra una pagina e l'altra
// il testo clinico è continuo. Il testo originale di ogni pagina non viene mai modificato: questa
// funzione restituisce copie.
//
// Prudenza clinica: una riga che porta una dose (mg, ml, UI, cpr…) non è mai considerata
// intestazione, anche se uguale su due pagine — potrebbe essere una prescrizione.

/** Righe non vuote, dall'alto, in cui cercare un'intestazione. */
const TOP_LINES = 10;
/** Righe non vuote, dal basso, in cui cercare un piè di pagina. */
const BOTTOM_LINES = 6;

// Numero di pagina dentro una riga più lunga ("LD-2026 — pag. 1/2", "Pagina 2 di 5 — Reparto X").
const PAGE_NUMBER = [
  /\bpagina\s+\d{1,3}\s+di\s+\d{1,3}\b/gi,
  /\bpag\.?\s*\d{1,3}\s*(?:\/|di)\s*\d{1,3}\b/gi,
  /\bpage\s+\d{1,3}\s+of\s+\d{1,3}\b/gi,
  /\bpagina\s+\d{1,3}\b/gi,
  /\bpag\.?\s*\d{1,3}\b/gi,
];
// Solo numero di pagina: lo gestisce il filtro delle intestazioni (che ne conserva un segnaposto).
const ONLY_PAGE_NUMBER = /^(?:#pg|\d{1,3}\s*\/\s*\d{1,3}|-\s*\d{1,3}\s*-)$/;
const DOSE =
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|g|ml|cc|ui|u\.i\.|cpr|cps|gtt|fl|bust|puff|mmol|meq)\b/i;

/** Chiave di confronto: senza segni markdown, spazi e maiuscole; il numero di pagina è neutro. */
function key(line: string): string {
  let t = line
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[*_`>#|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const pattern of PAGE_NUMBER) t = t.replace(pattern, '#pg');
  return t
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidate(line: string): string | null {
  if (DOSE.test(line)) return null;
  const k = key(line);
  // Righe troppo corte (una parola, una sigla) sono ambigue; il solo numero di pagina non è nostro.
  if (k.length < 6 || ONLY_PAGE_NUMBER.test(k)) return null;
  // Una riga di tabella con soli trattini (separatore markdown) non è testo.
  if (/^[-: ]+$/.test(k)) return null;
  return k;
}

type Zone = { top: Map<string, number>; bottom: Map<string, number> };

/** Per ogni pagina: chiave → indice di riga, per le zone alta e bassa. */
function zones(lines: string[]): Zone {
  const filled = lines.map((line, index) => ({ line, index })).filter((x) => x.line.trim());
  const collect = (slice: typeof filled) => {
    const out = new Map<string, number>();
    for (const { line, index } of slice) {
      const k = candidate(line);
      if (k && !out.has(k)) out.set(k, index);
    }
    return out;
  };
  // Le due zone non si sovrappongono mai: su una pagina corta la stessa riga non può essere
  // insieme intestazione e piè di pagina (verrebbe tolta due volte, cioè persa).
  const top = Math.min(TOP_LINES, Math.ceil(filled.length / 2));
  const bottom = Math.min(BOTTOM_LINES, filled.length - top);
  return {
    top: collect(filled.slice(0, top)),
    bottom: collect(filled.slice(filled.length - bottom)),
  };
}

export interface PageFurnitureResult {
  /** Le pagine, nello stesso ordine, senza le ripetizioni che interrompono il testo. */
  pages: string[];
  /** Righe tolte (ripetizioni di intestazioni + ripetizioni di piè di pagina). */
  removedLines: number;
}

/**
 * Toglie le ripetizioni di intestazioni e piè di pagina fra le pagine di UNA lettera, nell'ordine
 * deciso dall'operatore. Con una sola pagina non c'è ripetizione da riconoscere: testo invariato.
 */
export function stripPageFurniture(pageTexts: string[]): PageFurnitureResult {
  if (pageTexts.length < 2) return { pages: [...pageTexts], removedLines: 0 };
  const lines = pageTexts.map((text) => text.split('\n'));
  const pageZones = lines.map(zones);
  // Una riga è «di pagina» se sta nella stessa zona di almeno due pagine e di almeno metà di esse.
  const threshold = Math.max(2, Math.ceil(pageTexts.length / 2));
  const repeated = (zone: 'top' | 'bottom') => {
    const count = new Map<string, number>();
    for (const z of pageZones)
      for (const k of z[zone].keys()) count.set(k, (count.get(k) ?? 0) + 1);
    return new Set([...count].filter(([, n]) => n >= threshold).map(([k]) => k));
  };
  const headers = repeated('top');
  // Una riga già riconosciuta come intestazione non è anche un piè di pagina.
  const footers = new Set([...repeated('bottom')].filter((k) => !headers.has(k)));
  const drop = lines.map(() => new Set<number>());
  for (const k of headers) {
    const holders = pageZones
      .map((z, page) => ({ page, index: z.top.get(k) }))
      .filter((h) => h.index !== undefined);
    for (const h of holders.slice(1)) drop[h.page].add(h.index!);
  }
  for (const k of footers) {
    const holders = pageZones
      .map((z, page) => ({ page, index: z.bottom.get(k) }))
      .filter((h) => h.index !== undefined);
    for (const h of holders.slice(0, -1)) drop[h.page].add(h.index!);
  }
  let removedLines = 0;
  const pages = lines.map((pageLines, page) => {
    if (!drop[page].size) return pageTexts[page];
    removedLines += drop[page].size;
    return pageLines
      .filter((_, index) => !drop[page].has(index))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  });
  return { pages, removedLines };
}

/** Testo di una lettera a partire dalle sue pagine, già ripulito dalle ripetizioni di pagina. */
export function joinPagesWithoutFurniture(pageTexts: string[]): string {
  return stripPageFurniture(pageTexts)
    .pages.filter((text) => text.trim())
    .join('\n\n');
}

/** Punti (in caratteri) in cui inizia ogni pagina nel testo unito con una riga vuota. */
export function pageOffsets(pageTexts: string[]): number[] {
  const offsets: number[] = [];
  let at = 0;
  for (const text of pageTexts) {
    offsets.push(at);
    at += text.length + 2;
  }
  return offsets;
}

/** Inverso di `pageOffsets`: le pagine di un testo unito; senza punti validi, una pagina sola. */
export function splitPages(rawText: string, offsets: unknown): string[] {
  if (
    !Array.isArray(offsets) ||
    !offsets.length ||
    offsets[0] !== 0 ||
    offsets.some(
      (o, i) =>
        !Number.isInteger(o) || o < 0 || o > rawText.length || (i > 0 && o < offsets[i - 1] + 2),
    )
  )
    return [rawText];
  return offsets.map((start: number, i: number) =>
    rawText.slice(start, i + 1 < offsets.length ? offsets[i + 1] - 2 : rawText.length),
  );
}
