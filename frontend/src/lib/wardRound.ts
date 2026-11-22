// Milo fase 4: giro visita a voce. Parser DETERMINISTICO della dettatura (nessun modello): divide il
// testo per paziente (cognome, nome, stanza/letto fra i pazienti del perimetro) e riconosce i
// parametri della pagina Parametri. Non indovina mai: un paziente ambiguo, un valore impossibile o
// un testo senza paziente diventano avvisi. Le bozze restano in memoria; si scrive solo alla conferma,
// con la rotta della pagina Parametri.

import { parameterValuesIssue, type ParameterValues } from './patientParameterReadings';

export interface RoundPatient {
  id: string;
  lastName: string;
  firstName: string;
  room?: string | null;
  bed?: string | null;
}
export type RoundKey = 'pa' | 'spo2' | 'fc' | 'fr' | 'temperatura' | 'dtx' | 'o2' | 'coscienza';
export type RoundValues = Partial<Record<RoundKey, string>>;

export interface RoundSegment {
  patientId: string | null;
  /** Testo dettato attribuito a questo paziente (normalizzato). */
  text: string;
  values: RoundValues;
  notes: string[];
  /** Pazienti possibili quando l'attribuzione è ambigua. */
  candidates?: string[];
}

export const ROUND_LABELS: Record<RoundKey, string> = {
  pa: 'PA',
  spo2: 'SpO₂',
  fc: 'FC',
  fr: 'FR',
  temperatura: 'Temperatura',
  dtx: 'Glicemia',
  o2: 'Ossigeno',
  coscienza: 'Coscienza',
};

// ── Normalizzazione e numeri in parole ───────────────────────────────────────────────────────

const UNITS: Record<string, number> = {
  uno: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  nove: 9,
};
const TEENS: Record<string, number> = {
  dieci: 10,
  undici: 11,
  dodici: 12,
  tredici: 13,
  quattordici: 14,
  quindici: 15,
  sedici: 16,
  diciassette: 17,
  diciotto: 18,
  diciannove: 19,
};
const TENS: Record<string, number> = {
  venti: 20,
  trenta: 30,
  quaranta: 40,
  cinquanta: 50,
  sessanta: 60,
  settanta: 70,
  ottanta: 80,
  novanta: 90,
};

/** «trentasette» → 37, «centoquarantacinque» → 145; null se la parola non è un numero. */
export function italianNumber(word: string): number | null {
  let w = word;
  let total = 0;
  if (w.startsWith('duecento')) {
    total = 200;
    w = w.slice(8);
  } else if (w.startsWith('cento')) {
    total = 100;
    w = w.slice(5);
  }
  if (!w) return total || null;
  if (TEENS[w] !== undefined) return total + TEENS[w];
  for (const [name, value] of Object.entries(TENS)) {
    const stem = name.slice(0, -1); // «trent» per «trentuno», «trentotto»
    for (const prefix of [name, stem]) {
      if (!w.startsWith(prefix)) continue;
      const rest = w.slice(prefix.length);
      if (!rest) return prefix === name ? total + value : null;
      if (UNITS[rest] !== undefined && (prefix === name) !== /^(uno|otto)$/.test(rest))
        return total + value + UNITS[rest];
    }
  }
  if (UNITS[w] !== undefined && (total > 0 || w !== 'uno')) return total + UNITS[w];
  return null;
}

export function normalizeDictation(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[%°]/g, ' ')
    .replace(/(\d)\s*([,.])\s*(\d)/g, '$1,$3')
    .replace(/[^a-z0-9/,]+/g, ' ')
    .replace(/,(?!\d)/g, ' ')
    .split(/\s+/)
    .map((w) => {
      const n = /^[a-z]+$/.test(w) ? italianNumber(w) : null;
      return n === null ? w : String(n);
    })
    .join(' ')
    .trim();
}

// ── Pazienti nominati nella dettatura ────────────────────────────────────────────────────────

const norm = (s: string | null | undefined) => normalizeDictation(s ?? '');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Mention {
  start: number;
  end: number;
  patientIds: string[];
  heard: string;
}

function findMentions(text: string, roster: RoundPatient[]): Mention[] {
  const mentions: Mention[] = [];
  const bySurname = new Map<string, RoundPatient[]>();
  for (const p of roster) {
    const key = norm(p.lastName);
    if (key.length < 2) continue;
    bySurname.set(key, [...(bySurname.get(key) ?? []), p]);
  }
  for (const [surname, patients] of bySurname) {
    const re = new RegExp(`(?:^| )(${escape(surname)})(?= |$)`, 'g');
    for (let m = re.exec(text); m; m = re.exec(text)) {
      let start = m.index + m[0].indexOf(m[1]);
      let end = start + m[1].length;
      let ids = patients.map((p) => p.id);
      // Nome subito prima o subito dopo il cognome («Mario Rossi», «Rossi Mario»): fa parte del
      // nome dettato e, con cognomi uguali, sceglie il paziente.
      const after = text.slice(end).trim().split(' ')[0] ?? '';
      const before = text.slice(0, start).trim().split(' ').pop() ?? '';
      const firstOf = (p: RoundPatient) => norm(p.firstName).split(' ')[0];
      const byAfter = patients.filter((p) => firstOf(p) && firstOf(p) === after);
      const byBefore = patients.filter((p) => firstOf(p) && firstOf(p) === before);
      const byName = byAfter.length ? byAfter : byBefore;
      if (byName.length === 1) ids = [byName[0].id];
      if (byAfter.length) end += after.length + 1;
      else if (byBefore.length) start -= before.length + 1;
      mentions.push({ start, end, patientIds: ids, heard: text.slice(start, end) });
    }
  }
  // «stanza 12 letto 3», «letto 3»: solo se il letto identifica un paziente del perimetro.
  const bedRe = /(?:^| )((?:(?:stanza|camera) (\w+) )?letto (\w+))(?= |$)/g;
  for (let m = bedRe.exec(text); m; m = bedRe.exec(text)) {
    const room = m[2];
    const bed = m[3];
    const ids = roster
      .filter((p) => norm(p.bed) === bed && (!room || norm(p.room) === room))
      .map((p) => p.id);
    const start = m.index + m[0].indexOf(m[1]);
    mentions.push({ start, end: start + m[1].length, patientIds: ids, heard: m[1] });
  }
  return mentions.sort((a, b) => a.start - b.start);
}

// ── Parametri riconosciuti ───────────────────────────────────────────────────────────────────

const FILL = '(?: (?:a|di|al|e|pari a|uguale a|valore|di valore|era|risulta))*';
const label = (words: string) => new RegExp(`(?:^| )(?:${words})${FILL} `, 'g');
const PATTERNS: Array<{ key: RoundKey; re: RegExp; read: (m: RegExpExecArray) => string }> = [
  {
    key: 'pa',
    re: new RegExp(
      `${label('pressione arteriosa|pressione|pa|p a').source}(\\d{2,3}) ?(?:/|su|e|-) ?(\\d{2,4})(?!\\d)`,
      'g',
    ),
    read: (m) => `${m[1]}/${m[2]}`,
  },
  {
    key: 'fr',
    re: new RegExp(
      `${label('frequenza respiratoria|respiratoria|atti respiratori|respiri|fr|f r').source}(\\d{1,3})(?![\\d/]| /)`,
      'g',
    ),
    read: (m) => m[1],
  },
  {
    key: 'fc',
    re: new RegExp(
      `${label('frequenza cardiaca|frequenza|polso|battiti|fc|f c').source}(\\d{2,3})(?![\\d/]| /)`,
      'g',
    ),
    read: (m) => m[1],
  },
  {
    key: 'spo2',
    re: new RegExp(
      `${label('saturazione|saturimetria|satura|sat|spo2|sp o2|ossimetria').source}(\\d{2,3})`,
      'g',
    ),
    read: (m) => m[1],
  },
  {
    key: 'temperatura',
    re: new RegExp(
      `${label('temperatura corporea|temperatura|temp|febbre|tc|t c').source}(\\d{2,3})(?:(?:,| e | virgola | punto )(\\d)(?!\\d))?(?![\\d/])`,
      'g',
    ),
    read: (m) => (m[2] ? `${m[1]},${m[2]}` : m[1]),
  },
  {
    key: 'dtx',
    re: new RegExp(
      `${label('glicemia capillare|glicemia|destrostix|destro|dextro|dtx|stick').source}(\\d{2,3})`,
      'g',
    ),
    read: (m) => m[1],
  },
];
const O2_NO = /(?:^| )(?:in aria ambiente|aria ambiente|in aria|senza ossigeno|in aa)(?= |$)/;
const O2_YES =
  /(?:^| )(?:in ossigeno|con ossigeno|ossigenoterapia|ossigeno \d+|o2 \d+|occhialini|maschera|venturi)(?= |$)/;
const ACVPU: Array<[string, RegExp]> = [
  ['U', /(?:^| )(?:non risponde|incoscient[ea]|non responsiv[oa])(?= |$)/],
  ['P', /(?:^| )(?:risponde al dolore|risponde dolore|risposta al dolore)(?= |$)/],
  ['V', /(?:^| )(?:risponde alla voce|risponde voce|risposta alla voce)(?= |$)/],
  ['C', /(?:^| )(?:confus[oa]|disorientat[oa]|nuova confusione)(?= |$)/],
  ['A', /(?:^| )(?:vigile|sveglia|sveglio|orientat[oa]|allert[oa]|coscienza a)(?= |$)/],
];

/** Valori fisiologicamente impossibili: mai salvati, mai corretti (stessi limiti del backend). */
function impossible(key: RoundKey, value: string): boolean {
  const n = Number(value.replace(',', '.'));
  switch (key) {
    case 'pa': {
      const [s, d] = value.split('/').map(Number);
      return s < 40 || s > 300 || d < 20 || d > 200 || d >= s;
    }
    case 'fc':
      return n < 20 || n > 300;
    case 'temperatura':
      return n < 25 || n > 45;
    case 'dtx':
      return n < 10 || n > 900;
    case 'spo2':
      return n < 40 || n > 100;
    case 'fr':
      return n < 1 || n > 80;
    default:
      return false;
  }
}

export function extractRoundValues(text: string): { values: RoundValues; notes: string[] } {
  const values: RoundValues = {};
  const notes: string[] = [];
  let rest = ` ${text} `;
  for (const { key, re, read } of PATTERNS) {
    re.lastIndex = 0;
    const found: string[] = [];
    rest = rest.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      found.push(read(m));
      return ' '.repeat(String(args[0]).length); // la stessa parola non vale per due parametri
    });
    for (const v of found) {
      if (impossible(key, v)) notes.push(`${ROUND_LABELS[key]} ${v}: valore impossibile, ripeti`);
    }
    const ok = found.filter((v) => !impossible(key, v));
    if (ok.length) values[key] = ok[ok.length - 1];
    if (new Set(ok).size > 1)
      notes.push(`${ROUND_LABELS[key]}: più valori dettati, tenuto ${ok[ok.length - 1]}`);
  }
  const no = O2_NO.test(rest);
  const yes = O2_YES.test(rest);
  if (no && yes) notes.push('Ossigeno: detto sia «in aria» sia «in ossigeno», scegli tu');
  else if (no || yes) values.o2 = yes ? 'si' : 'no';
  const levels = ACVPU.filter(([, re]) => re.test(rest)).map(([level]) => level);
  if (levels.length === 1) values.coscienza = levels[0];
  else if (levels.length > 1)
    notes.push(`Coscienza: livelli diversi (${levels.join(', ')}), scegli tu`);
  return { values, notes };
}

// ── Dettatura → segmenti per paziente ────────────────────────────────────────────────────────

const label2 = (p: RoundPatient) => `${p.lastName} ${p.firstName}`.trim();
// Parole che da sole non sono un dato: «e», «poi», «signora», «paziente»…
const FILLER =
  /(?:^| )(?:e|poi|ora|adesso|allora|quindi|ok|bene|invece|il|la|lo|al|alla|del|della|signor|signora|signore|sig|sigra|paziente|passiamo|passo|a|ancora)(?= |$)/g;

/**
 * Divide un frammento dettato per paziente. Il testo prima del primo paziente nominato continua il
 * paziente del frammento precedente (`lastPatientId`), come accade dettando a pezzi.
 */
export function parseRoundDictation(
  raw: string,
  roster: RoundPatient[],
  lastPatientId?: string | null,
): { segments: RoundSegment[]; lastPatientId: string | null } {
  const text = normalizeDictation(raw);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const mentions = findMentions(text, roster);
  // Menzioni attaccate (es. «Rossi letto 4»): stesso paziente → una sola; pazienti diversi →
  // ambiguità esplicita; letto sconosciuto accanto a un cognome noto → vale il cognome, con avviso.
  const merged: Array<Mention & { conflict?: boolean; note?: string }> = [];
  for (const m of mentions) {
    const prev = merged[merged.length - 1];
    if (prev && (m.start < prev.end || text.slice(prev.end, m.start).trim() === '')) {
      const both = prev.patientIds.filter((id) => m.patientIds.includes(id));
      if (both.length) prev.patientIds = both;
      else if (!m.patientIds.length) prev.note = `«${m.heard}» non corrisponde a ${prev.heard}`;
      else if (!prev.patientIds.length) prev.patientIds = m.patientIds;
      else {
        prev.patientIds = [...new Set([...prev.patientIds, ...m.patientIds])];
        prev.conflict = true;
      }
      prev.end = Math.max(prev.end, m.end);
      prev.heard = text.slice(prev.start, prev.end);
      continue;
    }
    merged.push({ ...m });
  }
  const segments: RoundSegment[] = [];
  let current = lastPatientId ?? null;
  const pushSegment = (
    patientIds: string[] | null,
    body: string,
    heard = '',
    conflict = false,
    mentionNote?: string,
  ) => {
    const { values, notes } = extractRoundValues(body);
    const content = body.replace(FILLER, ' ').trim();
    let patientId: string | null = null;
    let candidates: string[] | undefined;
    if (patientIds === null) patientId = current;
    else if (patientIds.length === 1 && !conflict) patientId = patientIds[0];
    else if (patientIds.length === 0)
      notes.unshift(`Paziente «${heard}» non trovato fra i tuoi pazienti`);
    else {
      candidates = patientIds;
      notes.unshift(
        `«${heard}»: più pazienti possibili (${patientIds.map((id) => label2(byId.get(id)!)).join(', ')})`,
      );
    }
    if (mentionNote) notes.unshift(mentionNote);
    if (patientIds !== null) current = patientId;
    if (!content && !notes.length) return; // solo il nome del paziente: resta il paziente corrente
    if (patientId === null && patientIds === null)
      notes.unshift('Testo senza paziente: nomina il paziente prima dei valori');
    if (!Object.keys(values).length && content && !notes.length)
      notes.push('Nessun parametro riconosciuto');
    segments.push({
      patientId,
      text: body.trim(),
      values,
      notes,
      ...(candidates ? { candidates } : {}),
    });
  };
  pushSegment(null, text.slice(0, merged[0]?.start ?? text.length));
  merged.forEach((m, i) => {
    const body = text.slice(m.end, merged[i + 1]?.start ?? text.length);
    pushSegment(m.patientIds, body, m.heard, m.conflict === true, m.note);
  });
  return { segments, lastPatientId: current };
}

// ── Stato del giro ───────────────────────────────────────────────────────────────────────────

export type DraftStatus = 'bozza' | 'invio' | 'registrato' | 'errore' | 'scartato';
export interface RoundDraft {
  key: string;
  patientId: string;
  values: RoundValues;
  notes: string[];
  heard: string[];
  measuredAt: string;
  /** Stabile per la bozza: un nuovo tentativo dopo un errore non duplica la rilevazione. */
  requestId: string;
  status: DraftStatus;
  error?: string;
}
export interface RoundUnassigned {
  text: string;
  notes: string[];
  values: RoundValues;
  candidates?: string[];
}
export interface RoundState {
  startedAt: string;
  drafts: RoundDraft[];
  unassigned: RoundUnassigned[];
  lastPatientId: string | null;
  transcripts: string[];
}

export function startRound(now = new Date()): RoundState {
  return {
    startedAt: now.toISOString(),
    drafts: [],
    unassigned: [],
    lastPatientId: null,
    transcripts: [],
  };
}

const OPEN: DraftStatus[] = ['bozza', 'errore'];

export function applyDictation(
  state: RoundState,
  raw: string,
  roster: RoundPatient[],
  now = new Date(),
  newId: () => string = () => crypto.randomUUID(),
): RoundState {
  if (!raw.trim()) return state;
  const { segments, lastPatientId } = parseRoundDictation(raw, roster, state.lastPatientId);
  const drafts = state.drafts.map((d) => ({
    ...d,
    values: { ...d.values },
    notes: [...d.notes],
    heard: [...d.heard],
  }));
  const unassigned = [...state.unassigned];
  for (const s of segments) {
    if (!s.patientId) {
      unassigned.push({
        text: s.text,
        notes: s.notes,
        values: s.values,
        ...(s.candidates ? { candidates: s.candidates } : {}),
      });
      continue;
    }
    let draft = drafts.find((d) => d.patientId === s.patientId && OPEN.includes(d.status));
    if (!draft) {
      draft = {
        key: newId(),
        patientId: s.patientId,
        values: {},
        notes: [],
        heard: [],
        measuredAt: now.toISOString(),
        requestId: newId(),
        status: 'bozza',
      };
      drafts.push(draft);
    }
    for (const [k, v] of Object.entries(s.values) as Array<[RoundKey, string]>) {
      const old = draft.values[k];
      if (old && old !== v) draft.notes.push(`${ROUND_LABELS[k]} aggiornata: ${old} → ${v}`);
      draft.values[k] = v;
    }
    draft.notes.push(...s.notes);
    if (s.text) draft.heard.push(s.text);
    if (draft.status === 'errore') draft.status = 'bozza';
  }
  return {
    ...state,
    drafts,
    unassigned,
    lastPatientId,
    transcripts: [...state.transcripts, raw.trim()],
  };
}

/** Errore di formato con lo stesso controllo della pagina Parametri (null = confermabile). */
export function draftIssue(draft: RoundDraft): string | null {
  const values = draft.values as ParameterValues;
  const issue = parameterValuesIssue(values);
  if (issue) return issue.message;
  for (const [k, v] of Object.entries(draft.values) as Array<[RoundKey, string]>)
    if (v && impossible(k, v)) return `${ROUND_LABELS[k]} ${v}: valore impossibile.`;
  return null;
}

export function updateDraft(
  state: RoundState,
  key: string,
  change: Partial<Pick<RoundDraft, 'values' | 'status' | 'error' | 'patientId'>>,
): RoundState {
  return {
    ...state,
    drafts: state.drafts.map((d) => (d.key === key ? { ...d, ...change } : d)),
  };
}

export interface RoundSummary {
  registered: RoundDraft[];
  pending: RoundDraft[];
  discarded: RoundDraft[];
  unassigned: RoundUnassigned[];
}
export function roundSummary(state: RoundState): RoundSummary {
  return {
    registered: state.drafts.filter((d) => d.status === 'registrato'),
    pending: state.drafts.filter(
      (d) => d.status === 'bozza' || d.status === 'errore' || d.status === 'invio',
    ),
    discarded: state.drafts.filter((d) => d.status === 'scartato'),
    unassigned: state.unassigned,
  };
}

/** Valori della bozza nel formato della rotta dei parametri (solo campi presenti). */
export function draftRequest(draft: RoundDraft) {
  return {
    requestId: draft.requestId,
    measuredAt: draft.measuredAt,
    values: Object.fromEntries(
      Object.entries(draft.values).filter(([, v]) => typeof v === 'string' && v.trim()),
    ) as ParameterValues,
  };
}

/** L'operatore attribuisce a mano un frammento (es. cognome ambiguo) a un paziente. */
export function assignUnassigned(
  state: RoundState,
  index: number,
  patientId: string,
  now = new Date(),
  newId: () => string = () => crypto.randomUUID(),
): RoundState {
  const item = state.unassigned[index];
  if (!item) return state;
  const drafts = state.drafts.map((d) => ({ ...d, values: { ...d.values }, notes: [...d.notes] }));
  let draft = drafts.find((d) => d.patientId === patientId && OPEN.includes(d.status));
  if (!draft) {
    draft = {
      key: newId(),
      patientId,
      values: {},
      notes: [],
      heard: [],
      measuredAt: now.toISOString(),
      requestId: newId(),
      status: 'bozza',
    };
    drafts.push(draft);
  }
  for (const [k, v] of Object.entries(item.values) as Array<[RoundKey, string]>) {
    const old = draft.values[k];
    if (old && old !== v) draft.notes.push(`${ROUND_LABELS[k]} aggiornata: ${old} → ${v}`);
    draft.values[k] = v;
  }
  draft.heard = [...draft.heard, item.text];
  return {
    ...state,
    drafts,
    unassigned: state.unassigned.filter((_, i) => i !== index),
    lastPatientId: patientId,
  };
}
