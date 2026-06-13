// Multi-document merge with provenance and explicit conflicts (REQ-016).
//
// Takes N per-document extraction results and produces ONE merged proposal.
// Rules:
//  - Never silently overwrite a conflicting value — surface all candidates.
//  - Every value keeps its source(s) (file, document date, model, snippet).
//  - Lists are deduplicated by a field-specific key; differing details on the
//    same key become an item-level conflict, not a silent pick.
//  - Missing data stays missing (no invention).

export const MERGE_VERSION = '1.0.0';

export type FieldStatus = 'extracted' | 'missing' | 'conflict' | 'low_confidence' | 'manually_confirmed';

export interface Provenance {
  docId: string;
  filename: string;
  docDate?: string;
  model: string;
  /** short, content-limited excerpt for traceability */
  snippet?: string;
}

export interface Candidate {
  value: unknown;
  sources: Provenance[];
}

export interface MergedField {
  status: FieldStatus;
  /** chosen/only value when not in conflict */
  value: unknown;
  /** populated only when status === 'conflict' */
  candidates?: Candidate[];
  sources: Provenance[];
}

export interface MergedItem {
  key: string;
  value: Record<string, unknown>;
  status: FieldStatus;
  candidates?: Candidate[];
  sources: Provenance[];
}

export interface MergedList {
  status: 'extracted' | 'missing' | 'conflict';
  items: MergedItem[];
  duplicatesRemoved: number;
}

export interface MergeReport {
  filled: number;
  missing: number;
  conflict: number;
  duplicate: number;
}

export interface MergedProposal {
  _merge: { version: string; report: MergeReport; documents: Provenance[] };
  anagrafica: Record<string, MergedField>;
  cartella: Record<string, MergedField | MergedList>;
}

export interface DocResult {
  docId: string;
  filename: string;
  docDate?: string;
  model: string;
  /** the validated extraction output for this single document */
  data: { anagrafica?: Record<string, unknown>; cartella?: Record<string, unknown> };
}

export interface MergeOptions {
  /** When true, conflict candidates are ordered most-recent-first (still NOT auto-resolved). */
  preferRecent?: boolean;
}

// Which cartella keys are lists, and how to derive a dedup key for each item.
const LIST_KEYS: Record<string, (item: Record<string, unknown>) => string> = {
  diagnosi: (i) => norm(`${str(i.codiceICD)}|${str(i.descrizione)}`),
  allergie: (i) => norm(str(i.allergene)),
  farmaci: (i) => norm(str(i.nome)),
  terapie: (i) => norm(`${str(i.tipo)}|${str(i.descrizione)}`),
  parametriVitali: (i) => norm(`${str(i.etichetta)}|${str(i.rilevato)}`),
  noteClinica: (i) => norm(`${str(i.tipo)}|${str(i.contenuto)}`),
  diarioMedico: (i) => norm(`${str(i.data)}|${str(i.testo)}`),
  indicatoriRischio: (i) => norm(`${str(i.tipo)}`),
};

function str(v: unknown): string {
  return v == null ? '' : String(v);
}
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}
function prov(doc: DocResult, snippet?: string): Provenance {
  return { docId: doc.docId, filename: doc.filename, docDate: doc.docDate, model: doc.model, snippet };
}
function byRecency(a: Provenance, b: Provenance): number {
  return (b.docDate ?? '').localeCompare(a.docDate ?? '');
}

/** Merge a single scalar field across documents. */
function mergeScalar(
  field: string,
  docs: DocResult[],
  pick: (d: DocResult) => unknown,
  opts: MergeOptions,
): MergedField {
  const contributing = docs
    .map((d) => ({ d, v: pick(d) }))
    .filter(({ v }) => !isEmpty(v));

  if (contributing.length === 0) {
    return { status: 'missing', value: '', sources: [] };
  }

  // Group by normalized string value.
  const groups = new Map<string, { value: unknown; sources: Provenance[] }>();
  for (const { d, v } of contributing) {
    const k = norm(str(v));
    const g = groups.get(k) ?? { value: v, sources: [] };
    g.sources.push(prov(d, truncateSnippet(str(v))));
    groups.set(k, g);
  }

  if (groups.size === 1) {
    const only = [...groups.values()][0];
    return { status: 'extracted', value: only.value, sources: only.sources };
  }

  // Conflict: multiple distinct values. Never auto-pick.
  const candidates: Candidate[] = [...groups.values()].map((g) => ({ value: g.value, sources: g.sources }));
  if (opts.preferRecent) {
    candidates.sort((a, b) => byRecency(a.sources[0], b.sources[0]));
  }
  const allSources = candidates.flatMap((c) => c.sources);
  return { status: 'conflict', value: undefined, candidates, sources: allSources };
}

/** Merge a list field across documents, deduping by key. */
function mergeList(field: string, docs: DocResult[]): MergedList {
  const keyOf = LIST_KEYS[field];
  const byKey = new Map<string, { items: { item: Record<string, unknown>; doc: DocResult }[] }>();
  let total = 0;

  for (const d of docs) {
    const arr = (d.data.cartella?.[field] as unknown[]) ?? [];
    if (!Array.isArray(arr)) continue;
    for (const raw of arr) {
      if (raw == null || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const k = keyOf(item);
      if (k === '' || k === '|') continue; // skip empty placeholder items
      total++;
      const bucket = byKey.get(k) ?? { items: [] };
      bucket.items.push({ item, doc: d });
      byKey.set(k, bucket);
    }
  }

  if (byKey.size === 0) return { status: 'missing', items: [], duplicatesRemoved: 0 };

  const items: MergedItem[] = [];
  let duplicatesRemoved = 0;
  let anyConflict = false;

  for (const [key, bucket] of byKey) {
    duplicatesRemoved += bucket.items.length - 1;
    const distinct = new Map<string, { item: Record<string, unknown>; sources: Provenance[] }>();
    for (const { item, doc } of bucket.items) {
      const sig = norm(JSON.stringify(sortedEntries(item)));
      const g = distinct.get(sig) ?? { item, sources: [] };
      g.sources.push(prov(doc, truncateSnippet(JSON.stringify(item))));
      distinct.set(sig, g);
    }
    if (distinct.size === 1) {
      const only = [...distinct.values()][0];
      items.push({ key, value: only.item, status: 'extracted', sources: only.sources });
    } else {
      // Same key, differing details across docs -> item conflict (e.g. updated therapy dose).
      anyConflict = true;
      const candidates: Candidate[] = [...distinct.values()].map((g) => ({ value: g.item, sources: g.sources }));
      items.push({
        key,
        value: candidates[0].value as Record<string, unknown>,
        status: 'conflict',
        candidates,
        sources: candidates.flatMap((c) => c.sources),
      });
    }
  }

  return { status: anyConflict ? 'conflict' : 'extracted', items, duplicatesRemoved };
}

function sortedEntries(o: Record<string, unknown>): [string, unknown][] {
  return Object.entries(o).sort(([a], [b]) => a.localeCompare(b));
}
function truncateSnippet(s: string, max = 120): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

const ANAGRAFICA_FIELDS = [
  'nome', 'cognome', 'dataNascita', 'sesso', 'email', 'telefono', 'indirizzo',
  'contattoEmergenzaNome', 'contattoEmergenzaTel',
];
const CARTELLA_SCALARS = [
  'statoRicovero', 'cameraNumero', 'lettoNumero', 'codiceFiscale', 'patologiaIngresso',
  'dataRicovero', 'noteGenerali', 'medicoCurante',
];

/** Deterministically merge per-document extractions into one proposal. */
export function mergeExtractions(docs: DocResult[], opts: MergeOptions = {}): MergedProposal {
  const anagrafica: Record<string, MergedField> = {};
  for (const f of ANAGRAFICA_FIELDS) {
    anagrafica[f] = mergeScalar(f, docs, (d) => d.data.anagrafica?.[f], opts);
  }

  const cartella: Record<string, MergedField | MergedList> = {};
  for (const f of CARTELLA_SCALARS) {
    cartella[f] = mergeScalar(f, docs, (d) => d.data.cartella?.[f], opts);
  }
  for (const f of Object.keys(LIST_KEYS)) {
    cartella[f] = mergeList(f, docs);
  }

  // Report counts.
  let filled = 0, missing = 0, conflict = 0, duplicate = 0;
  const tally = (mf: MergedField) => {
    if (mf.status === 'conflict') conflict++;
    else if (mf.status === 'missing') missing++;
    else filled++;
  };
  Object.values(anagrafica).forEach(tally);
  for (const v of Object.values(cartella)) {
    if ('items' in v) {
      if (v.status === 'conflict') conflict++;
      else if (v.status === 'missing') missing++;
      else filled++;
      duplicate += v.duplicatesRemoved;
      v.items.filter((i) => i.status === 'conflict').forEach(() => conflict++);
    } else {
      tally(v);
    }
  }

  return {
    _merge: {
      version: MERGE_VERSION,
      report: { filled, missing, conflict, duplicate },
      documents: docs.map((d) => prov(d)),
    },
    anagrafica,
    cartella,
  };
}
