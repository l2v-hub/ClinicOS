// Bug #156: turn a discharge-letter therapy TEXT block into structured, editable therapy rows —
// ONE per drug — never a single text blob. Deterministic and GENERIC (no hardcoded drug names):
// it parses the common Italian discharge prescription line shape and degrades gracefully to a
// "da_verificare" row when a prescription is incomplete. Headings and complete no-therapy
// statements are not prescriptions; callers retain the full source text for review.
// PRIVACY: this module never logs; callers must log only counts/status, not text.

import { normalizeGlucoseScaleProtocol } from '../therapies/glucose-scale.js';

export interface ParsedTherapyRow {
  farmacoNome: string; // drug name (first token), e.g. KEPPRA
  forma: string; // pharmaceutical form, e.g. "CPR RIV", "SCIR", "POLVERE"
  dosaggio: string; // strength, e.g. "500 MGR", "1GR/880UI", "10MG"
  viaSomministrazione: string; // route, e.g. OS, IM, EV
  quantita: string; // dose amount, e.g. "1 Cpr", "1/2 Dosi"
  orari: string[]; // ["08:00","20:00"]
  giorni: string[]; // ["Mar","Gio","Sab","Dom"]
  dataInizio: string; // ISO YYYY-MM-DD or ''
  classe: string; // "A", "C" or ''
  note: string; // leftover free text
  originalText: string; // source line kept verbatim (audit / operator reference)
  stato: 'ok' | 'da_verificare';
  doseMode?: 'fixed' | 'glucose_scale';
  glucoseScale?: Array<{ minMgDl: number; maxMgDl: number | null; units: number }>;
  /** Found in the document outside the therapy section: always operator-verified. */
  outsideTherapySection?: boolean;
}

const ROUTES = [
  'OS',
  'IM',
  'EV',
  'SC',
  'SL',
  'TD',
  'INAL',
  'TOP',
  'RETT',
  'OFT',
  'OTO',
  'NAS',
  'VAG',
  'IN',
];
// Bug #274: quantity units — include full Italian words (compressa/e, capsula/e, fiala/e, bustina/e,
// goccia/gocce, supposta/e) besides the abbreviated forms.
const UNITS =
  'Cpr|Cps|Cp|compress[ae]|capsul[ae]|Dosi|Dose|Fl|F|fial[ae]|Bs|Bust|bustin[ae]|ml|mL|gtt|gocce|goccia|gc|Puff|Supp|suppost[ae]|Cerotti|Cerotto';
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const ROUTE_RE = new RegExp(`\\(\\s*(${ROUTES.join('|')})\\s*\\)`, 'i');
// Bug #274: also detect the administration modality written in free text (not only the parenthesized
// code), mapping the common Italian phrasings to the normalized short route code.
const ROUTE_PHRASES: Array<[RegExp, string]> = [
  [/\b(per\s+os|per\s+bocca|via\s+orale|orale)\b/i, 'OS'],
  [/\b(endovenos[ao]|endovena|flebo|e\.\s?v\.)\b/i, 'EV'],
  [/\b(sottocutane[ao]|sottocute|s\.\s?c\.)\b/i, 'SC'],
  [/\b(intramuscolar[e]?|intramuscolo|i\.\s?m\.)\b/i, 'IM'],
  [/\b(sublinguale)\b/i, 'SL'],
  [/\b(transdermic[ao]|cerotto\s+transdermico)\b/i, 'TD'],
  [/\b(per\s+inalazione|inalatori[ao]|inalazione)\b/i, 'INAL'],
  [/\b(per\s+via\s+rettale|rettale)\b/i, 'RETT'],
  [/\b(oftalmic[ao]|collirio)\b/i, 'OFT'],
  [/\b(spray\s+nasale|nasale)\b/i, 'NAS'],
  [/\b(vaginale)\b/i, 'VAG'],
  [/\b(uso\s+topico|topic[ao]|cutane[ao])\b/i, 'TOP'],
];
/** Locate the administration route: parenthesized code first, then free-text Italian phrasing.
 *  The match position is returned too, so the caller can mark that span as "already placed"
 *  and keep it out of `note`. */
function trovaVia(text: string): { code: string; index: number; length: number } | null {
  const paren = text.match(ROUTE_RE);
  if (paren?.index != null) {
    return { code: paren[1].toUpperCase(), index: paren.index, length: paren[0].length };
  }
  for (const [re, code] of ROUTE_PHRASES) {
    const m = text.match(re);
    if (m?.index != null) return { code, index: m.index, length: m[0].length };
  }
  return null;
}

/** Detect the administration route: parenthesized code first, then free-text Italian phrasing. */
function detectRoute(text: string): string {
  return trovaVia(text)?.code ?? '';
}
// Il numero non è la coda di un decimale o di una frazione: "0,2 ML" non è la quantità "2 ML".
const QTY_RE = new RegExp(`(?<![\\d.,/])\\b(\\d+(?:\\/\\d+)?)\\s+(${UNITS})\\b`, 'i');
// Dosaggi composti restano interi: "10/10 MG", "875 + 125 MG", "5000U/0,2 ML", "0,75MG/ML",
// "100 UI /ML" (concentrazione senza numero al denominatore).
// Un numero può avere i separatori delle migliaia ("1.200.000 UI").
const NUM = String.raw`(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)`;
const DOSE_RE = new RegExp(
  String.raw`(?<![\d.,/])\b(${NUM}(?:\s?[/+]\s?${NUM})*)\s?(MGR|MCG|MG|GR|G|UI|U|ML)\b(\s?\/\s?(?:${NUM}\s?)?(?:UI|ML|MG|MGR|MCG|GR|G)\b)?`,
  'i',
);
// Unità di insulina somministrate ("10 Ui"), non seguite da "/ML" (che è la concentrazione) e non
// parte di un intervallo o di una somma ("10-12 UI", "6+6+4 U"): quelle le legge l'operatore.
const INSULIN_UNITS_RE =
  /(?<!(?:[\d.,/+\-–~]|\b(?:a|o|e|oppure|fino\s+a|max|massimo|massime|min|minimo|circa))\s*)\b(\d+(?:[.,]\d+)?)\s*(?:U\.?\s?I\.?|UI|U|unit[àa])(?![\p{L}])(?!\s?\/)/giu;
const DAY_RE = new RegExp(`\\b(${DAYS.join('|')})\\b`, 'g');

// ── Schema insulinico a fasce glicemiche ─────────────────────────────────────
// Ogni paziente ha le sue fasce: si leggono SOLO dal documento, mai valori predefiniti.
// Forme riconosciute: "4 U se glicemia tra 200-250", "150-200: 2 UI", "da 150 a 200 → 2 U",
// "> 250: 6 UI", "oltre 300 = 8 U", "< 150: 0 UI" (glicemie in mg/dL).
const GLU_UNIT = String.raw`(?:U\.?\s?I\.?|UI|U|unit[àa])(?![\p{L}])`;
const GLU_AMOUNT = String.raw`(\d+(?:[.,]\d+)?)\s*${GLU_UNIT}`;
const GLU_RANGE =
  String.raw`(?:(?:da|tra|fra)\s+)?(?<![\d:.,/])(\d{2,4})(?:\s*[-–]\s*|\s+(?:a|e)\s+)(\d{2,4})(?!\d)` +
  String.raw`|(>=|≥|>|oltre(?:\s+i)?|sopra|maggiore\s+di|superiore\s+a)\s*(\d{2,4})(?!\d)` +
  String.raw`|(<=|≤|<|sotto|inferiore\s+a|minore\s+di)\s*(\d{2,4})(?!\d)`;
const GLU_LABEL = String.raw`(?:glicemi[ae](?:\s+capillare)?\s*(?:è\s*)?)?`;
// Unità prima dell'intervallo solo con un connettore ("4 U se glicemia 200-250", "6 U tra
// 251-300"): "CLEXANE 4000 UI 10-15 gg" è una durata, non una fascia.
const GLU_UNITS_FIRST = new RegExp(
  `${GLU_AMOUNT}\\s*(?=(?:se|glicemi\\w*|tra|fra|da)\\b)(?:se\\s+(?:la\\s+)?)?${GLU_LABEL}(?:${GLU_RANGE})`,
  'giu',
);
const GLU_RANGE_FIRST = new RegExp(
  `${GLU_LABEL}(?:${GLU_RANGE})\\s*(?:mg\\s*\\/\\s*dl)?\\s*(?:[:=→]|->|=>)?\\s*${GLU_AMOUNT}`,
  'giu',
);
const MIN_GLUCOSE_MG_DL = 10; // limite inferiore del dominio di misura (glucose-scale.ts)
// Sotto questa soglia un numero non è una glicemia di riferimento ("10-15 gg", "1-2 cpr").
const MIN_PLAUSIBLE_GLUCOSE = 40;
// Altri esami con soglie e unità (eparina secondo aPTT, potassio...): non sono glicemie.
const OTHER_LAB_RE = /\b(?:aptt|inr|pt|potassi\w*|kaliemi\w*|sodi\w*|eparin\w*)\b/i;

type GlucoseRule = { minMgDl: number; maxMgDl: number | null; units: number };

/** Interval from the RANGE capture groups (closed, "> N" open-ended, "< N" from the domain floor). */
function glucoseInterval(g: Array<string | undefined>): { min: number; max: number | null } | null {
  const [closedMin, closedMax, upOp, upVal, lowOp, lowVal] = g;
  const values = [closedMin, closedMax, upVal, lowVal].filter(Boolean).map(Number);
  if (values.some((v) => v < MIN_PLAUSIBLE_GLUCOSE)) return null;
  if (closedMin && closedMax) return { min: Number(closedMin), max: Number(closedMax) };
  if (upOp && upVal) {
    const n = Number(upVal);
    return { min: upOp === '>=' || upOp === '≥' ? n : n + 1, max: null };
  }
  if (lowOp && lowVal) {
    const n = Number(lowVal);
    return { min: MIN_GLUCOSE_MG_DL, max: lowOp === '<=' || lowOp === '≤' ? n : n - 1 };
  }
  return null;
}

/** Every glucose-range → units rule in the text, with the character spans it occupies. */
export function findGlucoseRules(text: string): {
  rules: GlucoseRule[];
  spans: Array<{ index: number; length: number }>;
} {
  const found: Array<GlucoseRule & { index: number; length: number }> = [];
  const overlaps = (index: number, length: number) =>
    found.some((f) => index < f.index + f.length && f.index < index + length);
  const add = (
    index: number,
    length: number,
    interval: ReturnType<typeof glucoseInterval>,
    units: string,
  ) => {
    if (!interval || overlaps(index, length)) return;
    found.push({
      minMgDl: interval.min,
      maxMgDl: interval.max,
      units: Number(units.replace(',', '.')),
      index,
      length,
    });
  };
  // Una fascia non attraversa mai una riga: "1 U⏎181-240" sono due fasce, non una.
  // La forma tabellare (intervallo → unità) ha la precedenza.
  let offset = 0;
  for (const line of text.split('\n')) {
    if (OTHER_LAB_RE.test(line) && !/glicemi/i.test(line)) {
      offset += line.length + 1;
      continue;
    }
    for (const m of line.matchAll(GLU_RANGE_FIRST))
      add(offset + (m.index ?? 0), m[0].length, glucoseInterval(m.slice(1, 7)), m[7]);
    for (const m of line.matchAll(GLU_UNITS_FIRST))
      add(offset + (m.index ?? 0), m[0].length, glucoseInterval(m.slice(2, 8)), m[1]);
    offset += line.length + 1;
  }
  found.sort((a, b) => a.index - b.index);
  return {
    rules: found.map(({ minMgDl, maxMgDl, units }) => ({ minMgDl, maxMgDl, units })),
    spans: found.map(({ index, length }) => ({ index, length })),
  };
}

/** A line that only carries scale rules ("150-200: 2 UI", "glicemia > 250 → 6 U") continues the
 *  insulin prescription above it: on its own it has no drug and would become a nameless row. */
export function isGlucoseScaleOnlyLine(line: string): boolean {
  // Non ripulisciRiga: toglierebbe il ">" di "> 250" scambiandolo per una citazione markdown.
  const testo = line
    .trim()
    .replace(/^[-*•]\s+/, '')
    .replace(/\*\*/g, '');
  const { rules, spans } = findGlucoseRules(testo);
  if (!rules.length) return false;
  let rest = '';
  let cursor = 0;
  for (const s of spans) {
    rest += ' ' + testo.slice(cursor, s.index);
    cursor = s.index + s.length;
  }
  rest += ' ' + testo.slice(cursor);
  return !/[\p{L}\d]/u.test(
    rest.replace(/\b(?:glicemi[ae]|capillare|mg\s*\/?\s*dl|se|valori?|di|con|per|e)\b/giu, ''),
  );
}

function toIsoDate(dmy: string | undefined): string {
  const m = (dmy ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// L'elenco dei farmaci e' annunciato da una riga-titolo ("Terapia:", "Tp Domiciliare",
// "TERAPIA ALLA DIMISSIONE:", "TD:"). Quella riga NON e' un farmaco: marca l'inizio dell'elenco.
// Il riconoscimento e' strutturale, non una lista chiusa di varianti — i referti le scrivono
// tutte diverse, e ogni variante non riconosciuta diventava una riga farmaco fantasma.
const KEYWORD_TERAPIA =
  /^(terapi[ae]\b|tp\b\.?|td\b\.?|t\.\s?d\.|home therapy\b|hospital therapy\b|farmaci\b|prescrizion[ei]\b|(?:piano|schema)\s+terapeutico\b)/i;

// Parole ammesse DOPO la keyword in un titolo. Servono a distinguere "Terapia domiciliare"
// (titolo) da "Terapia con Ramipril per os" (prescrizione): scartare quest'ultima come titolo
// perderebbe un farmaco senza lasciare traccia — il fallimento peggiore possibile.
const QUALIFICATORI = new Set([
  'abituale',
  'a',
  'al',
  'alla',
  'atto',
  'attuale',
  'casa',
  'consigliata',
  'consigliate',
  'consigliato',
  'continuativa',
  'corrente',
  'corso',
  'da',
  'del',
  'della',
  'di',
  'dimissione',
  'dimissioni',
  'domiciliare',
  'domiciliari',
  'domicilio',
  'e',
  'farmacologica',
  'farmacologiche',
  'home',
  'hospital',
  'il',
  'in',
  'la',
  'praticata',
  'prescritta',
  'therapy',
  'uso',
  'assunti',
  'prescritti',
  'consigliati',
]);

/** Strip markdown/bullet/bold decorations and the trailing colon from a line. */
function ripulisciRiga(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*•>]\s+/, '')
    .replace(/\*\*/g, '')
    .trim()
    .replace(/\s*:\s*$/, '')
    .trim();
}

/** True when the line announces the drug list instead of prescribing a drug. */
export function isIntestazioneTerapia(line: string): boolean {
  const testo = ripulisciRiga(line);
  if (!testo) return false;
  const keyword = KEYWORD_TERAPIA.exec(testo);
  if (!keyword) return false;
  // Un titolo e' corto.
  if (testo.split(/\s+/).filter(Boolean).length > 8) return false;
  // Se la riga prescrive (dosaggio, quantita', via fra parentesi, orario) e' un farmaco.
  if (DOSE_RE.test(testo) || QTY_RE.test(testo) || ROUTE_RE.test(testo)) return false;
  if (/\b\d{1,2}:\d{2}\b/.test(testo)) return false;
  // Due punti finali = titolo esplicito; altrimenti dopo la keyword sono ammessi solo
  // qualificatori ("domiciliare", "alla dimissione", ...).
  if (/:$/.test(line.trim().replace(/\*\*/g, '').trim())) return true;
  return testo
    .slice(keyword[0].length)
    .split(/[\s,]+/)
    .filter(Boolean)
    .every((p) => QUALIFICATORI.has(p.toLowerCase().replace(/[.,;:]/g, '')));
}

/** Remove only a heading label before a colon, never a prescription's clock time. */
function withoutInlineTherapyLabel(line: string): string {
  const cleaned = ripulisciRiga(line);
  const colon = cleaned.indexOf(':');
  if (colon < 0) return line.trim();
  const label = cleaned.slice(0, colon).trim();
  const keyword = KEYWORD_TERAPIA.exec(label);
  if (!keyword) return line.trim();
  const qualifiers = label.slice(keyword[0].length).trim().split(/\s+/).filter(Boolean);
  if (!qualifiers.every((word) => QUALIFICATORI.has(word.toLowerCase()))) return line.trim();
  return cleaned.slice(colon + 1).trim();
}

// Anchored, complete statements only: a specific drug, exception, restriction or unfinished
// "NON" must remain a candidate for review. Absence in one line cannot suppress another drug.
const THERAPY_DESCRIPTION =
  'terapia(?:\\s+(?:farmacologica|domiciliare|in atto|in corso|alla dimissione))*';
const NO_THERAPY = new RegExp(
  `^(?:(?:il paziente|la paziente|paziente)\\s+)?(?:` +
    `non\\s+(?:assume|esegue|pratica)\\s+(?:(?:alcuna|nessuna)\\s+)?${THERAPY_DESCRIPTION}|` +
    `non\\s+in\\s+${THERAPY_DESCRIPTION}|nessuna\\s+${THERAPY_DESCRIPTION}|` +
    `${THERAPY_DESCRIPTION}\\s+(?:assente|non prescritta|non assunta))$`,
  'i',
);
// Marcatori di pagina/gruppo dell'OCR ("---", "[Lettera 2]", "Pagina 2 di 3"): non sono farmaci.
// Comprende il marcatore che la pipeline stessa inserisce fra le pagine ("--- Pagina 2/3 ---").
const PAGE_MARKER_RE =
  /^(?:-{3,}|\[[^\]]{1,80}\]|-*\s*pag(?:ina|\.)?\s*\d+(?:\s*(?:di|\/)\s*\d+)?\s*-*)$/i;

function isNonPrescription(line: string): boolean {
  const trimmed = line.trim();
  // Una riga fra parentesi quadre con una dose è una prescrizione, non un'etichetta.
  if (PAGE_MARKER_RE.test(trimmed) && !DOSE_RE.test(trimmed) && !QTY_RE.test(trimmed)) return true;
  if (isIntestazioneTerapia(line)) return true;
  const content = withoutInlineTherapyLabel(line);
  const statement = ripulisciRiga(content)
    .replace(/[.;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (
    NO_THERAPY.test(statement) ||
    (content !== line.trim() && /^(?:nessuna|assente|non prescritta)$/i.test(statement))
  );
}

/** Split a therapy text block into candidate prescription lines (headers/blank lines dropped). */
export function splitTherapyLines(text: string): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !isNonPrescription(l));
}

/** #296: split the block into paragraphs on runs of ≥1 blank line (the end-of-therapy delimiter). */
function splitTherapyParagraphs(text: string): string[][] {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) {
      if (current.length) paragraphs.push(current);
      current = [];
    } else if (!isNonPrescription(line)) {
      // L'intestazione viene scartata SENZA chiudere il paragrafo: annuncia l'elenco, non lo separa.
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current);
  return paragraphs;
}

/** #296: a paragraph "talks about drugs" when at least one line carries a structural
 *  prescription signal: strength (DOSE_RE), quantity+unit (QTY_RE), administration route,
 *  or administration times introduced by "ore". Plain clinical prose has none of these. */
function talksAboutDrugs(lines: string[]): boolean {
  return lines.some(
    (l) =>
      DOSE_RE.test(l) ||
      QTY_RE.test(l) ||
      detectRoute(l) !== '' ||
      (/\bore\b/i.test(l) && /\b\d{1,2}:\d{2}\b/.test(l)),
  );
}

// Etichetta inline: "Terapia con Ramipril ..." — l'etichetta annuncia il farmaco, non ne fa
// parte, e senza toglierla il nome del farmaco diventerebbe "TERAPIA".
const PREFISSO_TERAPIA = /^(terapi[ae]|tp\.?|td\.?|t\.\s?d\.)\s+(con|a\s+base\s+di)\s+/i;

// Fra i campi e l'orario possono restare sigle e numeri non collocati ("N/ORD", "RM", "1000"),
// non prosa: una parola con minuscole ("se pressione alta ore 08:00") è un'istruzione, non un
// elenco di orari. Le sigle tollerate rendono comunque la riga da verificare.
const SIGLA_RE = /^[\p{Lu}\p{N}/.,*+%-]+$/u;
function residuoPrimaDi(
  testo: string,
  collocato: Uint8Array,
  fine: number,
): 'nessuno' | 'sigle' | 'prosa' {
  let esito: 'nessuno' | 'sigle' = 'nessuno';
  let parola = '';
  for (let i = 0; i <= fine; i++) {
    if (i < fine && !collocato[i] && !/\s/.test(testo[i])) parola += testo[i];
    else if (parola) {
      if (/[\p{L}\p{N}]/u.test(parola)) {
        if (!SIGLA_RE.test(parola)) return 'prosa';
        esito = 'sigle';
      }
      parola = '';
    }
  }
  return esito;
}
const ora = (h: string) => (h.includes(':') ? h : `${h}:00`).padStart(5, '0');

/** Only a contiguous list next to mapped prescription fields is an administration schedule.
 *  Clinical prose before or after it stays in notes, including its own clock times/connectors. */
function trovaListaOrari(testo: string, collocato: Uint8Array, primoCampoEsplicito: number) {
  // "ORE 8-15-20": tre o più ore separate da trattini sono un elenco, non un intervallo.
  const elenco = testo.match(
    /\bore\b\s*:?\s*(\d{1,2}(?::\d{2})?(?:\s*-\s*\d{1,2}(?::\d{2})?){2,})(?![\d:])/i,
  );
  if (elenco?.index != null && elenco.index >= primoCampoEsplicito) {
    const residuo = residuoPrimaDi(testo, collocato, elenco.index);
    if (residuo === 'prosa') return null;
    const orari = elenco[1].split(/\s*-\s*/).map(ora);
    if (orari.every((o) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(o)))
      return { orari, index: elenco.index, length: elenco[0].length, daVerificare: true };
  }
  const primo = testo.match(/\b(?:alle\s+)?ore\b\s*:?\s*(\d{1,2}:\d{2})\b/i);
  // A name and an inferred form alone do not establish a prescription before the time.
  if (primo?.index == null || primo.index < primoCampoEsplicito) return null;
  const residuo = residuoPrimaDi(testo, collocato, primo.index);
  if (residuo === 'prosa') return null;

  const orari = [primo[1]];
  let fine = primo.index + primo[0].length;
  const successivo =
    /^(?:\s*[,;]\s*(?:(?:e|ed)\s+)?|\s+(?:(?:e|ed)\s+)?)(?:alle\s+)?(?:ore\b\s*:?\s*)?(\d{1,2}:\d{2})\b/i;
  for (let m = testo.slice(fine).match(successivo); m; m = testo.slice(fine).match(successivo)) {
    orari.push(m[1]);
    fine += m[0].length;
  }
  // An alternative or range is not a list of doses: retain the whole instruction for review.
  if (
    /^\s*(?:[-–—/]\s*|(?:o|oppure|a|fino\s+(?:a|alle))\s+)(?:alle\s+)?(?:ore\b\s*:?\s*)?\d{1,2}:\d{2}\b/i.test(
      testo.slice(fine),
    )
  )
    return null;
  return {
    orari,
    index: primo.index,
    length: fine - primo.index,
    daVerificare: residuo === 'sigle',
  };
}

/** Parse ONE prescription line into a structured row. Fields are extracted independently, so a
 *  malformed segment never corrupts the others; missing structure → stato 'da_verificare'.
 *  Ogni carattere collocato in un campo viene marcato: cio' che resta scoperto e' esattamente
 *  "quello che non si e' riusciti a collocare" e finisce in `note`, sotto gli occhi dell'operatore. */
export function parseTherapyLine(line: string): ParsedTherapyRow {
  const originalText = line.trim();
  // `originalText` resta verbatim per l'audit; l'estrazione lavora sulla riga senza etichetta.
  const testo = withoutInlineTherapyLabel(originalText).replace(PREFISSO_TERAPIA, '');

  const collocato = new Uint8Array(testo.length);
  const marca = (index: number | undefined | null, length: number) => {
    if (index == null || index < 0) return;
    for (let i = index; i < index + length && i < collocato.length; i++) collocato[i] = 1;
  };

  const classeM = testo.match(/\(\s*classe\s*([A-Za-z]?)\s*\)/i);
  const classe = (classeM?.[1] ?? '').toUpperCase();
  marca(classeM?.index, classeM?.[0].length ?? 0);

  const dataM = testo.match(/\bdal\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const dataInizio = toIsoDate(dataM?.[1]);
  marca(dataM?.index, dataM?.[0].length ?? 0);

  const giorni: string[] = [];
  for (const m of testo.matchAll(DAY_RE)) {
    if (!giorni.includes(m[1])) giorni.push(m[1]);
    marca(m.index, m[0].length);
  }

  const via = trovaVia(testo);
  const viaSomministrazione = via?.code ?? '';
  marca(via?.index, via?.length ?? 0);

  let qtyM: RegExpMatchArray | null = testo.match(QTY_RE);
  let quantita = qtyM ? `${qtyM[1]} ${qtyM[2]}` : '';
  marca(qtyM?.index, qtyM?.[0].length ?? 0);

  // Le unità di una fascia glicemica ("150-200: 2 UI") non sono il dosaggio del farmaco.
  const { rules: glucoseScale, spans: glucoseSpans } = findGlucoseRules(testo);
  const inGlucoseSpan = (index: number) =>
    glucoseSpans.some((s) => index >= s.index && index < s.index + s.length);
  const dosi = [...testo.matchAll(new RegExp(DOSE_RE.source, 'gi'))].filter(
    (m) => m.index != null && !inGlucoseSpan(m.index),
  );
  // Un volume semplice seguito da un altro dosaggio è la confezione ("FL 20ML 0,75MG/ML",
  // "SCIR 200ML 67G/100ML", "1 FL 10 ML 100 UI/ML"): il dosaggio è quello successivo.
  const soloVolume = (m: RegExpMatchArray) => /^ml$/i.test(m[2]) && !m[3] && !/[/+]/.test(m[1]);
  const doseM = dosi.find((m, i) => !(soloVolume(m) && i < dosi.length - 1)) ?? null;
  // La lettura della confezione è un'interpretazione: la riga la conferma l'operatore.
  const confezioneScavalcata = doseM !== null && doseM !== dosi[0];
  const dosaggio = doseM ? doseM[0].replace(/\s+/g, ' ').trim() : '';
  marca(doseM?.index, doseM?.[0].length ?? 0);
  // Insulina con concentrazione ("100 UI /ML 10 Ui"): le unità dopo la concentrazione sono la
  // quantità somministrata.
  // Un volume prima della concentrazione è la penna/il flacone ("LANTUS 3 ML 100 UI/ML 10 UI").
  const volumePenna =
    qtyM?.index != null &&
    doseM?.index != null &&
    /^ml$/i.test(qtyM[2]) &&
    qtyM.index < doseM.index;
  let pennaScavalcata = false;
  if (
    (!qtyM || volumePenna) &&
    doseM?.index != null &&
    /\//.test(doseM[0]) &&
    /^U/i.test(doseM[2])
  ) {
    const dopo = doseM.index + doseM[0].length;
    const unita = [...testo.matchAll(INSULIN_UNITS_RE)].find(
      (m) => m.index != null && m.index >= dopo && !inGlucoseSpan(m.index),
    );
    if (unita) {
      pennaScavalcata = volumePenna;
      qtyM = unita;
      quantita = `${unita[1]} UI`;
      marca(unita.index, unita[0].length);
    }
  }
  for (const span of glucoseSpans) marca(span.index, span.length);
  const doseMode = glucoseScale.length > 0 ? ('glucose_scale' as const) : ('fixed' as const);
  let normalizedGlucoseScale = glucoseScale;
  let glucoseScaleValid = true;
  if (glucoseScale.length) {
    try {
      normalizedGlucoseScale = normalizeGlucoseScaleProtocol({
        kind: 'blood_glucose',
        measurementUnit: 'mg/dL',
        doseUnit: 'unità',
        rules: glucoseScale,
      }).rules;
    } catch {
      glucoseScaleValid = false;
    }
  }

  const nomeGrezzo = testo.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.-]*)/)?.[1] ?? '';
  const farmacoNome = nomeGrezzo.toUpperCase();
  marca(0, nomeGrezzo.length);

  // forma = testo fra il nome e il primo marcatore strutturale, ma al massimo 3 parole. Senza
  // il limite assorbiva l'intera riga quando i marcatori mancavano, e cio' che non era
  // collocabile spariva dentro `forma` invece di arrivare all'operatore.
  const dopoNome = testo.slice(nomeGrezzo.length);
  const marcatori = [
    dopoNome.search(ROUTE_RE),
    doseM ? dopoNome.indexOf(doseM[0]) : -1,
    qtyM ? dopoNome.indexOf(qtyM[0]) : -1,
    dopoNome.search(/\b(?:alle\s+)?ore\b/i),
    // Una forma farmaceutica non contiene separatori di elenco: da li' in poi la riga sta
    // parlando d'altro, tipicamente di un secondo farmaco. Senza questo taglio
    // "Eutirox, Omeprazolo e Ramipril 1 cpr" finiva con "Omeprazolo" dentro `forma` — un nome
    // di farmaco nel campo forma e' un dato errato, e il secondo farmaco non compariva in
    // `note`, dove l'operatore lo cerca. La virgola decimale ("2,5 mg") e' esclusa: fa parte
    // di un numero, non separa un elenco.
    dopoNome.search(/[;+]|,(?!\d)/),
  ].filter((i) => i >= 0);
  const taglio = marcatori.length ? Math.min(...marcatori) : dopoNome.length;
  // Un numero nudo non è una forma ("TACHIPIRINA 1000 1 CP"): resta in note, da verificare.
  const paroleForma: RegExpMatchArray[] = [];
  for (const p of dopoNome.slice(0, taglio).matchAll(/\S+/g)) {
    if (paroleForma.length === 3 || /^\d[\d.,]*$/.test(p[0])) break;
    paroleForma.push(p);
  }
  for (const p of paroleForma) marca(nomeGrezzo.length + (p.index ?? 0), p[0].length);
  const forma = paroleForma
    .map((p) => p[0])
    .join(' ')
    .replace(/[*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const listaOrari = trovaListaOrari(
    testo,
    collocato,
    Math.min(qtyM?.index ?? Infinity, doseM?.index ?? Infinity, via?.index ?? Infinity),
  );
  const orari = listaOrari?.orari ?? [];
  marca(listaOrari?.index, listaOrari?.length ?? 0);

  const frammenti: string[] = [];
  let corrente = '';
  for (let i = 0; i < testo.length; i++) {
    if (collocato[i]) {
      if (corrente.trim()) frammenti.push(corrente.trim());
      corrente = '';
    } else corrente += testo[i];
  }
  if (corrente.trim()) frammenti.push(corrente.trim());
  const note = frammenti
    .join(' ')
    .replace(/[()*]/g, ' ')
    .replace(/(^|\s)[-,.;:/]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // A line is "ok" when it has a name AND at least two structured signals; otherwise operator-verify.
  // Bug #274: the administration route (via) counts as a structured signal too.
  const signals = [
    dosaggio,
    orari.length ? 'x' : '',
    quantita,
    dataInizio,
    viaSomministrazione,
    glucoseScale.length ? 'schema' : '',
  ].filter(Boolean).length;
  // Un numero rimasto fuori da ogni campo (una concentrazione, una posologia) e' clinicamente
  // rilevante: la riga va rivista anche quando il resto e' ben formato.
  const residuoNumerico = /\d/.test(note);
  // A retained negative instruction is not an affirmed prescription, even with dose/route.
  const negativeInstruction = /^(?:non|nessuna|nessun)\b/i.test(testo);
  // Sospensione, negazione o condizione in qualunque punto della riga (anche finita in `forma` o
  // dopo gli orari: "ore 22:00 NON SOMMINISTRARE", "SE AGITAZIONE", "ai pasti"): non è una
  // prescrizione a orario fisso finché l'operatore non la legge.
  const condizionata =
    NOT_CURRENT_RE.test(testo) ||
    /\b(?:se|solo|non|al\s+bisogno|ai\s+pasti|secondo)\b/i.test(`${note} ${forma}`);
  const stato: ParsedTherapyRow['stato'] =
    farmacoNome &&
    signals >= 2 &&
    !residuoNumerico &&
    !listaOrari?.daVerificare &&
    !confezioneScavalcata &&
    !pennaScavalcata &&
    // "1.000 MG": il punto delle migliaia letto come decimale darebbe 1 mg — lo conferma l'operatore.
    !/\d\.\d{3}(?!\d)/.test(`${dosaggio} ${quantita}`) &&
    !condizionata &&
    !negativeInstruction &&
    glucoseScaleValid &&
    (doseMode === 'fixed' || orari.length > 0)
      ? 'ok'
      : 'da_verificare';

  return {
    farmacoNome,
    forma,
    dosaggio,
    viaSomministrazione,
    quantita,
    orari,
    giorni,
    dataInizio,
    classe,
    note,
    originalText,
    stato,
    doseMode,
    ...(glucoseScale.length ? { glucoseScale: normalizedGlucoseScale } : {}),
  };
}

/** Parse a whole therapy text block into structured rows (one per prescription).
 *  #296: once drug content has been seen, a blank-line-separated paragraph WITHOUT drug signals
 *  (advice / clinical prose) yields no rows. It is skipped, not a terminator: a prescription
 *  after a page break or a note paragraph is still a prescription (2026-10-11).
 *  Lines inside a drug paragraph are never dropped (da_verificare on missing structure).
 *  Scale-only lines ("150-200: 2 UI") extend the prescription above them: one insulin row
 *  carries the whole patient-specific glucose scale. */
// Solo una prescrizione che annuncia uno schema glicemico può ricevere le righe di fasce che la
// seguono: "METFORMINA ... ore 08:00" seguita da "150-200: 2 UI" non diventa insulina, e una
// basale a dose fissa ("LANTUS 14 UI ore 22:00") non eredita la scala correttiva successiva.
const ANNOUNCES_GLUCOSE_SCALE_RE =
  /\b(?:schema|scala|glicemi\w*|stick|dtx|destrostix)\b|\binsulin\w*\b.*(?:[:→]|->)\s*$/i;

// Indicazioni non farmacologiche scritte in coda all'elenco ("DIETA PER DIABETICI", "Controlli
// periodici di emocromo"): senza dose né quantità non sono farmaci.
// Elenco stretto: una riga che nomina anche un farmaco ("Monitoraggio glicemico e Humalog
// secondo schema") resta una riga da verificare.
const NON_DRUG_LINE_RE = /^(?:controll[oi]|esami|vaccin\w*|fisioterapia)\b/i;
export function isNonDrugInstruction(line: string): boolean {
  const testo = ripulisciRiga(line);
  // "DIETA IPOSODICA 1500 ML/DIE": un volume di dieta non è un farmaco.
  if (/^dieta\b/i.test(testo)) return true;
  return NON_DRUG_LINE_RE.test(testo) && !DOSE_RE.test(testo) && !QTY_RE.test(testo);
}

/** A line carrying any prescription signal: strength, quantity, route, "ore hh:mm" or a glucose
 *  band. Prose, signatures and measurements without a dose carry none. */
export function hasPrescriptionSignal(line: string): boolean {
  const testo = ripulisciRiga(line);
  return talksAboutDrugs([testo]) || isGlucoseScaleOnlyLine(line);
}

/** A self-contained prescription line (name + strength or quantity + administration time or
 *  periodicity): marks a drug list even where no therapy heading announces it. */
export function looksLikePrescriptionLine(line: string): boolean {
  const testo = ripulisciRiga(line);
  if (!testo || isNonPrescription(testo) || NOT_CURRENT_RE.test(testo)) return false;
  // Il nome apre la riga e tocca quasi subito la dose: "Gentile Collega, ... Ramipril 5 mg/die"
  // è prosa, "GLICEMIA 150 MG/DL" è una misura.
  const dose = testo.match(DOSE_RE) ?? testo.match(QTY_RE);
  if (dose?.index == null) return false;
  const prima = testo.slice(0, dose.index);
  if (/,/.test(prima) || prima.trim().split(/\s+/).length > 5) return false;
  if (/^\s*\/\s*(?:dl|l|h|kg|min)\b/i.test(testo.slice(dose.index + dose[0].length))) return false;
  const row = parseTherapyLine(testo);
  const nome = row.farmacoNome.toLowerCase();
  if (PROSE_WORDS.has(nome) || LAB_WORDS.has(nome)) return false;
  return (
    /^[\p{L}]{3,}/u.test(row.farmacoNome) &&
    Boolean(row.dosaggio || row.quantita) &&
    (row.orari.length > 0 || row.doseMode === 'glucose_scale' || PERIODICITY_RE.test(testo))
  );
}

export function parseDischargeTherapy(text: string): ParsedTherapyRow[] {
  const rows: ParsedTherapyRow[] = [];
  let sawDrugs = false;
  let previousWasRow = false;
  for (const lines of splitTherapyParagraphs(text)) {
    const isDrugParagraph = talksAboutDrugs(lines);
    if (sawDrugs && !isDrugParagraph) {
      previousWasRow = false;
      continue;
    }
    for (const line of lines) {
      // Saltata senza interrompere l'elenco: le fasce sotto restano dell'insulina sopra.
      if (isNonDrugInstruction(line)) continue;
      const last = rows[rows.length - 1];
      if (
        previousWasRow &&
        last &&
        ANNOUNCES_GLUCOSE_SCALE_RE.test(last.originalText) &&
        isGlucoseScaleOnlyLine(line)
      ) {
        // Fasce lette da righe diverse: l'associazione al farmaco la conferma l'operatore.
        rows[rows.length - 1] = {
          ...parseTherapyLine(`${last.originalText}\n${line}`),
          stato: 'da_verificare',
        };
      } else rows.push(parseTherapyLine(line));
      previousWasRow = true;
    }
    if (isDrugParagraph) sawDrugs = true;
  }
  return rows;
}

// ── Prescrizioni fuori dalla sezione terapia ─────────────────────────────────
// Farmaco + dose + periodicità è una terapia in qualunque punto del documento si trovi (decorso,
// anamnesi, consigli, altra pagina). Fuori dalla sezione terapia la riga entra SEMPRE come
// da_verificare (decisione utente 2026-10-11): un farmaco citato nel decorso può essere
// stato sospeso, e solo l'operatore può confermarlo.
const PERIODICITY_RE =
  /(?:\bore\s+\d{1,2}[:.]\d{2}|\b\d+\s*volt[ae]\s+(?:al|a|alla|ogni)\s+(?:giorno|d[iì]|settimana)|\/\s*die\b|\bx\s*\d\b|\b\d\s*x\s*\d\b|\bdie\b|\bal\s+giorno\b|\bal\s+d[iì]\b|\b(?:bid|tid|qid)\b|\bogni\s+\d+\s+(?:ore|giorni)\b|\b\d\s*-\s*\d\s*-\s*\d\b|\b(?:al\s+)?mattin[oa]\b|\b(?:la\s+)?sera\b|\b(?:a\s+)?(?:pranzo|cena|colazione)\b|\bai\s+pasti\b|\bal\s+bisogno\b|\bgiorni\s+alterni\b|\bsettimanal\w*\b|\b(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)/i;
// Farmaci sospesi, vietati o del passato: non sono terapia in corso.
const NOT_CURRENT_RE =
  /\b(?:sospes[oaie]|sospender\w*|sospensione|interrott\w*|allergi\w*|intolleran\w*|evitar\w*|evitando|controindicat\w*|pregress\w*|precedent\w*|in\s+passato|stop|non\s+(?:assumere|assume|somministrare|prescrivere|usare|utilizzare|riprendere))\b/i;
// Prosa che precede il nome del farmaco in una frase ("Il paziente assume Ramipril 5 mg ...").
const PROSE_WORDS = new Set([
  'il',
  'la',
  'lo',
  'i',
  'gli',
  'le',
  'paziente',
  'pz',
  'assume',
  'assumeva',
  'prosegue',
  'proseguire',
  'prosegua',
  'continua',
  'continuare',
  'iniziata',
  'iniziato',
  'avviata',
  'avviato',
  'introdotta',
  'introdotto',
  'aggiunta',
  'aggiunto',
  'in',
  'con',
  'terapia',
  'tp',
  'si',
  'ha',
  'è',
  'e',
  'di',
  'a',
  'al',
  'per',
  'domiciliare',
  'somministrata',
  'somministrato',
  'prescritta',
  'prescritto',
]);

function sentencesOf(text: string): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .flatMap((l) => l.split(/(?<=[.;])\s+(?=[A-ZÀ-Ý])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

// Valori misurati, non farmaci: "Diuresi 1500 ml/die", "Glicemia 250 mg/dl al mattino".
const LAB_WORDS = new Set([
  'diuresi',
  'glicemia',
  'glicemie',
  'proteinuria',
  'creatinina',
  'creatininemia',
  'emoglobina',
  'hb',
  'hba1c',
  'pressione',
  'pa',
  'fc',
  'sat',
  'spo2',
  'temperatura',
  'peso',
  'colesterolo',
  'ldl',
  'hdl',
  'trigliceridi',
  'azotemia',
  'sodiemia',
  'kaliemia',
  'potassiemia',
  'inr',
  'pcr',
  'ves',
  'albumina',
  'introito',
  'idratazione',
]);
// Forme farmaceutiche scritte fra il nome e la dose.
const FORM_WORDS = new Set([
  'cpr',
  'cp',
  'cps',
  'compresse',
  'compressa',
  'capsule',
  'capsula',
  'fl',
  'fiale',
  'fiala',
  'gtt',
  'gocce',
  'bust',
  'bustine',
  'bustina',
  'scir',
  'sciroppo',
  'sol',
  'soluzione',
  'riv',
  'rp',
  'ev',
  'im',
  'sc',
  'os',
  'penna',
  'flacone',
]);
// Primo termine di un nome composto: "Acido acetilsalicilico", "Calcio carbonato".
const DRUG_NAME_PREFIX = /^(?:acido|calcio|ferro|vitamina|insulina|sodio|magnesio|potassio)$/i;

/** The prescription inside a prose sentence, starting at the drug name: the word right before
 *  the dose (plus a compound-name prefix), never the sentence's first word ("Durante la degenza
 *  ..."). Null when the sentence has no dose/periodicity/name, or the "dose" is a measurement. */
function prescriptionInSentence(sentence: string): string | null {
  if (NOT_CURRENT_RE.test(sentence) || !PERIODICITY_RE.test(sentence)) return null;
  const dose = sentence.match(DOSE_RE) ?? sentence.match(QTY_RE);
  if (dose?.index == null) return null;
  // "mg/dl", "ml/h", "g/24h": una misura, non una dose.
  if (/^\s*\/\s*(?:dl|l|h|24\s*h|kg|min)\b/i.test(sentence.slice(dose.index + dose[0].length)))
    return null;
  const before = sentence.slice(0, dose.index);
  const words = [...before.matchAll(/[\p{L}][\p{L}\p{N}.*-]*/gu)];
  // Il nome deve toccare la dose: "Furosemide 25 mg", non "Furosemide per edemi 25 mg".
  const lastWordMatch = words[words.length - 1];
  if (
    lastWordMatch?.index == null ||
    before.slice(lastWordMatch.index + lastWordMatch[0].length).trim()
  )
    return null;
  // La forma farmaceutica fra nome e dose non è il nome: "Lansoprazolo cps 30 mg".
  let k = words.length - 1;
  while (k > 0 && FORM_WORDS.has(words[k][0].toLowerCase().replace(/\.$/, ''))) k--;
  const last = words[k];
  if (last?.index == null) return null;
  const lastWord = last[0].toLowerCase();
  if (PROSE_WORDS.has(lastWord) || LAB_WORDS.has(lastWord) || FORM_WORDS.has(lastWord)) return null;
  const previous = words[k - 1];
  const start =
    previous?.index != null &&
    DRUG_NAME_PREFIX.test(previous[0]) &&
    !before.slice(previous.index + previous[0].length, last.index).trim()
      ? previous.index
      : last.index;
  return sentence.slice(start).trim();
}

/** Narrative sections other than therapy, where a prescription may still be written. */
const NON_THERAPY_SECTIONS = [
  'diagnosisText',
  'anamnesisText',
  'hospitalCourseText',
  'consultationsText',
  'proceduresAndInterventionsText',
  'adviceAndFollowUpText',
  'unmappedText',
] as const;

/** Calendar day of the clinic (Europe/Rome) — the server runs in UTC. */
export function clinicIsoDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Section rows plus the prescriptions written elsewhere in the same document.
 *  A row without an explicit "dal …" starts on the day the document is processed (2026-10-11):
 *  that is when the ward takes the therapy over. Applied after parsing on purpose — inside the
 *  parser a date counts as a structural signal and would promote incomplete rows to 'ok'. */
export function therapyRowsFromNarrative(
  narrative: Record<string, unknown>,
  processingDate: string = clinicIsoDate(),
): ParsedTherapyRow[] {
  const section = parseDischargeTherapy(String(narrative.therapyText ?? ''));
  const texts = NON_THERAPY_SECTIONS.map((k) => narrative[k]).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return [...section, ...therapyRowsOutsideSection(texts, section)].map((row) =>
    row.dataInizio ? row : { ...row, dataInizio: processingDate },
  );
}

/** Prescriptions found in document text OUTSIDE the therapy section. Drugs already present in
 *  `known` (section rows) are not repeated; every row is da_verificare with its source sentence. */
export function therapyRowsOutsideSection(
  texts: string[],
  known: ParsedTherapyRow[] = [],
): ParsedTherapyRow[] {
  const seen = new Set(known.map((r) => r.farmacoNome).filter(Boolean));
  const rows: ParsedTherapyRow[] = [];
  for (const sentence of texts.flatMap(sentencesOf)) {
    if (isNonPrescription(sentence)) continue;
    const prescription = prescriptionInSentence(sentence);
    if (!prescription) continue;
    const row = parseTherapyLine(prescription);
    if (!row.farmacoNome || seen.has(row.farmacoNome)) continue;
    seen.add(row.farmacoNome);
    rows.push({
      ...row,
      originalText: sentence,
      // La provenienza viaggia nel flag, non nelle note cliniche (che finirebbero sulla terapia).
      stato: 'da_verificare',
      outsideTherapySection: true,
    });
  }
  return rows;
}

/** Map days (Italian abbreviations) to the PatientTherapy weekly "fasce" booleans is intentionally
 *  NOT done here (fasce are time-of-day, not weekdays). Weekday scheduling is carried on the row's
 *  `giorni`; the confirm layer decides persistence. Kept separate to avoid a lossy mapping. */
