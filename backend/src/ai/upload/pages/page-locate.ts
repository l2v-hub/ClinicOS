// Page of origin of an AI-filled intake field. Pure: no database access, no logging.
//
// Principle: a wrong page is worse than no page. A page is returned only when the value is found
// with certainty in that page's OCR text; short, common or boilerplate values never get a page
// (the field then stays attributed to its letter only). In particular:
//   - names: first name, last name and sex get a page only where first and last name appear
//     adjacent ("cognome nome" or "nome cognome", optionally with a comma) — never a lone token,
//     which is too often an ordinary word ("colorito rosa", "rischio basso", "Villa Serena");
//   - free text: at least 5 words / 30 characters of real content, boilerplate excluded;
//   - allergens: only next to an allergy/intolerance word;
//   - dates: four-digit years only; codes and emails: whole tokens only.

/** OCR text of one page of the current manifest, in manifest order. */
export type PageText = { groupId: string; pageId: string; documentId: string; text: string };
/** Reference to a page: stored in `_fieldOrigin[path].pages` and in `_fieldProposals[].pages`. */
export type PageRef = { groupId: string; pageId: string; documentId: string };
/** Values of other fields the rule of a path depends on (the name pair). */
export type LocateRelated = { firstName?: unknown; lastName?: unknown };

type Prepared = { plain: string; tokens: string; names: string; dates: Set<string> };

const MIN_NAME = 3; // shortest name token accepted ("Li", "Re" are too common to anchor a page)
const MIN_WORDS = 5; // free text: fewest content words
const MIN_CHARS = 30; // free text: fewest content characters
const MIN_ALLERGEN = 4; // shortest allergen ("ASA" and similar abbreviations are too ambiguous)
const ALLERGY_WINDOW = 60; // an allergen counts only this close to "allerg*" / "intolleran*"
const PHRASE_TOKENS = 8; // beginning of a long text: first tokens only (OCR drifts further on)

/** Section headings: they say where a text starts, not what it says. */
const HEADING_WORDS = new Set([
  'anamnesi',
  'patologica',
  'prossima',
  'remota',
  'fisiologica',
  'familiare',
  'diagnosi',
  'principale',
  'secondaria',
  'secondarie',
  'allergie',
  'terapia',
  'decorso',
  'ospedaliero',
  'consigli',
  'controlli',
  'indirizzo',
]);
/** Boilerplate that appears in countless letters: never evidence of a page. */
const BOILERPLATE = [
  'nulla di rilevante',
  'nulla da segnalare',
  'niente da segnalare',
  'nulla di significativo',
  'non rilevante',
  'non significativa',
  'non significativo',
  'nella norma',
  'non noto',
  'non nota',
  'non noti',
  'non note',
  'non riferito',
  'non riferita',
  'non riferiti',
  'non riferite',
  'non segnalate',
  'non segnalati',
  'negativo',
  'negativa',
  'negativi',
  'negative',
  'nessuna',
  'nessuno',
  'nulla',
  'muta',
  'silente',
  'n d',
  'nd',
];

/** Lowercase, accents removed, whitespace collapsed. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
/** Normalized words only: punctuation and markup become single spaces. */
const tokenText = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
/**
 * Text for name pairs: words and commas survive; apostrophes and hyphens join name parts;
 * any other punctuation or line break becomes a barrier ("|") a name pair cannot cross.
 */
const nameText = (value: string) =>
  ` ${value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’`-]/g, ' ')
    .replace(/[^a-z0-9, ]+/g, ' | ')
    .replace(/\s*,\s*/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim()} `;

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const validDate = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

/**
 * Dates written in a text with a four-digit year: dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy (also
 * d/m/yyyy) and ISO yyyy-mm-dd. Two-digit years are never matched: "05/02/24" is ambiguous.
 */
function textDates(text: string): Set<string> {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?<![0-9])(\d{4})-(\d{1,2})-(\d{1,2})(?![0-9])/g)) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (validDate(y, mo, d)) found.add(dateKey(y, mo, d));
  }
  for (const m of text.matchAll(/(?<![0-9])(\d{1,2})([/.-])(\d{1,2})\2(\d{4})(?![0-9])/g)) {
    const [d, mo, y] = [Number(m[1]), Number(m[3]), Number(m[4])];
    if (validDate(y, mo, d)) found.add(dateKey(y, mo, d));
  }
  return found;
}
/** The value of a date field (ISO as the intake writes it, or an Italian date), as a key. */
function valueDate(value: string): string | null {
  const v = value.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/.exec(v);
  let parts: [number, number, number] | null = m
    ? [Number(m[1]), Number(m[2]), Number(m[3])]
    : null;
  if (!parts) {
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
    if (m) parts = [Number(m[3]), Number(m[2]), Number(m[1])];
  }
  return parts && validDate(...parts) ? dateKey(...parts) : null;
}

const prepared = new WeakMap<PageText, Prepared>();
function prepare(page: PageText): Prepared {
  let p = prepared.get(page);
  if (!p) {
    const text = typeof page.text === 'string' ? page.text : '';
    p = {
      plain: normalizeText(text),
      tokens: ` ${tokenText(text)} `,
      names: nameText(text),
      dates: textDates(text),
    };
    prepared.set(page, p);
  }
  return p;
}

const refs = (pages: PageText[], hit: (p: Prepared) => boolean): PageRef[] =>
  pages
    .filter((page) => hit(prepare(page)))
    .map(({ groupId, pageId, documentId }) => ({ groupId, pageId, documentId }));

/** Whole-token phrase match: "rossi" never matches inside "rossini" or "barossi". */
const phraseHit = (phrase: string) => (p: Prepared) => p.tokens.includes(` ${phrase} `);

/** Name tokens, or null when any token is too short or not a word. */
function nameTokens(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const phrase = tokenText(value);
  if (!phrase || phrase.split(' ').some((t) => t.length < MIN_NAME || /\d/.test(t))) return null;
  return phrase;
}
/**
 * Pages where first and last name are adjacent: "cognome nome", "nome cognome", optionally with a
 * comma between them. Never a single name alone.
 */
function namePairPages(pages: PageText[], firstName: unknown, lastName: unknown): PageRef[] {
  const first = nameTokens(firstName);
  const last = nameTokens(lastName);
  if (!first || !last || first === last) return [];
  const pairs = [
    `${last} ${first}`,
    `${last} , ${first}`,
    `${first} ${last}`,
    `${first} , ${last}`,
  ];
  return refs(pages, (p) => pairs.some((pair) => pairHit(p.names, pair)));
}
/** Titles of a signing doctor: "Dott. Rossi Mario" is a signature, not the patient. */
const SIGNER_TITLES = new Set([
  'dott',
  'dr',
  'dssa',
  'dottssa',
  'dottoressa',
  'dottore',
  'prof',
  'medico',
]);
/** Adjacent pair occurrence not preceded by a doctor's title. */
function pairHit(names: string, pair: string) {
  const needle = ` ${pair} `;
  for (let i = names.indexOf(needle); i >= 0; i = names.indexOf(needle, i + 1)) {
    // 'Dott. Rossi Mario' becomes 'dott | rossi mario': the dot after the title is a barrier.
    const words = names.slice(0, i).trim().split(' ');
    if (words.at(-1) === '|') words.pop();
    const before = words.at(-1) ?? '';
    if (!SIGNER_TITLES.has(before)) return true;
  }
  return false;
}

/** Tokens left once leading headings and boilerplate are removed: the real content. */
function contentTokens(tokens: string): string[] {
  let text = ` ${tokens} `;
  for (const phrase of BOILERPLATE) text = text.split(` ${phrase} `).join(' ');
  const words = text.split(' ').filter(Boolean);
  // Headings only count at the start ("anamnesi patologica remota ..."), not inside the text.
  while (words.length && HEADING_WORDS.has(words[0])) words.shift();
  return words;
}
/** Beginning of a long free text, or null when it is too short or only boilerplate. */
function beginningPhrase(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const all = tokenText(value);
  const content = contentTokens(all);
  if (content.length < MIN_WORDS || content.join(' ').length < MIN_CHARS) return null;
  const phrase = all.split(' ').slice(0, PHRASE_TOKENS).join(' ');
  // The searched beginning itself must carry enough content, not only a heading + boilerplate.
  const head = contentTokens(phrase);
  if (head.length < MIN_WORDS || head.join(' ').length < MIN_CHARS) return null;
  return phrase;
}
/** Union of the pages of several phrases, kept in page order. */
function anyPhrase(pages: PageText[], phrases: Array<string | null>): PageRef[] {
  const wanted = phrases.filter((p): p is string => Boolean(p));
  if (!wanted.length) return [];
  return refs(pages, (p) => wanted.some((w) => phraseHit(w)(p)));
}
const rows = (value: unknown) =>
  (Array.isArray(value) ? value : []).map((v) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : {},
  );

/** Words that negate an allergy mention: "nega allergie", "allergie: nessuna". */
const NEGATION_BEFORE = new Set(['nega', 'non', 'nessuna', 'nessun', 'senza', 'no']);
const NEGATION_AFTER = new Set(['nessuna', 'nessuno', 'non', 'negate', 'assenti', 'no']);
/** An allergy word that is not negated right before or after. */
function allergyCue(text: string) {
  const words = text.split(' ').filter(Boolean);
  return words.some(
    (w, i) =>
      /^(allerg|intolleran)/.test(w) &&
      !NEGATION_BEFORE.has(words[i - 1] ?? '') &&
      !NEGATION_AFTER.has(words[i + 1] ?? ''),
  );
}
/** An allergen occurrence counts only within ALLERGY_WINDOW characters of an allergy word. */
const allergenHit = (allergen: string) => (p: Prepared) => {
  const needle = ` ${allergen} `;
  for (let i = p.tokens.indexOf(needle); i >= 0; i = p.tokens.indexOf(needle, i + 1)) {
    // The allergen itself is excluded: "allergia stagionale" is not its own evidence.
    const before = p.tokens.slice(Math.max(0, i - ALLERGY_WINDOW), i + 1);
    const after = p.tokens.slice(i + needle.length - 1, i + needle.length - 1 + ALLERGY_WINDOW);
    if (allergyCue(before) || allergyCue(after)) return true;
  }
  return false;
};

/** Whole-token match of a code written with optional spaces, dots or dashes between characters. */
const codeHit = (code: string) => {
  const pattern = new RegExp(`(?<![a-z0-9])${[...code].join('[ .-]?')}(?![a-z0-9])`);
  return (p: Prepared) => pattern.test(p.plain);
};
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Pages (in the given order) whose OCR text contains the field value. Empty when there is no
 * certain match: the caller then keeps the letter-level provenance and never guesses a page.
 */
export function locateFieldPages(
  path: string,
  value: unknown,
  pages: PageText[],
  related: LocateRelated = {},
): PageRef[] {
  if (!Array.isArray(pages) || !pages.length || value === undefined || value === null) return [];
  switch (path) {
    case 'anagrafica.firstName':
      return namePairPages(pages, value, related.lastName);
    case 'anagrafica.lastName':
      return namePairPages(pages, related.firstName, value);
    case 'anagrafica.sex':
      return typeof value === 'string' && value.trim()
        ? namePairPages(pages, related.firstName, related.lastName)
        : [];
    case 'anagrafica.dateOfBirth': {
      const date = typeof value === 'string' ? valueDate(value) : null;
      return date ? refs(pages, (p) => p.dates.has(date)) : [];
    }
    case 'anagrafica.codiceFiscale': {
      if (typeof value !== 'string') return [];
      const code = value.replace(/\s+/g, '').toLowerCase();
      // Personal (16) or provisional/company (11) codes only: shorter strings are not codes.
      if (!/^([a-z0-9]{16}|[0-9]{11})$/.test(code)) return [];
      return refs(pages, codeHit(code));
    }
    case 'anagrafica.email': {
      if (typeof value !== 'string') return [];
      const email = normalizeText(value).replace(/\s+/g, '');
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) return [];
      // Whole address only: "a.rossi@x.it" is not found inside "ma.rossi@x.it".
      const pattern = new RegExp(
        `(?<![a-z0-9._%+-])${escapeRegExp(email)}(?![a-z0-9_%+-]|\\.[a-z0-9])`,
      );
      return refs(pages, (p) => pattern.test(p.plain));
    }
    case 'anagrafica.phone': {
      if (typeof value !== 'string') return [];
      const digits = value.replace(/\D/g, '').replace(/^(00)?39(?=\d{9,10}$)/, '');
      if (digits.length < 8) return [];
      // The whole number as written (spaces, dots, dashes, slashes between groups).
      return refs(pages, (p) =>
        [...p.plain.matchAll(/(?<![0-9])\+?\d[\d ./-]{6,}\d(?![0-9])/g)].some(
          (m) => m[0].replace(/\D/g, '').replace(/^(00)?39(?=\d{9,10}$)/, '') === digits,
        ),
      );
    }
    case 'anagrafica.address':
    case 'anamnesi.patologicaProssima':
    case 'anamnesi.patologicaRemota': {
      const phrase = beginningPhrase(value);
      return phrase ? refs(pages, phraseHit(phrase)) : [];
    }
    case 'diagnosi':
      return anyPhrase(
        pages,
        rows(value).map((r) => beginningPhrase(r.descrizione)),
      );
    case 'allergie': {
      const allergens = rows(value)
        .map((r) => (typeof r.allergene === 'string' ? tokenText(r.allergene) : ''))
        .filter((a) => a.length >= MIN_ALLERGEN && !BOILERPLATE.includes(a));
      if (!allergens.length) return [];
      return refs(pages, (p) => allergens.some((a) => allergenHit(a)(p)));
    }
    default:
      // allergieStatus and any other short/categorical value: never a page.
      return [];
  }
}
