// Bug #156: turn a discharge-letter therapy TEXT block into structured, editable therapy rows —
// ONE per drug — never a single text blob. Deterministic and GENERIC (no hardcoded drug names):
// it parses the common Italian discharge prescription line shape and degrades gracefully to a
// "da_verificare" row when a line is incomplete (a line is never dropped, and the original text is
// always preserved). PRIVACY: this module never logs; callers must log only counts/status, not text.

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
  'Cpr|Cps|Cp|compress[ae]|capsul[ae]|Dosi|Dose|Fl|fial[ae]|Bs|Bust|bustin[ae]|ml|mL|gtt|gocce|goccia|gc|Puff|Supp|suppost[ae]|Cerotti|Cerotto';
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
const QTY_RE = new RegExp(`\\b(\\d+(?:\\/\\d+)?)\\s+(${UNITS})\\b`, 'i');
const DOSE_RE =
  /\b(\d+(?:[.,]\d+)?)\s?(MGR|MCG|MG|GR|G|UI|ML)\b(\s?\/\s?\d+(?:[.,]\d+)?\s?(?:UI|ML|MG|MGR|MCG|GR|G))?/i;
const DAY_RE = new RegExp(`\\b(${DAYS.join('|')})\\b`, 'g');

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
  /^(terapi[ae]\b|tp\b\.?|td\b\.?|t\.\s?d\.|home therapy\b|hospital therapy\b)/i;

// Parole ammesse DOPO la keyword in un titolo. Servono a distinguere "Terapia domiciliare"
// (titolo) da "Terapia con Ramipril per os" (prescrizione): scartare quest'ultima come titolo
// perderebbe un farmaco senza lasciare traccia — il fallimento peggiore possibile.
const QUALIFICATORI = new Set([
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

/** Split a therapy text block into candidate prescription lines (headers/blank lines dropped). */
export function splitTherapyLines(text: string): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !isIntestazioneTerapia(l));
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
    } else if (!isIntestazioneTerapia(line)) {
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

// Connettori senza valore clinico: si tolgono dal residuo, altrimenti sporcherebbero le Note.
// "al", "prima", "dopo" NON sono qui: "al mattino" e' posologia e all'operatore serve vederla.
const CONNETTORI = /\b(e|ed|alle|ore)\b/gi;

/** Parse ONE prescription line into a structured row. Fields are extracted independently, so a
 *  malformed segment never corrupts the others; missing structure → stato 'da_verificare'.
 *  Ogni carattere collocato in un campo viene marcato: cio' che resta scoperto e' esattamente
 *  "quello che non si e' riusciti a collocare" e finisce in `note`, sotto gli occhi dell'operatore. */
export function parseTherapyLine(line: string): ParsedTherapyRow {
  const originalText = line.trim();
  // `originalText` resta verbatim per l'audit; l'estrazione lavora sulla riga senza etichetta.
  const testo = originalText.replace(PREFISSO_TERAPIA, '');

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

  const oreIdx = testo.search(/\bore\b/i);
  const orari: string[] = [];
  if (oreIdx >= 0) {
    for (const m of testo.slice(oreIdx).matchAll(/\b(\d{1,2}:\d{2})\b/g)) {
      orari.push(m[1]);
      marca(oreIdx + (m.index ?? 0), m[0].length);
    }
  }

  const via = trovaVia(testo);
  const viaSomministrazione = via?.code ?? '';
  marca(via?.index, via?.length ?? 0);

  const qtyM = testo.match(QTY_RE);
  const quantita = qtyM ? `${qtyM[1]} ${qtyM[2]}` : '';
  marca(qtyM?.index, qtyM?.[0].length ?? 0);

  const doseM = testo.match(DOSE_RE);
  const dosaggio = doseM ? doseM[0].replace(/\s+/g, ' ').trim() : '';
  marca(doseM?.index, doseM?.[0].length ?? 0);

  const nomeGrezzo = testo.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.\-]*)/)?.[1] ?? '';
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
  ].filter((i) => i >= 0);
  const taglio = marcatori.length ? Math.min(...marcatori) : dopoNome.length;
  const paroleForma = [...dopoNome.slice(0, taglio).matchAll(/\S+/g)].slice(0, 3);
  for (const p of paroleForma) marca(nomeGrezzo.length + (p.index ?? 0), p[0].length);
  const forma = paroleForma
    .map((p) => p[0])
    .join(' ')
    .replace(/[*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const m of testo.matchAll(CONNETTORI)) marca(m.index, m[0].length);

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
  ].filter(Boolean).length;
  // Un numero rimasto fuori da ogni campo (una concentrazione, una posologia) e' clinicamente
  // rilevante: la riga va rivista anche quando il resto e' ben formato.
  const residuoNumerico = /\d/.test(note);
  const stato: ParsedTherapyRow['stato'] =
    farmacoNome && signals >= 2 && !residuoNumerico ? 'ok' : 'da_verificare';

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
  };
}

/** Parse a whole therapy text block into structured rows (one per prescription line).
 *  #296: blank lines are the END-OF-THERAPY delimiter — once drug content has been seen,
 *  the first blank-line-separated paragraph WITHOUT drug signals terminates the block:
 *  that paragraph and everything after it (advice / clinical prose) yield no rows.
 *  Lines inside a drug paragraph are still never dropped (da_verificare on missing structure). */
export function parseDischargeTherapy(text: string): ParsedTherapyRow[] {
  const rows: ParsedTherapyRow[] = [];
  let sawDrugs = false;
  for (const lines of splitTherapyParagraphs(text)) {
    const isDrugParagraph = talksAboutDrugs(lines);
    if (sawDrugs && !isDrugParagraph) break;
    rows.push(...lines.map(parseTherapyLine));
    if (isDrugParagraph) sawDrugs = true;
  }
  return rows;
}

/** Map days (Italian abbreviations) to the PatientTherapy weekly "fasce" booleans is intentionally
 *  NOT done here (fasce are time-of-day, not weekdays). Weekday scheduling is carried on the row's
 *  `giorni`; the confirm layer decides persistence. Kept separate to avoid a lossy mapping. */
