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
/** Detect the administration route: parenthesized code first, then free-text Italian phrasing. */
function detectRoute(text: string): string {
  const paren = text.match(ROUTE_RE)?.[1];
  if (paren) return paren.toUpperCase();
  for (const [re, code] of ROUTE_PHRASES) if (re.test(text)) return code;
  return '';
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

const HEADER_RE = /^(terapia(\s+domiciliare)?|tp\.?|home therapy|hospital therapy)\s*:?\s*$/i;

/** Split a therapy text block into candidate prescription lines (headers/blank lines dropped). */
export function splitTherapyLines(text: string): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !HEADER_RE.test(l));
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
    } else if (!HEADER_RE.test(line)) {
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

/** Parse ONE prescription line into a structured row. Fields are extracted independently, so a
 *  malformed segment never corrupts the others; missing structure → stato 'da_verificare'. */
export function parseTherapyLine(line: string): ParsedTherapyRow {
  const originalText = line.trim();

  const classe = (originalText.match(/\(\s*classe\s*([A-Za-z]?)\s*\)/i)?.[1] ?? '').toUpperCase();
  const dataInizio = toIsoDate(originalText.match(/\bdal\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1]);
  const giorni = [...new Set([...originalText.matchAll(DAY_RE)].map((m) => m[1]))];

  const oreIdx = originalText.search(/\bore\b/i);
  const orari =
    oreIdx >= 0
      ? [...originalText.slice(oreIdx).matchAll(/\b(\d{1,2}:\d{2})\b/g)].map((m) => m[1])
      : [];

  const viaSomministrazione = detectRoute(originalText);
  const qtyM = originalText.match(QTY_RE);
  const quantita = qtyM ? `${qtyM[1]} ${qtyM[2]}` : '';
  const doseM = originalText.match(DOSE_RE);
  const dosaggio = doseM ? doseM[0].replace(/\s+/g, ' ').trim() : '';
  const farmacoNome = (
    originalText.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.\-]*)/)?.[1] ?? ''
  ).toUpperCase();

  // forma = text between the drug name and the first structural marker (route / dosage / quantity).
  const afterName = originalText.slice(farmacoNome.length);
  const idxs = [
    afterName.search(ROUTE_RE),
    doseM ? afterName.indexOf(doseM[0]) : -1,
    qtyM ? afterName.indexOf(qtyM[0]) : -1,
  ].filter((i) => i >= 0);
  const cut = idxs.length ? Math.min(...idxs) : afterName.length;
  const forma = afterName.slice(0, cut).replace(/[*]/g, ' ').replace(/\s+/g, ' ').trim();

  // note = anything after the last recognized structured token, minus date/class/times (best effort).
  let note = originalText;
  for (const seg of [forma, dosaggio, quantita, `(${viaSomministrazione})`].filter(Boolean))
    note = note.replace(seg, ' ');
  note = note
    .replace(new RegExp(`^${farmacoNome}`, 'i'), ' ')
    .replace(/\(\s*classe\s*[A-Za-z]?\s*\)/i, ' ')
    .replace(/\bdal\s+\d{1,2}\/\d{1,2}\/\d{4}/i, ' ')
    .replace(/\bore\b|\be\s+alle\b|\balle\b|\b\d{1,2}:\d{2}\b/gi, ' ')
    .replace(DAY_RE, ' ')
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
  const stato: ParsedTherapyRow['stato'] = farmacoNome && signals >= 2 ? 'ok' : 'da_verificare';

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
