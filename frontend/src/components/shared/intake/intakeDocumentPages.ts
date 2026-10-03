// Documento a fianco della scheda d'ingresso (HMI 1, ciclo 3a, artifacts/hmi-parity/proto/ingresso-docs.png):
// logica pura, senza React né rete.
// - chip di provenienza di un campo scritto dall'AI ("L1", "L1 + L2", "L1 · p. 2");
// - schede delle pagine del pannello (L1·p1, L1·p2…) con lo stato dal manifest;
// - pagina da aprire, titolo del pannello, spostamento fra le schede con i tasti, messaggi d'errore.
// Le lettere si numerano come nel job: `manifest.groups` ordinati per `sortOrder`.
import type { ImportJob, ImportPage } from '../import/importSessionTypes';
import { readingJob } from './intakeDocuments';

type Data = Record<string, unknown>;
const obj = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};

// ── Origine di un campo (`_fieldOrigin[path]`) ─────────────────────────────────────────────

/** Pagina da cui l'AI ha letto il valore (ciclo 3c: `_fieldOrigin[path].pages`). */
export interface OriginPage {
  groupId: string;
  pageId: string;
  documentId: string;
}
export interface FieldOrigin {
  groupIds: string[];
  pages: OriginPage[];
}

/** Origine AI di un campo; lettere e pagine sono facoltative (dati vecchi o parziali). */
export function readFieldOrigin(data: Data, path: string): FieldOrigin | null {
  const origin = obj(obj(data._fieldOrigin)[path]);
  if (origin.by !== 'ai') return null;
  const groupIds = Array.isArray(origin.groupIds)
    ? origin.groupIds.filter((id): id is string => typeof id === 'string' && !!id)
    : [];
  const pages = (Array.isArray(origin.pages) ? origin.pages : [])
    .map(obj)
    .filter(
      (p) =>
        typeof p.groupId === 'string' &&
        typeof p.pageId === 'string' &&
        typeof p.documentId === 'string',
    )
    .map((p) => ({
      groupId: String(p.groupId),
      pageId: String(p.pageId),
      documentId: String(p.documentId),
    }));
  return { groupIds, pages };
}

// ── Lettere e pagine del job ────────────────────────────────────────────────────────────────

const sortedGroups = (job: ImportJob) =>
  [...job.manifest.groups].sort((a, b) => a.sortOrder - b.sortOrder);

/** Numero della lettera (1, 2…) nell'ordine del job; 0 se la lettera non c'è più. */
export function letterNumber(job: ImportJob, groupId: string): number {
  return sortedGroups(job).findIndex((g) => g.id === groupId) + 1;
}

/** Pagine di una lettera nell'ordine del manifest. */
export function letterPages(job: ImportJob, groupId: string): ImportPage[] {
  return job.manifest.pages
    .filter((p) => p.groupId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Pagina dell'origine ancora valida: lo stesso pageId esiste nel manifest con lo stesso documento
 * (una pagina sostituita o eliminata non viene più indicata).
 */
function livePage(job: ImportJob, page: OriginPage): ImportPage | null {
  const found = job.manifest.pages.find((p) => p.id === page.pageId);
  return found && found.documentId === page.documentId ? found : null;
}

// ── Chip di provenienza ─────────────────────────────────────────────────────────────────────

/** Dove apre il pannello: una lettera e, se nota, una pagina. */
export interface PanelTarget {
  groupId: string;
  pageId?: string;
}

export interface OriginChip {
  /** "AI", "L1", "L1 + L2", "L1 · p. 2". */
  label: string;
  /** Nome accessibile del chip (pulsante o etichetta). */
  ariaLabel: string;
  /** null: il chip resta "AI" e non si apre (nessuna lettera nota, o documenti non collegati). */
  target: PanelTarget | null;
}

export const AI_CHIP_TITLE = 'Valore letto dall’AI dai documenti';

/**
 * Chip di provenienza per uno o più campi (un blocco clinico ne ha più d'uno): le lettere si
 * uniscono, la pagina si mostra solo se l'origine la indica e la pagina esiste ancora.
 */
export function originChip(
  job: ImportJob | null,
  origins: readonly (FieldOrigin | null)[],
): OriginChip {
  const plain: OriginChip = { label: 'AI', ariaLabel: AI_CHIP_TITLE, target: null };
  if (!job) return plain;
  const letters = new Map<number, string>();
  let page: { groupId: string; pageId: string; letter: number; number: number } | null = null;
  for (const origin of origins) {
    if (!origin) continue;
    // Le pagine ancora valide vincono su `groupIds`: una pagina spostata in un'altra lettera
    // porta con sé la lettera in cui si trova ora.
    let fromPages = false;
    for (const candidate of origin.pages) {
      const live = livePage(job, candidate);
      if (!live) continue;
      const n = letterNumber(job, live.groupId);
      if (n <= 0) continue;
      fromPages = true;
      letters.set(n, live.groupId);
      const number = letterPages(job, live.groupId).findIndex((p) => p.id === live.id) + 1;
      if (!page || n < page.letter || (n === page.letter && number < page.number))
        page = { groupId: live.groupId, pageId: live.id, letter: n, number };
    }
    if (fromPages) continue;
    for (const groupId of origin.groupIds) {
      const n = letterNumber(job, groupId);
      if (n > 0) letters.set(n, groupId);
    }
  }
  if (!letters.size) return plain;
  const numbers = [...letters.keys()].sort((a, b) => a - b);
  const first = numbers[0];
  const onPage = page && page.letter === first ? page : null;
  const reason = 'da cui l’AI ha letto questo valore';
  if (numbers.length === 1) {
    return onPage
      ? {
          label: `L${first} · p. ${onPage.number}`,
          ariaLabel: `Apri la lettera ${first}, pagina ${onPage.number}, ${reason}`,
          target: { groupId: onPage.groupId, pageId: onPage.pageId },
        }
      : {
          label: `L${first}`,
          ariaLabel: `Apri la lettera ${first}, ${reason}`,
          target: { groupId: letters.get(first)! },
        };
  }
  const all = numbers.map((n) => `L${n}`).join(' + ');
  const spoken = `${numbers.slice(0, -1).join(', ')} e ${numbers[numbers.length - 1]}`;
  return {
    label: all,
    ariaLabel: `Apri la lettera ${first}${onPage ? `, pagina ${onPage.number}` : ''}: l’AI ha letto questo valore dalle lettere ${spoken}`,
    target: onPage
      ? { groupId: onPage.groupId, pageId: onPage.pageId }
      : { groupId: letters.get(first)! },
  };
}

/**
 * Documento da cui è stata letta una riga di terapia (`importSource`/`importSources`): la prima
 * lettera ancora presente nel job. Serve a confrontare la terapia con la foto durante l'ingresso.
 */
export function therapySourceChip(
  job: ImportJob | null,
  row: { importSource?: { groupId?: string }; importSources?: { groupId?: string }[] },
): { label: string; ariaLabel: string; target: PanelTarget } | null {
  if (!job) return null;
  const ids = [
    ...(Array.isArray(row.importSources) ? row.importSources : []),
    ...(row.importSource ? [row.importSource] : []),
  ]
    .map((s) => s?.groupId)
    .filter((id): id is string => typeof id === 'string' && letterNumber(job, id) > 0);
  if (!ids.length) return null;
  const groupId = ids.sort((a, b) => letterNumber(job, a) - letterNumber(job, b))[0];
  const n = letterNumber(job, groupId);
  const first = letterPages(job, groupId)[0];
  return {
    label: `Vedi documento L${n}`,
    ariaLabel: `Apri la lettera ${n} da cui è stata letta questa terapia`,
    target: first ? { groupId, pageId: first.id } : { groupId },
  };
}

// ── Schede del pannello ─────────────────────────────────────────────────────────────────────

export type PageTabState = 'done' | 'reading' | 'waiting' | 'error';

export interface PageTab {
  pageId: string;
  groupId: string;
  documentId: string;
  sourcePageNumber: number;
  letter: number;
  number: number;
  /** "L1·p2" (testo della scheda). */
  label: string;
  /** "Lettera 1 · p. 2" (titolo del pannello). */
  title: string;
  state: PageTabState;
  /** Stato a parole, per il nome accessibile della scheda. */
  stateText: string;
}

const STATE_TEXT: Record<PageTabState, string> = {
  done: 'letta',
  reading: 'in lettura',
  waiting: 'da leggere',
  error: 'lettura non riuscita',
};

/** Una scheda per pagina, lettera per lettera, con lo stato del manifest. */
export function pageTabs(job: ImportJob | null): PageTab[] {
  if (!job) return [];
  const reading = readingJob(job);
  return sortedGroups(job).flatMap((group, gi) =>
    letterPages(job, group.id).map((page, pi) => {
      const state: PageTabState =
        page.status === 'completed'
          ? 'done'
          : page.status === 'failed'
            ? 'error'
            : page.status === 'running' || reading
              ? 'reading'
              : 'waiting';
      return {
        pageId: page.id,
        groupId: group.id,
        documentId: page.documentId,
        sourcePageNumber: page.sourcePageNumber,
        letter: gi + 1,
        number: pi + 1,
        label: `L${gi + 1}·p${pi + 1}`,
        title: `Lettera ${gi + 1} · p. ${pi + 1}`,
        state,
        stateText: STATE_TEXT[state],
      };
    }),
  );
}

/** Pagina da mostrare all'apertura: quella indicata, altrimenti la prima della lettera, poi la prima. */
export function initialTab(tabs: readonly PageTab[], target: PanelTarget | null): string | null {
  if (!tabs.length) return null;
  if (target?.pageId && tabs.some((t) => t.pageId === target.pageId)) return target.pageId;
  const ofLetter = target ? tabs.find((t) => t.groupId === target.groupId) : undefined;
  return (ofLetter ?? tabs[0]).pageId;
}

/** La scheda scelta resta se esiste ancora (il manifest cambia durante la lettura). */
export function keepTab(tabs: readonly PageTab[], selected: string | null): string | null {
  if (selected && tabs.some((t) => t.pageId === selected)) return selected;
  return tabs[0]?.pageId ?? null;
}

/** Titolo del pannello: "Lettera N · p. M", o "Documenti" senza pagine. */
export const panelTitle = (tab: PageTab | undefined) => tab?.title ?? 'Documenti';

/** Spostamento fra le schede (frecce, Home, Fine), con giro; null se il tasto non riguarda le schede. */
export function tabKeyTarget(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

// ── Errori della pagina ─────────────────────────────────────────────────────────────────────

const errorStatus = (error: unknown) =>
  (error && typeof error === 'object' ? (error as { status?: unknown }) : {}).status;

/**
 * Riprovare ha senso? No se l'originale manca o è illeggibile (422), è stato rimosso (404) o la
 * sessione è chiusa (410): serve un'azione dell'operatore, non un nuovo tentativo.
 */
export const pageErrorRetryable = (error: unknown) =>
  ![404, 410, 422].includes(errorStatus(error) as number);

/** Pagina non caricata: messaggio chiaro in italiano (404, 410, 422, sessione scaduta, rete). */
export function pageErrorMessage(error: unknown): string {
  if (error instanceof TypeError)
    return 'Connessione assente o interrotta: la pagina non si può mostrare. Riprova.';
  const status = errorStatus(error);
  if (status === 422) return 'Il file originale non è leggibile: rimuovilo e caricalo di nuovo.';
  if (status === 404)
    return 'Questa pagina non è più disponibile: il documento è stato sostituito o rimosso.';
  if (status === 410) return 'I documenti non sono più disponibili: la sessione è scaduta.';
  if (status === 401 || status === 403)
    return 'Sessione scaduta: accedi di nuovo per vedere la pagina.';
  if (typeof status === 'number' && status >= 500)
    return 'Il servizio non ha risposto: la pagina non si può mostrare ora. Riprova tra poco.';
  return 'Impossibile mostrare la pagina. Riprova.';
}
