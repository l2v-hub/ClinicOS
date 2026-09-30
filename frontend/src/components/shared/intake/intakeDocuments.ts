// Card Documenti della scheda d'ingresso (HMI 1, ciclo 2b): orchestrazione pura, senza React né rete.
// - quando unire i risultati AI nella bozza (per lettera o finale, una sola volta per risultato);
// - avanzamento della lettura, testi e messaggi d'errore in italiano;
// - lettura di `_fieldOrigin` (campi scritti dall'AI) e `_fieldProposals` (proposte da decidere);
// - ricostruzione della bozza dopo un'unione senza perdere quanto l'operatore sta scrivendo.
// Le regole di proprietà dei campi restano del backend (mergeAiIntoDraft): qui si legge soltanto.
import type { ImportJob } from '../import/importSessionTypes';

type Data = Record<string, unknown>;

// ── Chiavi riservate e confronto ────────────────────────────────────────────────────────────

/** Chiavi della bozza scritte solo dal server: mai nel PATCH dell'autosalvataggio. */
export const SERVER_DRAFT_KEYS = ['_fieldOrigin', '_fieldProposals', '_aiMerge'] as const;

const obj = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};

/** Stessa nozione di campo vuoto del backend (draft-merge `filled`). */
export function filled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value as Data).some((v) => filled(v));
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}

// Le righe delle liste hanno id/date generati: l'uguaglianza riguarda solo il contenuto clinico.
function comparable(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map((item) => {
      if (!item || typeof item !== 'object') return comparable(item);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _createdAt, ...rest } = item as Data;
      return comparable(rest);
    });
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value as Data).map(([k, v]) => [k, comparable(v)]));
  return typeof value === 'string' ? value.trim() : value;
}
export const sameValue = (a: unknown, b: unknown) =>
  canonical(comparable(a)) === canonical(comparable(b));

// ── Campi AI e proposte ─────────────────────────────────────────────────────────────────────

/** Campi che l'AI può compilare (backend MERGE_FIELD_PATHS) con l'etichetta della scheda. */
export const AI_FIELD_LABELS: Record<string, string> = {
  'anagrafica.lastName': 'Cognome',
  'anagrafica.firstName': 'Nome',
  'anagrafica.dateOfBirth': 'Data di nascita',
  'anagrafica.sex': 'Sesso',
  'anagrafica.codiceFiscale': 'Codice fiscale',
  'anagrafica.phone': 'Telefono',
  'anagrafica.email': 'Email',
  'anagrafica.address': 'Indirizzo',
  'anamnesi.patologicaProssima': 'Anamnesi patologica prossima',
  'anamnesi.patologicaRemota': 'Anamnesi patologica remota',
  diagnosi: 'Diagnosi',
  allergie: 'Allergie',
  allergieStatus: 'Stato delle allergie',
};
export const fieldLabel = (path: string) => AI_FIELD_LABELS[path] ?? path;

export function readPath(data: Data, path: string): unknown {
  const [head, key] = path.split('.');
  return key === undefined ? data[head] : obj(data[head])[key];
}

/**
 * Campi il cui valore è ancora quello scritto dall'AI (`_fieldOrigin.by === 'ai'`). Appena
 * l'operatore cambia il valore il campo non è più AI (stessa regola del backend).
 */
export function aiFieldPaths(data: Data): Set<string> {
  const out = new Set<string>();
  for (const [path, raw] of Object.entries(obj(data._fieldOrigin))) {
    const origin = obj(raw);
    const current = readPath(data, path);
    if (origin.by === 'ai' && filled(current) && sameValue(current, origin.value)) out.add(path);
  }
  return out;
}

/** Sezione della scheda (chiave di StepClinica) che contiene un campo AI. */
export const sectionOfPath = (path: string) =>
  path === 'allergieStatus' ? 'allergie' : path.split('.')[0];

export interface FieldProposal {
  id: string;
  path: string;
  value: unknown;
  current: unknown;
  groupIds: string[];
  status: string;
}

/** Proposte ancora da decidere, nell'ordine dei campi della scheda. */
export function pendingFieldProposals(data: Data): FieldProposal[] {
  const list = Array.isArray(data._fieldProposals) ? (data._fieldProposals as unknown[]) : [];
  const order = Object.keys(AI_FIELD_LABELS);
  return list
    .map(obj)
    .filter((p) => p.status === 'pending' && typeof p.id === 'string' && typeof p.path === 'string')
    .map((p) => ({
      id: String(p.id),
      path: String(p.path),
      value: p.value,
      current: p.current,
      groupIds: Array.isArray(p.groupIds) ? p.groupIds.map(String) : [],
      status: 'pending',
    }))
    .sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
}

const ALLERGY_STATUS: Record<string, string> = {
  presenti: 'Allergie presenti',
  assenti: 'Nessuna allergia',
  paziente_nega: 'Il paziente nega allergie',
};

/** Valore leggibile di una proposta: testo intero, mai troncato. */
export function formatFieldValue(path: string, value: unknown): string {
  if (!filled(value)) return 'vuoto';
  if (path === 'allergieStatus' && typeof value === 'string') return ALLERGY_STATUS[value] ?? value;
  if (path === 'anagrafica.sex' && typeof value === 'string')
    return value === 'M' ? 'Maschio' : value === 'F' ? 'Femmina' : value;
  if (path === 'anagrafica.dateOfBirth' && typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  if (Array.isArray(value))
    return value
      .map((item) => {
        const row = obj(item);
        const main = row.allergene ?? row.descrizione ?? row.nome ?? row.name;
        if (typeof main !== 'string') return typeof item === 'string' ? item : '';
        const extra = typeof row.reazione === 'string' && row.reazione.trim() ? row.reazione : '';
        return extra ? `${main} (${extra})` : main;
      })
      .filter((s) => s.trim())
      .join('; ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return Object.values(obj(value))
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' · ');
}

export const proposalsLeftText = (n: number) =>
  n === 1 ? 'Una proposta dei documenti da decidere' : `${n} proposte dei documenti da decidere`;

export const FIELD_PROPOSALS_PENDING_MESSAGE = (n: number) =>
  `Prima di creare il paziente decidi ${n === 1 ? 'la proposta' : `le ${n} proposte`} dei documenti: «Usa questo valore» o «Tieni il mio».`;

// ── Quando unire ────────────────────────────────────────────────────────────────────────────

export type MergeStep =
  | { kind: 'final'; key: string; manifestRevision: number; resultHash: string }
  | { kind: 'letter'; key: string; groupId: string; resultHash: string };

type GroupWithHash = ImportJob['manifest']['groups'][number] & { resultHash?: string | null };

/** La revisione finale è pronta e unibile (nessuna informazione discordante da decidere). */
export function finalReady(job: ImportJob) {
  const r = job.review;
  return (
    job.status === 'review_ready' &&
    r?.canProceed === true &&
    typeof r.resultHash === 'string' &&
    typeof r.manifestRevision === 'number'
  );
}

/**
 * Prossima unione da chiedere al server, o null. `done` contiene le chiavi già unite (o scartate
 * con un rifiuto definitivo) in questa sessione: ogni lettera si unisce una sola volta per
 * (groupId, resultHash), l'unione finale una sola volta per (manifestRevision, resultHash).
 * Con l'unione finale fatta (o pronta) le lettere non si uniscono più: la finale le comprende.
 */
export function nextMergeStep(job: ImportJob, data: Data, done: ReadonlySet<string>) {
  const mergedFinal = obj(data._aiMerge).final;
  if (finalReady(job)) {
    const resultHash = job.review.resultHash as string;
    const manifestRevision = job.review.manifestRevision as number;
    const key = `final:${manifestRevision}:${resultHash}`;
    if (mergedFinal === resultHash || done.has(key)) return null;
    return { kind: 'final', key, manifestRevision, resultHash } as MergeStep;
  }
  const groups = [...(job.manifest.groups as GroupWithHash[])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  for (const group of groups) {
    if (typeof group.resultHash !== 'string' || !group.resultHash) continue;
    const key = `letter:${group.id}:${group.resultHash}`;
    if (!done.has(key))
      return { kind: 'letter', key, groupId: group.id, resultHash: group.resultHash } as MergeStep;
  }
  return null;
}

/** Stati del job in cui il server sta ancora leggendo. */
export const readingJob = (job: ImportJob) =>
  [
    'queued',
    'processing',
    'uploading_to_google',
    'waiting_for_model',
    'validating_response',
    'repairing_response',
  ].includes(job.status);

/** Serve ancora interrogare il job: lettura in corso o un'unione ancora da fare. */
export const shouldPoll = (job: ImportJob | null, data: Data, done: ReadonlySet<string>) =>
  !!job &&
  !['cancelled', 'expired', 'confirmed'].includes(job.status) &&
  (readingJob(job) || nextMergeStep(job, data, done) !== null);

// ── Avanzamento e testi ─────────────────────────────────────────────────────────────────────

export const AI_READING_TEXT =
  'L’AI sta leggendo: puoi già scrivere. I campi che hai compilato tu non vengono mai sovrascritti.';

export interface DocumentsProgress {
  read: number;
  total: number;
  /** 0–100, pagine e lettere insieme (come il flusso "da documenti"). */
  percent: number;
  label: string;
  reading: boolean;
  status: string;
}

export function documentsProgress(job: ImportJob | null, data: Data = {}): DocumentsProgress {
  if (!job)
    return {
      read: 0,
      total: 0,
      percent: 0,
      label: '0/0 pagine lette',
      reading: false,
      status: 'Aggiungi le pagine della lettera: l’AI compila i campi vuoti della scheda.',
    };
  const p = job.progress;
  const total = p?.totalPages ?? job.manifest.pages.length;
  const read = Math.min(p?.completedPages ?? 0, total);
  const units = Math.max(1, total + (p?.totalGroups ?? 0));
  const percent = Math.round(((read + (p?.completedGroups ?? 0)) / units) * 100);
  const reading = readingJob(job);
  const conflicts = job.status === 'review_ready' && (job.review?.unresolvedConflicts ?? 0) > 0;
  const merged = obj(data._aiMerge).final === job.review?.resultHash && !!job.review?.resultHash;
  const status = reading
    ? AI_READING_TEXT
    : job.status === 'uploaded'
      ? 'Pagine salvate: la lettura parte appena possibile.'
      : ['failed', 'retryable_error'].includes(job.status)
        ? 'La lettura non è riuscita. Le pagine sono salvate: puoi riprovare.'
        : conflicts
          ? 'Lettura completata. Alcune informazioni sono diverse tra le lettere: restano i valori letti da ciascuna lettera.'
          : job.status === 'review_ready'
            ? merged
              ? 'Lettura completata: i campi letti dall’AI sono segnati con «AI».'
              : 'Lettura completata: aggiorno la scheda…'
            : '';
  return {
    read,
    total,
    percent: job.status === 'review_ready' ? 100 : Math.min(100, percent),
    label: `${read}/${total} pagine lette`,
    reading,
    status,
  };
}

// ── File e messaggi d'errore ────────────────────────────────────────────────────────────────

const mb = (bytes: number) => `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;

/** Controllo locale prima dell'invio (il server resta l'ultima parola). */
export function checkFiles(
  files: File[],
  limits: Pick<ImportJob['limits'], 'maxFileBytes' | 'acceptedMimeTypes' | 'maxPages'>,
  pagesNow: number,
) {
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    if (limits.acceptedMimeTypes.length && !limits.acceptedMimeTypes.includes(file.type))
      problems.push(`«${file.name}»: formato non supportato. Usa una foto (JPG o PNG) o un PDF.`);
    else if (file.size > limits.maxFileBytes)
      problems.push(`«${file.name}»: supera il limite di ${mb(limits.maxFileBytes)} per file.`);
    else if (file.size === 0) problems.push(`«${file.name}»: il file è vuoto.`);
    else accepted.push(file);
  }
  if (pagesNow >= limits.maxPages && accepted.length) {
    problems.push(
      `Limite di ${limits.maxPages} pagine raggiunto: non si possono aggiungere pagine.`,
    );
    accepted.length = 0;
  }
  return { accepted, problems };
}

interface ErrorLike {
  status?: number;
  code?: string;
  message?: string;
}

/** Errori del job e delle unioni come messaggi chiari in italiano. */
export function documentsErrorMessage(error: unknown): string {
  if (error instanceof TypeError)
    return 'Connessione assente o interrotta. Le pagine già salvate sono conservate: riprova.';
  const e = (error && typeof error === 'object' ? error : {}) as ErrorLike;
  if (e.status === 429)
    return 'Hai raggiunto il limite di letture AI per ora. Le pagine sono salvate: riprova tra qualche minuto.';
  switch (e.code) {
    case 'request_limit':
      return 'Il file è troppo grande per un solo caricamento.';
    case 'session_limit':
      return 'Limite di file o di dimensione totale dei documenti raggiunto.';
    case 'invalid_files':
    case 'invalid_file':
    case 'unsupported_type':
      return 'File non valido: usa una foto (JPG o PNG) o un PDF leggibile.';
    case 'session_closed':
    case 'session_terminal':
      return 'I documenti non sono più modificabili: la sessione è chiusa o scaduta.';
    case 'draft_linked':
      return 'La scheda ha già documenti collegati. Ricarica la scheda.';
    case 'draft_closed':
      return 'La scheda è già stata confermata.';
    case 'draft_link_changed':
    case 'draft_not_linked':
      return 'I documenti collegati alla scheda sono cambiati. Ricarica la scheda.';
    case 'draft_version_conflict':
    case 'draft_version_required':
      return 'La scheda è cambiata nel frattempo. Ricarica e riprova.';
    case 'field_proposals_pending':
      return 'Prima di creare il paziente decidi le proposte dei documenti.';
  }
  if (typeof e.status === 'number' && e.status >= 500)
    return 'Il servizio non ha risposto. Le pagine sono salvate: riprova tra poco.';
  return e.message || 'Operazione non riuscita. Riprova.';
}

/** Rifiuto di versione della bozza: si ricarica e si ripete una sola volta. */
export const isVersionConflict = (error: unknown) => {
  const e = (error && typeof error === 'object' ? error : {}) as ErrorLike;
  return (
    e.status === 409 && (e.code === 'draft_version_conflict' || e.code === 'draft_version_required')
  );
};

/**
 * Esegue una mutazione versionata della bozza; su 409 di versione ricarica la bozza e ripete una
 * sola volta con un nuovo requestId. `skip` evita la ripetizione quando la bozza ricaricata ha già
 * il risultato (per esempio l'unione finale arrivata con una risposta persa).
 */
export async function mutateWithVersionRetry<T extends { version?: number; data?: Data }>(opts: {
  version: number | undefined;
  run: (version: number | undefined, requestId: string) => Promise<T>;
  reload: () => Promise<T>;
  skip?: (fresh: T) => boolean;
  newKey: () => string;
}): Promise<T> {
  try {
    return await opts.run(opts.version, opts.newKey());
  } catch (error) {
    if (!isVersionConflict(error)) throw error;
    const fresh = await opts.reload();
    if (opts.skip?.(fresh)) return fresh;
    return opts.run(fresh.version, opts.newKey());
  }
}

// ── Bozza ricaricata e modifiche locali ──────────────────────────────────────────────────────

const plain = (v: unknown): v is Data => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Bozza nuova dal server (dopo un'unione o una decisione) + modifiche locali non ancora salvate.
 * `base` è l'ultima bozza nota al server da cui deriva `local`: ciò che l'operatore ha cambiato
 * rispetto a `base` resta suo (per le sezioni oggetto, campo per campo); il resto arriva dal server.
 * `dirty` dice se resta qualcosa da salvare.
 */
export function rebaseLocalEdits(base: Data, local: Data, server: Data) {
  const out: Data = structuredClone(server);
  let dirty = false;
  const reserved = new Set<string>(SERVER_DRAFT_KEYS);
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (reserved.has(key) || key.startsWith('_import') || key === '_narrative') continue;
    const was = base[key];
    const now = local[key];
    if (canonical(was) === canonical(now)) continue;
    if (
      plain(now) &&
      (plain(was) || was === undefined) &&
      (plain(server[key]) || server[key] === undefined)
    ) {
      const merged: Data = { ...obj(server[key]) };
      for (const sub of new Set([...Object.keys(obj(was)), ...Object.keys(now)])) {
        if (canonical(obj(was)[sub]) === canonical(now[sub])) continue;
        if (now[sub] === undefined) delete merged[sub];
        else merged[sub] = structuredClone(now[sub]);
      }
      out[key] = merged;
    } else if (now === undefined) delete out[key];
    else out[key] = structuredClone(now);
    if (canonical(out[key]) !== canonical(server[key])) dirty = true;
  }
  return { data: out, dirty };
}

/** Dopo una decisione: prossima proposta aperta, altrimenti il campo deciso o la sua sezione. */
export function focusAfterFieldDecision(path: string) {
  if (typeof document === 'undefined') return;
  const next = document.querySelector<HTMLElement>('[data-testid="intake-proposal-apply"]');
  if (next) return next.focus();
  const [section, key] = path.split('.');
  const field =
    (section === 'anagrafica' && key
      ? document.querySelector<HTMLElement>(`[data-demographic-field="${key}"]`)
      : null) ??
    document.querySelector<HTMLElement>(`[data-intake-section="${sectionOfPath(path)}"]`);
  if (!field) return;
  if (!field.matches('input, select, textarea, button, [tabindex]')) field.tabIndex = -1;
  field.focus();
}
