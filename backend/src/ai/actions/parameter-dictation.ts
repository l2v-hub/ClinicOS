// Milo, registrazione di più parametri in un solo comando («registra pressione 130 su 80, ha
// evacuato, stato vigile, battito 78»). Parser DETERMINISTICO, nessun modello: stesse regole del giro
// visita a voce (frontend `lib/wardRound.ts`), più evacuazione e parametri nominati senza valore.
// Non indovina mai: un valore impossibile o mancante diventa un problema che blocca la conferma.

import type { ParameterValues } from '../../patients/parameter-reading-input.js';

export type DictationKey =
  'pa' | 'spo2' | 'fc' | 'fr' | 'temperatura' | 'dtx' | 'o2' | 'coscienza' | 'evacuazione';
export const DICTATION_KEYS: readonly DictationKey[] = [
  'pa',
  'fc',
  'spo2',
  'fr',
  'temperatura',
  'dtx',
  'o2',
  'coscienza',
  'evacuazione',
];
export const DICTATION_LABELS: Record<DictationKey, string> = {
  pa: 'Pressione',
  spo2: 'Saturazione',
  fc: 'Frequenza cardiaca',
  fr: 'Frequenza respiratoria',
  temperatura: 'Temperatura',
  dtx: 'Glicemia',
  o2: 'Ossigeno',
  coscienza: 'Coscienza',
  evacuazione: 'Evacuazione',
};
export const DICTATION_UNITS: Partial<Record<DictationKey, string>> = {
  pa: 'mmHg',
  spo2: '%',
  fc: 'bpm',
  fr: 'atti/min',
  temperatura: '°C',
  dtx: 'mg/dL',
};
const ACVPU_LABEL: Record<string, string> = {
  A: 'Vigile (A)',
  C: 'Confusione (C)',
  V: 'Risponde alla voce (V)',
  P: 'Risponde al dolore (P)',
  U: 'Non risponde (U)',
};

/** Valore come lo legge l'operatore nell'anteprima. */
export function shownValue(key: DictationKey, value: string): string {
  if (key === 'coscienza') return ACVPU_LABEL[value] ?? value;
  if (key === 'o2') return value === 'si' ? 'Sì, in ossigeno' : 'No, in aria ambiente';
  const unit = DICTATION_UNITS[key];
  return unit ? `${value} ${unit}` : value;
}

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
  return (text || '')
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

// ── Parametri ────────────────────────────────────────────────────────────────────────────────

const FILL = '(?: (?:a|di|al|e|pari a|uguale a|valore|di valore|era|risulta))*';
const LABELS: Record<Exclude<DictationKey, 'o2' | 'coscienza' | 'evacuazione'>, string> = {
  pa: 'pressione arteriosa|pressione|pa|p a',
  fr: 'frequenza respiratoria|respiratoria|atti respiratori|respiri|fr|f r',
  fc: 'frequenza cardiaca|battito cardiaco|frequenza|polso|battito|battiti|fc|f c',
  spo2: 'saturazione|saturimetria|satura|sat|spo2|sp o2|ossimetria',
  temperatura: 'temperatura corporea|temperatura|temp|febbre|tc|t c',
  dtx: 'glicemia capillare|glicemia|destrostix|destro|dextro|dtx|stick',
};
const withValue = (words: string, value: string) =>
  new RegExp(`(?:^| )(?:${words})${FILL} ${value}`, 'g');
const PATTERNS: Array<{
  key: keyof typeof LABELS;
  re: RegExp;
  read: (m: string[]) => string;
}> = [
  {
    key: 'pa',
    re: withValue(LABELS.pa, '(\\d{2,3}) ?(?:/|su|e|-) ?(\\d{2,4})(?!\\d)'),
    read: (m) => `${m[1]}/${m[2]}`,
  },
  { key: 'fr', re: withValue(LABELS.fr, '(\\d{1,3})(?![\\d/]| /)'), read: (m) => m[1] },
  { key: 'fc', re: withValue(LABELS.fc, '(\\d{2,3})(?![\\d/]| /)'), read: (m) => m[1] },
  { key: 'spo2', re: withValue(LABELS.spo2, '(\\d{2,3})'), read: (m) => m[1] },
  {
    key: 'temperatura',
    re: withValue(
      LABELS.temperatura,
      '(\\d{2,3})(?:(?:,| e | virgola | punto )(\\d)(?!\\d))?(?![\\d/])',
    ),
    read: (m) => (m[2] ? `${m[1]}.${m[2]}` : m[1]),
  },
  { key: 'dtx', re: withValue(LABELS.dtx, '(\\d{2,3})'), read: (m) => m[1] },
];
const O2_NO = /(?:^| )(?:in aria ambiente|aria ambiente|in aria|senza ossigeno|in aa)(?= |$)/;
const O2_YES =
  /(?:^| )(?:in ossigeno|con ossigeno|ossigenoterapia|ossigeno \d+|o2 \d+|occhialini|maschera|venturi)(?= |$)/;
const ACVPU: Array<[string, RegExp]> = [
  ['U', /(?:^| )(?:non risponde|incoscient[ea]|non responsiv[oa])(?= |$)/],
  ['P', /(?:^| )(?:risponde al dolore|risponde dolore|risposta al dolore)(?= |$)/],
  ['V', /(?:^| )(?:risponde alla voce|risponde voce|risposta alla voce)(?= |$)/],
  ['C', /(?:^| )(?:confus[oa]|disorientat[oa]|nuova confusione)(?= |$)/],
  ['A', /(?:^| )(?:vigile|sveglia|sveglio|orientat[oa]|allert[oa]|lucid[oa]|coscienza a)(?= |$)/],
];
// «non ha evacuato» va letto prima di «ha evacuato».
const EVAC_NO =
  /(?:^| )(?:non ha evacuato|non evacua|non e andat[oa] di corpo|non si e scaricat[oa]|alvo chiuso|nessuna evacuazione|evacuazione no|evacuazione assente)(?= |$)/;
const EVAC_YES =
  /(?:^| )(?:ha evacuato|evacuato|evacuata|e andat[oa] di corpo|si e scaricat[oa]|alvo aperto|evacuazione si|evacuazione presente|evacuazione avvenuta)(?= |$)/;
// Parole che nominano un parametro: se restano dopo aver letto i valori, il valore manca.
const MENTIONS: Array<[DictationKey, RegExp]> = [
  ['pa', /(?:^| )(?:pressione|pa)(?= |$)/],
  ['fr', /(?:^| )(?:frequenza respiratoria|respiri|fr)(?= |$)/],
  ['fc', /(?:^| )(?:frequenza cardiaca|battito|battiti|polso|fc)(?= |$)/],
  ['spo2', /(?:^| )(?:saturazione|saturimetria|spo2)(?= |$)/],
  ['temperatura', /(?:^| )(?:temperatura|febbre)(?= |$)/],
  ['dtx', /(?:^| )(?:glicemia|dtx)(?= |$)/],
  ['evacuazione', /(?:^| )(?:evacuazione|alvo)(?= |$)/],
  ['coscienza', /(?:^| )(?:coscienza|stato di coscienza)(?= |$)/],
];

/** Valori fisiologicamente impossibili: mai salvati, mai corretti (stessi limiti della pagina). */
function impossible(key: DictationKey, value: string): boolean {
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

export interface DictatedParameters {
  values: ParameterValues;
  /** Parametri riconosciuti (con o senza valore), nell'ordine della pagina. */
  mentioned: DictationKey[];
  /** Problemi che BLOCCANO la conferma: valore mancante, impossibile o contraddittorio. */
  problems: string[];
  /** Avvisi che non bloccano (più valori dettati per lo stesso parametro). */
  notes: string[];
}

export function parseDictatedParameters(raw: string): DictatedParameters {
  const values: ParameterValues = {};
  const problems: string[] = [];
  const notes: string[] = [];
  const mentioned = new Set<DictationKey>();
  let rest = ` ${normalizeDictation(raw)} `;
  const blank = (re: RegExp) => {
    rest = rest.replace(re, (m) => ' '.repeat(m.length));
  };

  for (const { key, re, read } of PATTERNS) {
    re.lastIndex = 0;
    const found: string[] = [];
    rest = rest.replace(re, (...args) => {
      found.push(read(args.slice(0, -2) as string[]));
      return ' '.repeat(String(args[0]).length); // la stessa parola non vale per due parametri
    });
    if (!found.length) continue;
    mentioned.add(key);
    for (const v of found)
      if (impossible(key, v))
        problems.push(`${DICTATION_LABELS[key]} ${v}: valore impossibile, ricontrolla`);
    const ok = found.filter((v) => !impossible(key, v));
    if (ok.length) values[key] = ok[ok.length - 1];
    if (new Set(ok).size > 1)
      notes.push(`${DICTATION_LABELS[key]}: più valori dettati, tenuto ${ok[ok.length - 1]}`);
  }

  const evacNo = EVAC_NO.test(rest);
  blank(new RegExp(EVAC_NO.source, 'g'));
  const evacYes = EVAC_YES.test(rest);
  blank(new RegExp(EVAC_YES.source, 'g'));
  if (evacNo || evacYes) mentioned.add('evacuazione');
  if (evacNo && evacYes) problems.push('Evacuazione: detto sia sì sia no, scegli tu');
  else if (evacNo || evacYes) values.evacuazione = evacYes ? 'Sì' : 'No';

  const o2No = O2_NO.test(rest);
  const o2Yes = O2_YES.test(rest);
  if (o2No || o2Yes) mentioned.add('o2');
  if (o2No && o2Yes) problems.push('Ossigeno: detto sia «in aria» sia «in ossigeno», scegli tu');
  else if (o2No || o2Yes) values.o2 = o2Yes ? 'si' : 'no';

  const levels = ACVPU.filter(([, re]) => re.test(rest)).map(([level]) => level);
  if (levels.length) mentioned.add('coscienza');
  if (levels.length === 1) values.coscienza = levels[0];
  else if (levels.length > 1)
    problems.push(`Coscienza: livelli diversi (${levels.join(', ')}), scegli tu`);
  for (const [, re] of ACVPU) blank(new RegExp(re.source, 'g'));

  for (const [key, re] of MENTIONS) {
    if (values[key] !== undefined || !re.test(rest)) continue;
    if (problems.some((p) => p.startsWith(DICTATION_LABELS[key]))) continue;
    mentioned.add(key);
    problems.push(`${DICTATION_LABELS[key]}: manca il valore`);
  }

  return {
    values,
    mentioned: DICTATION_KEYS.filter((k) => mentioned.has(k)),
    problems,
    notes,
  };
}
