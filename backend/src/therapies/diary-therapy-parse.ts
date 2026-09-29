// Diario terapia (PR 1): interprete DETERMINISTICO di una prescrizione scritta nel diario.
//
// Regola dell'utente: MAI inventare, MAI un valore sbagliato ma plausibile. Per questo vale un
// ELENCO POSITIVO: un campo si precompila solo se il testo corrisponde esattamente a una forma
// conosciuta; in ogni altro caso il campo resta vuoto, il testo resta nelle note e la riga e'
// 'da_verificare'.
//
// Come funziona:
// 0. Il testo si divide in CLAUSOLE (". " + maiuscola, ";", ":" e "," dopo una lettera,
//    parentesi). La clausola di prescrizione ha un nome candidato e almeno una fra dose,
//    quantita', via, orario; continua nelle clausole seguenti solo se sono pura posologia.
//    Zero clausole di prescrizione -> campi vuoti; piu' di una -> ambiguous 'piu_farmaci'.
// 1. Intento (sospensione, somministrazione gia' fatta, modifica, al bisogno, prescrizione): una
//    sola funzione, `detectDiaryTherapyIntent`, usata anche dal servizio che crea la terapia.
//    Blocca solo DENTRO la clausola di prescrizione: verbo come prima parola significativa,
//    participio dopo nome/dose/quantita' o in coda, cambio di dose ("da 5 a 10 mg", "->").
//    In ogni altra clausola e' solo un avviso, e il verbo resta nelle note.
// 2. Il parser delle lettere di dimissione (`parseTherapyLine`, invariato) legge nome, dose, via
//    e orari da una copia normalizzata del testo ("ore 8 e 20" -> "ore 08:00, 20:00").
// 3. Ogni valore del parser viene RITROVATO nella clausola di prescrizione e accettato solo se
//    corrisponde a una forma ammessa; quantita', date e orari si leggono dall'originale.
// 4. Le note sono cio' che dell'originale non e' stato collocato in un campo: sempre e solo testo
//    scritto dall'operatore, mai testo normalizzato o segnaposto.
//
// PRIVACY: questo modulo non scrive log. Il testo clinico non deve mai finire nei log.

import { parseTherapyLine, type ParsedTherapyRow } from '../intake/parse-discharge-therapy.js';
import { fasciaFromTime } from '../lib/therapy-dose.js';

/** Solo 'prescrizione' (e 'al_bisogno', con orari espliciti) puo' diventare una terapia nuova.
 *  'sospensione', 'somministrazione' (gia' fatta) e 'modifica' (di una terapia esistente) no. */
export type DiaryTherapyIntent =
  'prescrizione' | 'sospensione' | 'al_bisogno' | 'somministrazione' | 'modifica';

type BlockingIntent = 'sospensione' | 'somministrazione' | 'modifica';

export const NON_PRESCRIPTION_INTENTS: ReadonlySet<DiaryTherapyIntent> = new Set([
  'sospensione',
  'somministrazione',
  'modifica',
]);

/** Segnali che non bloccano ma obbligano a guardare la riga. */
export type DiaryTherapyWarning =
  | 'menzione_sospensione'
  | 'menzione_somministrazione'
  | 'menzione_modifica'
  /** Nella prescrizione avanza testo non classificato (campi vuoti): va letto dall'operatore. */
  | 'testo_non_classificato';

export interface DiaryParsedTherapyRow extends ParsedTherapyRow {
  /** ISO YYYY-MM-DD o '' quando il testo non dice "al dd/mm[/yyyy]" (o non e' coerente). */
  dataFine: string;
  /** Quantita' come scritta per l'operatore ("1", "1,5", "1/2", "3/2") o '' se non e' sicura. */
  quantitaValore: string;
  /** Stessa quantita' nel formato dell'input terapia (frazione esatta), o null. */
  quantityNumerator: number | null;
  quantityDenominator: number | null;
  /** Unita' di somministrazione canonica, '' quando manca o e' ambigua (es. "cp"). */
  unitaSomministrazione: string;
}

export type DiaryTherapyInferredField = 'dataInizio' | 'dataFine';
export type DiaryTherapyAmbiguousField = 'orari' | 'piu_farmaci';

export interface DiaryTherapyParseResult {
  row: DiaryParsedTherapyRow;
  /** Cosa sembra dire il testo: solo 'prescrizione'/'al_bisogno' non bloccano la creazione. */
  intent: DiaryTherapyIntent;
  /** Campi completati per deduzione (mai presi alla lettera dal testo): da far confermare. */
  inferred: DiaryTherapyInferredField[];
  /** Campi letti ma con piu' interpretazioni plausibili: da far confermare. */
  ambiguous: DiaryTherapyAmbiguousField[];
  /** Una voce per fascia con piu' somministrazioni, es. "mattina: 08:00, 10:00". */
  fasciaConflicts: string[];
  /** Avvisi che non bloccano (es. una sospensione citata come condizione): da verificare. */
  warnings: DiaryTherapyWarning[];
  /** Offset (sull'originale trimmato) della clausola di prescrizione e delle sue continuazioni;
   *  null se non ce n'e' una sola. Nessun campo viene letto fuori da qui. */
  prescriptionRange: { start: number; end: number } | null;
}

// ── Testo "piegato": minuscolo, senza diacritici, STESSA lunghezza dell'originale ─────────────
// Serve solo a riconoscere intenti e parole in testa; il testo originale non viene mai riscritto.

export function foldText(text: string): string {
  let out = '';
  for (const ch of text) {
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    out += base.length === ch.length ? base : ch;
  }
  return out;
}

const FB = String.raw`(?<![a-z0-9])`; // inizio parola sul testo piegato
const FW = String.raw`(?![a-z0-9])`; // fine parola sul testo piegato
const LB = String.raw`(?<![\p{L}\p{N}])`; // inizio parola sull'originale
const WE = String.raw`(?![\p{L}\p{N}])`; // fine parola sull'originale

// Unita' di quantita': le stesse del parser delle dimissioni.
const QTY_UNIT = String.raw`(?:Cpr|Cps|Cp|compress[ae]|capsul[ae]|Dosi|Dose|Fl|fial[ae]|Bs|Bust|bustin[ae]|ml|mL|gtt|gocce|goccia|gc|Puff|Supp|suppost[ae]|Cerotti|Cerotto)`;
const DOSE_UNIT = String.raw`(?:mgr|mcg|mg|gr|g|ui|ml|µg|μg)`;
const QTY_ATOM = String.raw`(?:\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|½|¼|mezz[ao])`;
const F_DOSE = String.raw`\d+(?:[.,]\d+)?\s?${DOSE_UNIT}`;
const F_QTY = String.raw`${QTY_ATOM}\s*${QTY_UNIT}`;

// ── 1. Vocabolario degli intenti (testo piegato) ────────────────────────────────────────────

// "sospensione orale", "sosp. os": e' una forma farmaceutica, non un intento.
const SUSP_FORM = new RegExp(
  String.raw`${FB}sosp(?:ensione|\.)?\s*(?:orale|os|oral[ei]?)${FW}`,
  'g',
);

interface IntentWords {
  /** Verbo/abbreviazione come prima parola significativa della clausola di prescrizione. */
  head: string;
  /** Participio subito dopo nome/dose/quantita' ("Ramipril 5 mg sospeso"). */
  participle: string;
  /** Participio in coda alla prescrizione ("Ramipril ... ore 8 sospeso"). */
  tail: string;
  /** Qualunque altra occorrenza: solo avviso. */
  mention: string;
}

const MODIFICA_WORDS = String.raw`aument[a-z]*|ridu[a-z]*|ridott[oaie]|scalar[ea]|scalat[oaie]|scalo|sostitu[a-z]*|riprend[a-z]*|ripres[oaie]|modific[a-z]*|portar[ea]|portat[oaie]|incrementar[a-z]*|dimezzar[a-z]*|raddoppiar[a-z]*|cambio|cambiar[a-z]*`;
const MODIFICA_PARTICIPLES = String.raw`aumentat[oaie]|ridott[oaie]|scalat[oaie]|sostituit[oaie]|modificat[oaie]|ripres[oaie]|incrementat[oaie]|dimezzat[oaie]|raddoppiat[oaie]|cambiat[oaie]`;
const SOMM_PARTICIPLES = String.raw`somministrat[oaie]|eseguit[oaie]|fatt[oaie]|praticat[oaie]|assunt[oaie]|omess[oaie]`;

const INTENT_WORDS: Record<BlockingIntent, IntentWords> = {
  sospensione: {
    head: String.raw`sospend[a-z]*|sospes[oaie]|sospensione|interromp[a-z]*|interrott[oaie]|interruzione|togli[a-z]*|tolt[oaie]|elimin[a-z]*|ometter[a-z]*|annull[a-z]*|revoc[a-z]*|cancell[a-z]*|non\s+piu|non\s+(?:somministrare|dare|assumere)|da\s+sospendere|stop|sosp\.?`,
    participle: String.raw`sospes[oaie]|interrott[oaie]|tolt[oaie]|eliminat[oaie]|annullat[oaie]|revocat[oaie]|cancellat[oaie]|stop|da\s+sospendere|sospendere`,
    // In coda: participio, "da sospendere", "STOP", "SOSP.", "-> sospendere", ": sospendere".
    tail: String.raw`sospes[oaie]|interrott[oaie]|tolt[oaie]|eliminat[oaie]|annullat[oaie]|revocat[oaie]|cancellat[oaie]|stop|sosp\.?|da\s+sospendere|(?<=(?:->|→|:)\s*)sospendere`,
    mention: String.raw`sospend[a-z]*|sospes[oaie]|sospensione|interromp[a-z]*|interrott[oaie]|interruzione|togli[a-z]*|tolt[oaie]|elimin[a-z]*|ometter[a-z]*|annull[a-z]*|revoc[a-z]*|cancell[a-z]*|non\s+piu|non\s+(?:somministrare|dare|assumere)|stop|sosp\.?`,
  },
  somministrazione: {
    head: String.raw`${SOMM_PARTICIPLES}|rifiut[a-z]*|somm\.?|dat[oaie](?=\s+alle${FW})`,
    participle: String.raw`${SOMM_PARTICIPLES}|rifiutat[oaie]|dat[oaie](?=\s+alle${FW})`,
    // In coda: anche "dato", "gia' data", "rifiuta/rifiutato", "vomitato", "somm.",
    // "prima dose gia' data".
    tail: String.raw`${SOMM_PARTICIPLES}|dat[oaie]|rifiut[a-z]*|vomitat[oaie]|somm\.?`,
    mention: String.raw`${SOMM_PARTICIPLES}|ha\s+(?:assunto|preso)|dat[oaie](?=\s+alle${FW})|gia\s+dat[oaie]|rifiut[a-z]*|vomitat[oaie]|somm\.?`,
  },
  modifica: {
    head: MODIFICA_WORDS,
    participle: MODIFICA_PARTICIPLES,
    tail: MODIFICA_PARTICIPLES,
    mention: MODIFICA_WORDS,
  },
};
const BLOCKING_INTENTS: BlockingIntent[] = ['sospensione', 'somministrazione', 'modifica'];
const ALL_INTENT_HEADS = BLOCKING_INTENTS.map((i) => INTENT_WORDS[i].head).join('|');
const ALL_INTENT_MENTIONS = new RegExp(
  String.raw`^(?:${BLOCKING_INTENTS.map((i) => INTENT_WORDS[i].mention).join('|')})${FW}`,
);

// Prima parola significativa: si saltano elenchi, etichette, "si", articoli (gli orari a parte).
const INTENT_SKIP = new RegExp(
  String.raw`^(?:\s+|[-•*–—·>]+|\d{1,2}[).](?=\s)|rp${FW}\s*:?|nuova\s+terapia${FW}\s*:?|terapia\s*:|nota\s*:|si${FW}|(?:il|la|lo|le|i|gli)${FW}|l['’])`,
);
const QTY_UNIT_FOLDED = QTY_UNIT.toLowerCase();
const DRUG_LEAD = String.raw`[a-z][a-z0-9-]*(?:\s+${F_DOSE})?(?:\s+${QTY_ATOM}\s*${QTY_UNIT_FOLDED})?\s*(?:\.\.\.|…)?\s*[,:]?\s*(?:(?:e|va|viene)\s+)?`;
const byIntent = (build: (w: IntentWords) => string) =>
  Object.fromEntries(
    BLOCKING_INTENTS.map((i) => [i, new RegExp(build(INTENT_WORDS[i]))]),
  ) as Record<BlockingIntent, RegExp>;
const HEAD_INTENT = byIntent((w) => String.raw`^(?:${w.head})${FW}`);
const PARTICIPLE = byIntent((w) => String.raw`^${DRUG_LEAD}(?:${w.participle})${FW}`);
const TAIL = byIntent(
  (w) =>
    String.raw`${FB}(?:(?:prima\s+dose\s+)?(?:e|va|viene|gia)\s+)?(?:${w.tail})(?:\s+(?:da\s+)?(?:oggi|ieri|stamattina|stasera|domani|ora|subito))?[\s.!)\]"'»”’]*$`,
);
const MENTION = byIntent((w) => String.raw`${FB}(?:${w.mention})${FW}`);
// R3: "per PA aumentata", "se dolore aumentato": il participio ha un altro soggetto.
const OTHER_SUBJECT = /(?:^|\s)(?:per|se)\s+[a-z0-9]+(?:\s+[a-z0-9]+)?\s*$/;
// R5: clausola subito dopo la prescrizione fatta solo di un verbo di sospensione o di
// somministrazione ("..., sospeso da oggi", "Ramipril 5 mg: sospendere", "(sospeso)",
// "— sospeso", "- fatto", "(somministrato)"). "sospesa alimentazione" no: ha un oggetto;
// "sospeso?" no: e' una domanda.
const NEXT_CLAUSE_WHEN = String.raw`(?:\s+(?:da\s+)?(?:oggi|ieri|domani|stamattina|stasera|ora|subito))?[\s.!)\]]*$`;
const NEXT_CLAUSE_LEAD = String.raw`^[\s,:;>\-–—→([]*(?:e\s+)?(?:gia\s+)?`;
const NEXT_CLAUSE: Array<[BlockingIntent, RegExp]> = [
  [
    'sospensione',
    new RegExp(
      String.raw`${NEXT_CLAUSE_LEAD}(?:sospes[oaie]|sospendere|da\s+sospendere|stop|sosp\.?|interrompere|interrott[oaie]|annullat[oaie]|revocat[oaie]|cancellat[oaie])${NEXT_CLAUSE_WHEN}`,
    ),
  ],
  [
    'somministrazione',
    new RegExp(
      String.raw`${NEXT_CLAUSE_LEAD}(?:${SOMM_PARTICIPLES}|dat[oaie]|rifiut[a-z]*|vomitat[oaie]|somm\.?)${NEXT_CLAUSE_WHEN}`,
    ),
  ],
];
// Cambio di dose: "da 5 a 10 mg", "da 5 mg a 10 mg", "5 mg -> 10 mg", "5 mg → 10 mg".
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const DOSE_CHANGE = new RegExp(
  String.raw`${FB}da\s+${NUM}\s*(?:${DOSE_UNIT})?\s+a\s+${NUM}\s*${DOSE_UNIT}${FW}|${NUM}\s*(?:${DOSE_UNIT})?\s*(?:->|→|=>)\s*${NUM}`,
);
const CHANGE_WORD = new RegExp(
  String.raw`${FB}(?:incrementar[a-z]*|dimezzar[a-z]*|raddoppiar[a-z]*|cambio|cambiar[a-z]*)${FW}`,
);
const AL_BISOGNO = new RegExp(
  String.raw`${FB}(?:al\s+bisogno|se\s+necessario|prn|all['’]\s?occorrenza)${FW}`,
);

// ── 2. Clausole, testa della frase e nome ───────────────────────────────────────────────────

// Elenchi e etichette all'inizio: "- ", "• ", "1) ", "1. ", "Rp:", "Nuova terapia:", "Terapia:".
const LEAD_LABEL = new RegExp(
  String.raw`^(?:\s+|[-•*–—·>]+(?=\s)|\d{1,2}[).](?=\s)|rp${FW}\s*:?|nuova\s+terapia${FW}\s*:?|terapia\s*:|nota\s*:)`,
);
// Verbi, articoli e parole funzionali prima del nome del farmaco.
const HEAD_WORD = new RegExp(
  String.raw`^(?:(?:terapia\s+(?:con|a\s+base\s+di)|si\s+(?:prescrive|prescrivono|inizia|avvia|aggiunge|sospende|riduce|aumenta)|prescrivo|prescrivere|prescritt[oa]|iniziare|inizia|inizio|avviare|avvia|avvio|aggiungere|aggiungo|aggiungi|aggiunt[oaie]|introdott[oaie]|introdurre|dare|somministrare|paziente|pz|ha\s+(?:assunto|preso)|gocce\s+di|il|la|lo|i|gli|le|un|una|uno|${ALL_INTENT_HEADS})${FW}|l['’])\s*:?\s*`,
);
// Parole che non possono mai essere il nome di un farmaco (confronto sul testo piegato).
const NOT_A_DRUG = new Set([
  'ore',
  'alle',
  'dal',
  'al',
  'per',
  'se',
  'non',
  'si',
  'e',
  'di',
  'da',
  'terapia',
  'farmaco',
  'farmaci',
  'prescrizione',
  'rp',
  'nuova',
  'paziente',
  'pz',
  'orario',
  'dose',
  'dosaggio',
  'cpr',
  'cp',
  'cps',
  'una',
  'un',
  'uno',
  'sostituire',
  // "Somministro/Somministra Ramipril": racconto di una somministrazione, non una formula di
  // prescrizione; non e' nemmeno un nome di farmaco.
  'somministro',
  'somministra',
]);
const HEAD_WORD_FULL = new RegExp(String.raw`^(?:${HEAD_WORD.source.slice(1)})$`);

function isNotADrug(name: string): boolean {
  const f = foldText(name).replace(/[.-]+$/, '');
  return NOT_A_DRUG.has(f) || HEAD_WORD_FULL.test(`${f} `) || HEAD_WORD_FULL.test(f);
}

// Abbreviazioni dopo cui il punto non chiude la frase ("Sosp. Ramipril", "cpr. riv.").
const ABBREVIATIONS = new Set([
  'sosp',
  'somm',
  'cp',
  'cpr',
  'cps',
  'riv',
  'gtt',
  'fl',
  'bust',
  'supp',
  'compr',
  'caps',
  'tab',
  'amp',
  'dott',
  'dr',
  'sig',
  'ecc',
  'es',
  'max',
  'min',
  'ca',
  'pz',
  'nr',
  'n',
  'ev',
  'im',
  'sc',
  'os',
]);
// Parentesi che restano nella frase: sigla di via "(OS)" o "(classe A)".
const INLINE_PAREN =
  /^\(\s*(?:OS|IM|EV|SC|SL|TD|INAL|TOP|RETT|OFT|OTO|NAS|VAG|IN|classe\s*[A-Za-z]?)\s*\)$/i;

interface Clause {
  start: number;
  end: number;
}

/** Divide il testo in clausole conservando gli offset. Separatori: ". " + maiuscola (dopo una
 *  parola non abbreviata o una cifra), ";", " | ", a capo, ":" e "," seguiti da spazio, un nuovo
 *  elemento di elenco ("- ", "• ", "N) ", "N. "); una parentesi e' una clausola a se'. Mai dentro
 *  un numero o un elenco di orari: "2 , 5 mg", "ore 8, 14" restano interi. */
function segmentClauses(text: string, from: number): Clause[] {
  const clauses: Clause[] = [];
  let start = from;
  const push = (s: number, e: number) => {
    if (/[\p{L}\p{N}]/u.test(text.slice(s, e))) clauses.push({ start: s, end: e });
  };
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1] ?? '';
    const next = text[i + 1] ?? '';
    if (ch === '(') {
      const close = text.indexOf(')', i);
      const end = close >= 0 ? close + 1 : text.length;
      if (INLINE_PAREN.test(text.slice(i, end))) {
        i = end - 1;
        continue;
      }
      push(start, i);
      push(i, end);
      start = end;
      i = end - 1;
      continue;
    }
    let split = false;
    // Nuovo elemento di elenco in mezzo al testo ("... ore 8 - Lasix", "... 2) Lasix"): la
    // clausola si chiude PRIMA del marcatore, che resta alla testa della clausola seguente.
    if (i > from && /\s/.test(prev)) {
      // "N." in mezzo al testo lo gestisce la regola del punto ("ore 8. Lasix").
      const marker = /^(?:[-•*–—·]|\d{1,2}\))(?=\s+\p{L})/u.exec(text.slice(i));
      if (marker) {
        push(start, i);
        start = i;
        i += marker[0].length - 1;
        continue;
      }
    }
    if (ch === '|' && /\s/.test(prev) && /\s/.test(next)) split = true;
    else if (ch === ';' || ch === '\n') split = true;
    else if ((ch === ',' || ch === ':') && /\s/.test(next) && !/^\s+\d/.test(text.slice(i + 1))) {
      // "," e ":" seguiti da spazio chiudono l'inciso, tranne quando continua un numero o un
      // elenco di orari ("2 , 5 mg", "ore 8, 14 e 20").
      split = /[\p{L}\p{N})]/u.test(prev);
    } else if (ch === '.' && /[\p{L}\p{N}]/u.test(prev) && /^\s+\p{Lu}/u.test(text.slice(i + 1))) {
      // "... cibo. Ramipril", "... ore 8. Lasix"; mai dopo un'abbreviazione ("Sosp. Ramipril").
      const word = /[\p{L}]+$/u.exec(text.slice(start, i))?.[0] ?? '';
      split = !ABBREVIATIONS.has(foldText(word));
    }
    if (split) {
      push(start, i);
      start = i + 1;
    }
  }
  push(start, text.length);
  return clauses;
}

interface ClauseHead {
  /** Inizio del nome (dopo verbi, articoli, etichette, orari in testa). */
  nameStart: number;
  /** Parole di testa da collocare (mai i verbi d'intento: quelli restano nelle note). */
  consumed: Array<[number, number]>;
  /** Orari scritti in testa ("Ore 8 Ramipril ..."), testo originale. */
  headTimes: string[];
  /** Nome candidato, se c'e'. */
  name: string;
}

function readClauseHead(original: string, folded: string, clause: Clause): ClauseHead {
  let pos = clause.start;
  const consumed: Array<[number, number]> = [];
  const headTimes: string[] = [];
  for (let guard = 0; guard < 20 && pos < clause.end; guard++) {
    const rest = folded.slice(pos, clause.end);
    const space = /^[\s(]+/.exec(rest);
    if (space) {
      pos += space[0].length;
      continue;
    }
    const word = LEAD_LABEL.exec(rest) ?? HEAD_WORD.exec(rest);
    if (word && word[0].length) {
      if (!ALL_INTENT_MENTIONS.test(rest)) consumed.push([pos, pos + word[0].length]);
      pos += word[0].length;
      continue;
    }
    const time = scanTimeLists(original.slice(pos, clause.end)).find((l) => l.start === 0);
    if (time) {
      headTimes.push(original.slice(pos, pos + time.end));
      pos += time.end;
      continue;
    }
    break;
  }
  const m = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.-]*/.exec(original.slice(pos, clause.end));
  const name = m && !isNotADrug(m[0]) ? m[0] : '';
  return { nameStart: pos, consumed, headTimes, name };
}

function hasPrescriptionSignal(text: string): boolean {
  return (
    new RegExp(String.raw`${LB}(?:${F_DOSE}|${F_QTY})${WE}`, 'iu').test(text) ||
    ROUTE_PAREN.test(text) ||
    ROUTE_PHRASES.some(([re]) => re.test(text)) ||
    scanTimeLists(text).length > 0
  );
}

const POSOLOGY_ONLY: RegExp[] = [
  /\bper\s+\d+\s+(?:giorn[oi]|gg|settiman[ae])\b/giu,
  /\bx\s*\d+\s*(?:gg|giorni)\b/giu,
  /\b(?:al\s+bisogno|se\s+necessario|prn|all['’]\s?occorrenza)\b/giu,
  /\b(?:e|ed|poi)\b/giu,
];

/** Una clausola che continua la prescrizione contiene SOLO posologia. */
function isPosologyOnly(text: string): boolean {
  let t = text;
  const blank = (start: number, end: number) => {
    t = t.slice(0, start) + ' '.repeat(end - start) + t.slice(end);
  };
  for (const l of scanTimeLists(t)) blank(l.start, l.end);
  for (const re of [START_DATE_FULL, START_DATE, END_DATE]) {
    const m = re.exec(t);
    if (m) blank(m.index, m.index + m[0].length);
  }
  t = t.replace(DAY_RE, (m) => ' '.repeat(m.length));
  t = t.replace(new RegExp(ROUTE_PAREN.source, 'gi'), (m) => ' '.repeat(m.length));
  for (const [re] of ROUTE_PHRASES) {
    t = t.replace(new RegExp(re.source, 'gi'), (m) => ' '.repeat(m.length));
  }
  for (const re of POSOLOGY_ONLY) t = t.replace(re, (m) => ' '.repeat(m.length));
  return !/[\p{L}\p{N}]/u.test(t);
}

interface Analysis {
  labelEnd: number;
  clauses: Clause[];
  heads: ClauseHead[];
  /** Indici delle clausole di prescrizione (nome + dose/quantita'/via/orario). */
  prescriptions: number[];
  /** Clausola di prescrizione piu' continuazioni, se ce n'e' una sola. */
  region: { start: number; end: number; clause: number } | null;
  intent: DiaryTherapyIntent;
  warnings: DiaryTherapyWarning[];
  /** "da 5 a 10 mg", "5 mg -> 10 mg" nella prescrizione: nessuna dose e' quella giusta. */
  doseChange: boolean;
}

function analyze(original: string): Analysis {
  const folded = foldText(original);
  const masked = folded.replace(SUSP_FORM, (m) => ' '.repeat(m.length));
  let labelEnd = 0;
  for (let guard = 0; guard < 20; guard++) {
    const m = LEAD_LABEL.exec(folded.slice(labelEnd));
    if (!m || !m[0].length) break;
    labelEnd += m[0].length;
  }
  const clauses = segmentClauses(original, labelEnd);
  const heads = clauses.map((c) => readClauseHead(original, folded, c));
  const prescriptions = clauses
    .map((c, i) => i)
    .filter(
      (i) =>
        heads[i].name && hasPrescriptionSignal(original.slice(clauses[i].start, clauses[i].end)),
    );

  let region: Analysis['region'] = null;
  if (prescriptions.length === 1) {
    const i = prescriptions[0];
    let end = clauses[i].end;
    for (let j = i + 1; j < clauses.length; j++) {
      if (!isPosologyOnly(original.slice(clauses[j].start, clauses[j].end))) break;
      end = clauses[j].end;
    }
    region = { start: clauses[i].start, end, clause: i };
  }

  // Intento: valutato sulle clausole di prescrizione (o, se non ce ne sono, sulla prima con un
  // nome: "Sospendere Ramipril" non ha dose ma e' comunque una sospensione).
  // Senza nemmeno un nome ("Modificare orario"), conta la prima clausola.
  const named = clauses.map((c, i) => i).filter((i) => heads[i].name);
  const targets = prescriptions.length
    ? prescriptions
    : named.length
      ? named.slice(0, 1)
      : clauses.length
        ? [0]
        : [];
  const blockingOf = (i: number): BlockingIntent | null => {
    const c = clauses[i];
    const end = region && region.clause === i ? region.end : c.end;
    let pos = c.start;
    for (let guard = 0; guard < 20 && pos < end; guard++) {
      const skip = INTENT_SKIP.exec(masked.slice(pos, end));
      if (skip && skip[0].length) {
        pos += skip[0].length;
        continue;
      }
      const time = scanTimeLists(original.slice(pos, end)).find((l) => l.start === 0);
      if (time) {
        pos += time.end;
        continue;
      }
      break;
    }
    const lead = masked.slice(pos, end);
    const whole = masked.slice(c.start, end);
    for (const intent of BLOCKING_INTENTS) if (HEAD_INTENT[intent].test(lead)) return intent;
    for (const intent of BLOCKING_INTENTS) if (PARTICIPLE[intent].test(lead)) return intent;
    for (const intent of BLOCKING_INTENTS) {
      const tail = TAIL[intent].exec(whole);
      if (tail && !OTHER_SUBJECT.test(whole.slice(0, tail.index))) return intent;
    }
    if (DOSE_CHANGE.test(whole) || CHANGE_WORD.test(whole)) return 'modifica';
    return null;
  };
  const doseChange = region !== null && DOSE_CHANGE.test(masked.slice(region.start, region.end));
  if (region) {
    const next = clauses.find((c) => c.start >= region.end);
    const nextText = next ? masked.slice(next.start, next.end) : '';
    const nextIntent =
      next && !/[\p{L}\p{N}]/u.test(masked.slice(region.end, next.start))
        ? NEXT_CLAUSE.find(([, re]) => re.test(nextText))?.[0]
        : undefined;
    if (nextIntent) {
      return {
        labelEnd,
        clauses,
        heads,
        prescriptions,
        region,
        intent: nextIntent,
        warnings: [],
        doseChange,
      };
    }
  }
  for (const i of targets) {
    const blocked = blockingOf(i);
    if (blocked) {
      return {
        labelEnd,
        clauses,
        heads,
        prescriptions,
        region,
        intent: blocked,
        warnings: [],
        doseChange,
      };
    }
  }

  const warnings = BLOCKING_INTENTS.filter((i) => MENTION[i].test(masked)).map(
    (i) => `menzione_${i}` as DiaryTherapyWarning,
  );
  const scope = region ? masked.slice(region.start, region.end) : masked;
  return {
    labelEnd,
    clauses,
    heads,
    prescriptions,
    region,
    intent: AL_BISOGNO.test(scope) ? 'al_bisogno' : 'prescrizione',
    warnings,
    doseChange,
  };
}

export interface DiaryTherapyIntentResult {
  intent: DiaryTherapyIntent;
  warnings: DiaryTherapyWarning[];
}

/** Unica regola degli intenti, condivisa da anteprima e creazione. */
export function detectDiaryTherapyIntent(text: string): DiaryTherapyIntentResult {
  const { intent, warnings } = analyze((text ?? '').trim());
  return { intent, warnings };
}
// ── 3. Orari, date, quantita', dose ─────────────────────────────────────────────────────────

// Un numero seguito da un'unita' e' una dose o una quantita', mai un'ora.
const NOT_A_DOSE = String.raw`(?![.,/:]?\d)(?!\s*(?:mg|mgr|mcg|gr|g|ui|ml|gtt|gocce|goccia|cp\w*|cps|compress\w*|capsul\w*|fial\w*|bustin\w*|suppost\w*|cerott\w*|dos[ei]|puff|giorn\w*|settiman\w*|mes[ei]|%)${WE})`;
const TIME_TOKEN = String.raw`(\d{1,2})(?::(\d{2}))?`;
const LIST_START = new RegExp(
  String.raw`${LB}(alle\s+ore|ore|alle)${WE}\s*:?\s*${TIME_TOKEN}${NOT_A_DOSE}`,
  'giu',
);
const LIST_NEXT = new RegExp(
  String.raw`^(\s*[,;]\s*(?:(?:e|ed)\s+)?|\s+(?:e|ed)\s+)(?:alle\s+)?(?:ore\s+)?${TIME_TOKEN}${NOT_A_DOSE}`,
  'iu',
);
// "ore 8 e 1/2 cpr": la quantita' dopo un orario rende ambigui orari e quantita'.
const TIME_THEN_QTY = new RegExp(
  String.raw`${LB}(?:ore|alle)\s*:?\s*\d{1,2}(?::\d{2})?\s*(?:,|e|ed)\s*${QTY_ATOM}\s*${QTY_UNIT}${WE}`,
  'iu',
);
const START_DATE = new RegExp(String.raw`${LB}dal\s+(\d{1,2})\/(\d{1,2})(?![\d/])`, 'iu');
const START_DATE_FULL = new RegExp(
  String.raw`${LB}dal\s+(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])`,
  'iu',
);
const END_DATE = new RegExp(
  String.raw`${LB}(?:fino\s+)?al\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?![\d/])`,
  'iu',
);
// Dose composta: "875/125 mg", "20 mg/ml", "1GR/880UI". Resta testo integrale, da verificare.
const COMPOSITE_DOSE = new RegExp(
  String.raw`${LB}\d+(?:[.,]\d+)?\s?\/\s?\d+(?:[.,]\d+)?\s?${DOSE_UNIT}${WE}|${LB}\d+(?:[.,]\d+)?\s?${DOSE_UNIT}\s?\/\s?(?:\d+(?:[.,]\d+)?\s?)?(?:${DOSE_UNIT}|dose|puff|kg|h|ora|die)${WE}`,
  'iu',
);
// Due dosi con unita' separate da "/": con spazi ("5 mg / 10 mg") o con la stessa unita'
// ("5 mg/10 mg") sono un'alternativa. "875/125 mg" e "20 mg/ml", "5 mg/5 ml" restano composte.
const DOSE_PAIR = new RegExp(
  String.raw`${LB}\d+(?:[.,]\d+)?\s?(mgr|mcg|mg|gr|g|ui|ml|l|µg|μg)(\s*)\/(\s*)\d+(?:[.,]\d+)?\s?(mgr|mcg|mg|gr|g|ui|ml|l|µg|μg)${WE}`,
  'giu',
);
// Grandezza di un'unita': mg, g, mcg/µg sono tutte masse; ml e l volumi; UI a se'.
function unitQuantity(unit: string): string {
  const u = unit.toLowerCase();
  if (['mgr', 'mcg', 'mg', 'gr', 'g', 'µg', 'μg'].includes(u)) return 'massa';
  if (u === 'ml' || u === 'l') return 'volume';
  return u;
}
/** "500 mg/1 g", "50 mcg/0,1 mg", "5 mg / 10 mg": due dosi della stessa grandezza (o separate
 *  da " / ") sono un'alternativa. "5 mg/5 ml", "2 mg/ml", "5 mg/kg", "35 mcg/h", "5/10 mg" no. */
function findDoseAlternative(text: string): RegExpMatchArray | null {
  for (const m of text.matchAll(DOSE_PAIR)) {
    const spaced = m[2].length > 0 && m[3].length > 0;
    if (spaced || unitQuantity(m[1]) === unitQuantity(m[4])) return m;
  }
  return null;
}
// Qualunque cosa abbia l'aspetto di una quantita' davanti a un'unita' (anche intervalli "1-2").
const ANY_QTY = new RegExp(
  String.raw`(?<![\p{L}\p{N}.,/])${QTY_ATOM}(?:\s*(?:e|ed|o|\+|-|–)\s*${QTY_ATOM}|\s+(?:\d+\s*\/\s*\d+|½|¼))?\s*(${QTY_UNIT})${WE}`,
  'giu',
);
// Frazioni "sciolte": se ne resta una non usata, la quantita' non e' sicura ("1 cpr e 1/4").
const STRAY_FRACTION = /(?<![\p{L}\p{N}])(?:\d+\s*\/\s*\d+|½|¼)/gu;
const DOSE_OK = new RegExp(String.raw`^(\d+(?:[.,]\d+)?)\s?(${DOSE_UNIT})$`, 'iu');

// Solo abbreviazioni univoche. "Cp" NON c'e': puo' essere compressa o capsula.
const UNIT_MAP: Array<[RegExp, string]> = [
  [/^(cpr|compress[ae])$/i, 'compressa'],
  [/^(cps|capsul[ae])$/i, 'capsula'],
  [/^fial[ae]$/i, 'fiala'],
  [/^(bust|bustin[ae])$/i, 'bustina'],
  [/^ml$/i, 'ml'],
  [/^(gtt|gocce|goccia)$/i, 'gocce'],
  [/^(supp|suppost[ae])$/i, 'supposta'],
  [/^cerott[oi]$/i, 'cerotto'],
  [/^puff$/i, 'puff'],
];

// Forme farmaceutiche ammesse (testo piegato). Tutto il resto torna nelle note.
const KNOWN_FORM =
  /^(?:compress[ae](?:\s+(?:rivestit[ae]|effervescent[ie]|orodispersibil[ie]|divisibil[ie]|gastroresistent[ie]|a\s+rilascio\s+(?:prolungato|modificato)))?|cpr(?:\s+(?:riv|eff|rp))?\.?|capsul[ae](?:\s+(?:rigid[ae]|moll[ie]))?|cps|gocce(?:\s+orali)?|sciroppo|soluzione(?:\s+(?:orale|iniettabile))?|sospensione(?:\s+orale)?|sosp\.?\s+orale|fial[ae]|flaconcin[oi]|bustin[ae]|granulato|polvere|crema|pomata|gel|collirio|spray(?:\s+nasale)?|cerott[oi](?:\s+transdermic[oi])?|suppost[ae]|ovul[oi])$/;

// Via di somministrazione: stesso elenco del parser delle dimissioni, per ritrovarne il testo.
const ROUTE_CODES = [
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
const ROUTE_PAREN = new RegExp(`\\(\\s*(${ROUTE_CODES.join('|')})\\s*\\)`, 'i');
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
const DAY_RE = /\b(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b/g;
// Sigla di via scritta da sola ("4000 UI sc", "2 g ev"): per il parser diventa "(SC)".
const BARE_ROUTE = /(?<![\p{L}\p{N}.])(?<!per\s+)(sc|ev|im|os)(?![\p{L}\p{N}.])/iu;
// Parole ammesse fra i campi della prescrizione (TUTTO O NIENTE): connettori e durata.
const ALLOWED_FILLERS: RegExp[] = [
  /\bper\s+\d+\s+(?:giorn[oi]|gg|settiman[ae])\b/giu,
  /\bx\s*\d+\s*(?:gg|giorni)\b/giu,
  /\b(?:al\s+bisogno|se\s+necessario|prn|all['’]\s?occorrenza)\b/giu,
  /\b(?:e|ed)\b/giu,
];
const CLASSE_RE = /\(\s*classe\s*[A-Za-z]?\s*\)/i;

const SAFE_DENOMINATORS = new Set([1, 2, 4]);
const MAX_QUANTITY = 1000;

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────

function clockTime(hourRaw: string, minuteRaw: string | undefined): string | null {
  const hour = Number(hourRaw);
  const minute = minuteRaw === undefined ? 0 : Number(minuteRaw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface TimeList {
  start: number;
  end: number;
  keyword: string;
  times: string[];
  /** "8 e 15", "8:00 e 15": si legge anche 8:15. */
  ambiguous: boolean;
}

function scanTimeLists(text: string): TimeList[] {
  const lists: TimeList[] = [];
  LIST_START.lastIndex = 0;
  for (let m = LIST_START.exec(text); m; m = LIST_START.exec(text)) {
    const first = clockTime(m[2], m[3]);
    if (first === null) continue; // "ore 25": non e' un orario.
    const times = [first];
    let ambiguous = false;
    let end = m.index + m[0].length;
    for (
      let next = text.slice(end).match(LIST_NEXT);
      next;
      next = text.slice(end).match(LIST_NEXT)
    ) {
      const time = clockTime(next[2], next[3]);
      if (time === null) break;
      if (
        /^\s+(?:e|ed)\s+$/i.test(next[1]) &&
        next[3] === undefined &&
        ['15', '30', '45'].includes(next[2])
      ) {
        ambiguous = true;
      }
      times.push(time);
      end += next[0].length;
    }
    lists.push({ start: m.index, end, keyword: m[1], times, ambiguous });
    LIST_START.lastIndex = end;
  }
  return lists;
}

/** "ore 8 e 20" -> "ore 08:00, 20:00"; "alle 8, 14 e 20" -> "alle ore 08:00, 14:00, 20:00". */
function normalizeHourLists(text: string): string {
  let out = '';
  let cursor = 0;
  for (const list of scanTimeLists(text)) {
    // Il parser delle dimissioni riconosce l'elenco solo se introdotto da "ore".
    const keyword = /^ore$/i.test(list.keyword) ? 'ore' : 'alle ore';
    out += `${text.slice(cursor, list.start)}${keyword} ${list.times.join(', ')}`;
    cursor = list.end;
  }
  return out + text.slice(cursor);
}

function isoDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function entryIsoDate(entryDate: string | Date | null | undefined): string | null {
  if (entryDate instanceof Date) {
    return Number.isNaN(entryDate.getTime()) ? null : entryDate.toISOString().slice(0, 10);
  }
  const m =
    typeof entryDate === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(entryDate.trim()) : null;
  return m ? isoDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

function daysBetween(fromIso: string, toIso: string): number {
  return (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000;
}

function canonicalUnit(unit: string): string {
  for (const [re, canonical] of UNIT_MAP) if (re.test(unit)) return canonical;
  return '';
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

interface Quantity {
  display: string;
  num: number;
  den: number;
}

function exactFraction(num: number, den: number, display: string): Quantity | null {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || num <= 0 || den <= 0) {
    return null;
  }
  const g = gcd(num, den);
  const n = num / g;
  const d = den / g;
  if (!SAFE_DENOMINATORS.has(d) || n / d > MAX_QUANTITY) return null;
  return { display, num: n, den: d };
}

/** Forme ammesse della quantita' (testo prima dell'unita'). Tutto il resto: null. */
function readQuantity(raw: string): Quantity | null {
  const q = raw.trim().replace(/\s+/g, ' ');
  let m = /^(\d+)$/.exec(q);
  if (m) return exactFraction(Number(m[1]), 1, String(Number(m[1])));
  m = /^1 ?\/ ?([24])$/.exec(q);
  if (m) return exactFraction(1, Number(m[1]), `1/${m[1]}`);
  if (q === '½') return exactFraction(1, 2, '1/2');
  if (q === '¼') return exactFraction(1, 4, '1/4');
  if (/^mezz[ao]$/i.test(q)) return exactFraction(1, 2, '1/2');
  m = /^(\d+)[.,](5|25)$/.exec(q);
  if (m) {
    const den = m[2] === '5' ? 2 : 4;
    return exactFraction(Number(m[1]) * den + 1, den, `${Number(m[1])},${m[2]}`);
  }
  m = /^(\d+)(?: ?(?:e|ed|\+|-) ?| )(?:1 ?\/ ?2|½|mezz[ao])$/i.exec(q) ?? /^(\d+)½$/.exec(q);
  if (m) {
    const f = exactFraction(Number(m[1]) * 2 + 1, 2, '');
    return f ? { ...f, display: `${f.num}/${f.den}` } : null;
  }
  return null;
}

function fasciaConflictsOf(orari: string[]): string[] {
  const byFascia = new Map<string, string[]>();
  for (const time of orari) {
    const fascia = fasciaFromTime(time);
    byFascia.set(fascia, [...(byFascia.get(fascia) ?? []), time]);
  }
  // Anche lo stesso orario ripetuto e' un conflitto: una sola somministrazione per fascia.
  return [...byFascia.entries()]
    .filter(([, times]) => times.length > 1)
    .map(([fascia, times]) => `${fascia}: ${[...times].sort().join(', ')}`);
}

/** Conflitti di fascia fra gli orari di una pianificazione (stessa regola dell'anteprima). */
export function scheduleFasciaConflicts(times: string[]): string[] {
  return fasciaConflictsOf(times);
}

// ── 4. Interprete ───────────────────────────────────────────────────────────────────────────

interface Replacement {
  start: number;
  end: number;
  text: string;
}

function emptyRow(original: string, note: string): DiaryParsedTherapyRow {
  return {
    farmacoNome: '',
    forma: '',
    dosaggio: '',
    viaSomministrazione: '',
    quantita: '',
    orari: [],
    giorni: [],
    dataInizio: '',
    classe: '',
    note,
    originalText: original,
    stato: 'da_verificare',
    dataFine: '',
    quantitaValore: '',
    quantityNumerator: null,
    quantityDenominator: null,
    unitaSomministrazione: '',
  };
}

/** Parole della prescrizione [start, end) non collocate in nessun campo ne' ammesse come
 *  connettori ("e", ",", "per N giorni", al bisogno). Vuoto = prescrizione consumata per intero. */
function unclassifiedWords(
  original: string,
  used: Uint8Array,
  start: number,
  end: number,
): string[] {
  let rest = '';
  for (let i = start; i < end; i++) rest += used[i] ? ' ' : original[i];
  for (const re of ALLOWED_FILLERS) rest = rest.replace(re, (m) => ' '.repeat(m.length));
  // Qualunque simbolo che non sia punteggiatura comune (✓, →, *, #, @, %, emoji...) avanza.
  return rest.split(/\s+/u).filter((w) => w.replace(COMMON_PUNCTUATION, '') !== '');
}

/** Per i test: caratteri dell'originale (non spazi, non punteggiatura comune) non collocati in
 *  un campo e assenti dalle note. Deve essere sempre vuoto: nessun dato sparisce. */
function droppedCharacters(original: string, used: Uint8Array, note: string): string[] {
  const significant = (text: string) =>
    [...text].filter((c) => !/\s/u.test(c) && !COMMON_PUNCTUATION_CHAR.test(c));
  let free = '';
  for (let i = 0; i < original.length; i++) if (!used[i]) free += original[i];
  const expected = significant(free);
  const written = significant(note);
  const missing: string[] = [];
  let k = 0;
  for (const c of expected) {
    while (k < written.length && written[k] !== c) k++;
    if (k >= written.length) missing.push(c);
    else k++;
  }
  return missing;
}

/** Per i test: caratteri spariti (non in un campo, non nelle note, non punteggiatura comune). */
export function diaryDroppedCharacters(
  text: string,
  entryDate: string | Date | null | undefined,
): string[] {
  return parseInternal(text, entryDate).dropped;
}

/** Per i test: parole della clausola di prescrizione che non sono state classificate. */
export function diaryPrescriptionLeftover(
  text: string,
  entryDate: string | Date | null | undefined,
): string[] {
  return parseInternal(text, entryDate).leftover;
}

// Punteggiatura comune: separa, non porta dati. Tutto il resto (✓, →, *, #, @, %, emoji, •)
// e' contenuto e resta nelle note.
const COMMON_PUNCTUATION = /[.,;:()[\]\-/+'"’‘“”]/gu;
const COMMON_PUNCTUATION_CHAR = /^[.,;:()[\]\-/+'"’‘“”]$/u;

/** Note: tutto l'originale non collocato, frammento per frammento, com'e' scritto. */
function notesOf(original: string, used: Uint8Array): string {
  const fragments: string[] = [];
  let current = '';
  for (let i = 0; i < original.length; i++) {
    if (used[i]) {
      fragments.push(current);
      current = '';
    } else current += original[i];
  }
  fragments.push(current);
  return (
    fragments
      // Ai bordi si toglie solo punteggiatura comune (non "-": "-> 10 mg" resta leggibile).
      .map((f) => f.replace(/^[\s,;:.()[\]/+'"’‘“”]+|[\s,;:.()[\]/+'"’‘“”]+$/gu, '').trim())
      .filter((f) => f.replace(COMMON_PUNCTUATION, '').trim() !== '')
      .join(' ')
  );
}

/**
 * Interpreta il testo di una voce di diario come UNA prescrizione.
 * I campi si leggono SOLO dalla clausola di prescrizione e dalle sue continuazioni di posologia;
 * il resto del testo va nelle note com'e' scritto.
 * @param entryDate data della voce (YYYY-MM-DD... o Date): fornisce l'anno a "dal dd/mm".
 */
export function parseDiaryTherapyText(
  text: string,
  entryDate: string | Date | null | undefined,
): DiaryTherapyParseResult {
  return parseInternal(text, entryDate).result;
}

interface ParseOutcome {
  result: DiaryTherapyParseResult;
  leftover: string[];
  dropped: string[];
}

/**
 * Regola finale degli avvisi: una "prescrizione" senza avvisi e' ammessa solo se il testo e'
 * interamente collocato nei campi. Se restano note, o non c'e' una clausola di prescrizione,
 * l'operatore deve leggere: avviso `testo_non_classificato` (mai un blocco). Vale anche per
 * "per N giorni" e "al bisogno": sono classificati ma nessun campo li porta, quindi restano nelle
 * note e l'avviso li rende visibili.
 */
const AL_BISOGNO_FORMULA = new RegExp(AL_BISOGNO.source, 'g');

function withUnclassifiedWarning(outcome: ParseOutcome): ParseOutcome {
  const r = outcome.result;
  if (r.intent !== 'prescrizione' && r.intent !== 'al_bisogno') return outcome;
  if (r.warnings.length > 0) return outcome;
  // La formula "al bisogno" / "se necessario" / "prn" e' classificata: non conta come testo da
  // leggere. Tutto il resto delle note si'.
  const rest =
    r.intent === 'al_bisogno' ? foldText(r.row.note).replace(AL_BISOGNO_FORMULA, ' ') : r.row.note;
  const unread = rest.replace(COMMON_PUNCTUATION, '').trim() !== '' || r.prescriptionRange === null;
  if (!unread) return outcome;
  return { ...outcome, result: { ...r, warnings: ['testo_non_classificato'] } };
}

function parseInternal(text: string, entryDate: string | Date | null | undefined): ParseOutcome {
  return withUnclassifiedWarning(parseRaw(text, entryDate));
}

function parseRaw(text: string, entryDate: string | Date | null | undefined): ParseOutcome {
  const original = (text ?? '').trim();
  const folded = foldText(original);
  const used = new Uint8Array(original.length); // caratteri collocati in un campo
  const mark = (start: number, end: number) => {
    for (let i = Math.max(0, start); i < end && i < used.length; i++) used[i] = 1;
  };
  const isFree = (start: number, end: number) => {
    for (let i = start; i < end; i++) if (used[i]) return false;
    return true;
  };
  const replacements: Replacement[] = [];
  const inferred: DiaryTherapyInferredField[] = [];
  const ambiguous: DiaryTherapyAmbiguousField[] = [];
  let review = false;

  const analysis = analyze(original);
  const { intent, warnings, region } = analysis;
  mark(0, analysis.labelEnd); // elenchi/etichette iniziali: non sono dati

  if (!region) {
    // Nessuna clausola di prescrizione, o piu' di una: nessun campo, tutto nelle note.
    if (analysis.prescriptions.length > 1) ambiguous.push('piu_farmaci');
    return {
      result: {
        row: emptyRow(original, notesOf(original, used)),
        intent,
        inferred,
        ambiguous,
        fasciaConflicts: [],
        warnings,
        prescriptionRange: null,
      },
      leftover: [],
      dropped: droppedCharacters(original, used, notesOf(original, used)),
    };
  }

  const head = analysis.heads[region.clause];
  const rs = region.start;
  const re = region.end;
  const scope = original.slice(rs, re);
  const nameStart = head.nameStart;
  for (const [s, e] of head.consumed) mark(s, e);
  const entryIso = entryIsoDate(entryDate);

  // ── Date (solo nella prescrizione) ──
  let dataInizio = '';
  const startFull = START_DATE_FULL.exec(scope);
  const startShort = START_DATE.exec(scope);
  if (startFull) {
    const iso = isoDate(Number(startFull[3]), Number(startFull[2]), Number(startFull[1]));
    if (iso) {
      dataInizio = iso;
      mark(rs + startFull.index, rs + startFull.index + startFull[0].length);
    } else review = true;
  } else if (startShort) {
    const at = rs + startShort.index;
    if (entryIso) {
      const entryYear = Number(entryIso.slice(0, 4));
      let year = entryYear;
      let iso = isoDate(year, Number(startShort[2]), Number(startShort[1]));
      // "dal 02/01" scritto il 30/12: l'inizio e' nell'anno dopo (dedotto, da verificare).
      if (iso && daysBetween(iso, entryIso) > 180) {
        year = entryYear + 1;
        iso = isoDate(year, Number(startShort[2]), Number(startShort[1]));
      }
      if (iso) {
        dataInizio = iso;
        inferred.push('dataInizio');
        mark(at, at + startShort[0].length);
        replacements.push({
          start: at,
          end: at + startShort[0].length,
          text: `dal ${startShort[1]}/${startShort[2]}/${year}`,
        });
      } else review = true;
    } else review = true;
  }

  let dataFine = '';
  const end = END_DATE.exec(scope);
  if (end) {
    const at = rs + end.index;
    const explicitYear = end[3] ? Number(end[3]) : null;
    const baseYear =
      explicitYear ??
      (dataInizio
        ? Number(dataInizio.slice(0, 4))
        : entryIso
          ? Number(entryIso.slice(0, 4))
          : null);
    const iso = baseYear !== null ? isoDate(baseYear, Number(end[2]), Number(end[1])) : null;
    // Una fine prima dell'inizio non si "aggiusta" cambiando anno: resta nelle note.
    if (iso && !(dataInizio && iso < dataInizio)) {
      dataFine = iso;
      if (explicitYear === null) inferred.push('dataFine');
      mark(at, at + end[0].length);
      replacements.push({ start: at, end: at + end[0].length, text: ' ' });
    } else review = true;
  }

  // ── Dose composta ──
  let dosaggio = '';
  if (analysis.doseChange) review = true;
  // "5 mg / 10 mg", "5 mg/10 mg": due dosi alternative, non una dose composta. Nessuna dose;
  // il testo resta nelle note (e, non essendo classificato, la riga resta senza campi).
  const alternative = findDoseAlternative(original.slice(nameStart, re));
  if (alternative) review = true;
  const composite = alternative ? null : COMPOSITE_DOSE.exec(original.slice(nameStart, re));
  if (composite) {
    const start = nameStart + composite.index;
    dosaggio = composite[0].trim();
    mark(start, start + composite[0].length);
    replacements.push({ start, end: start + composite[0].length, text: ' ' });
    review = true;
  }

  // ── Quantita': una sola, in una forma ammessa, non dopo un orario ──
  let quantita = '';
  let quantitaValore = '';
  let quantityNumerator: number | null = null;
  let quantityDenominator: number | null = null;
  let unitaSomministrazione = '';
  let unitAmbiguous = false;
  const timeThenQty = TIME_THEN_QTY.test(scope);
  const candidates = [...scope.matchAll(ANY_QTY)].filter((m) =>
    isFree(rs + (m.index ?? 0), rs + (m.index ?? 0) + m[0].length),
  );
  if (candidates.length === 1 && !timeThenQty) {
    const m = candidates[0];
    const start = rs + (m.index ?? 0);
    const unitWord = m[1];
    const amount = readQuantity(m[0].slice(0, m[0].length - unitWord.length));
    const strays = [...scope.matchAll(STRAY_FRACTION)].filter((s) => {
      const i = rs + (s.index ?? 0);
      return isFree(i, i + s[0].length) && (i < start || i >= start + m[0].length);
    });
    // "-1 cpr", "+1 cpr": un segno attaccato alla quantita' non e' punteggiatura.
    const signedQty = /[-+]$/.test(original.slice(0, start));
    if (amount && strays.length === 0 && !signedQty) {
      quantita = m[0].trim();
      quantitaValore = amount.display;
      quantityNumerator = amount.num;
      quantityDenominator = amount.den;
      unitaSomministrazione = canonicalUnit(unitWord);
      unitAmbiguous = unitaSomministrazione === '';
      mark(start, start + m[0].length);
      // Solo nella copia per il parser: una quantita' che riconosce, cosi' gli orari che seguono
      // restano leggibili. Non esce mai: quantita' e note si leggono dall'originale.
      replacements.push({ start, end: start + m[0].length, text: ' 1 Cpr ' });
    } else review = true;
  } else if (candidates.length > 0) {
    review = true;
  }
  if (timeThenQty) {
    review = true;
    ambiguous.push('orari');
  }

  // Sigla di via isolata: il parser la riconosce solo fra parentesi.
  const bareRoute = BARE_ROUTE.exec(original.slice(nameStart, re));
  if (bareRoute && !ROUTE_PAREN.test(original.slice(nameStart, re))) {
    const start = nameStart + bareRoute.index;
    replacements.push({
      start,
      end: start + bareRoute[0].length,
      text: ` (${bareRoute[1].toUpperCase()}) `,
    });
  }

  // ── Parser delle dimissioni sulla copia normalizzata della sola prescrizione ──
  let working = original.slice(0, re);
  for (const r of [...replacements]
    .filter((r) => r.start >= nameStart)
    .sort((a, b) => b.start - a.start)) {
    working = working.slice(0, r.start) + r.text + working.slice(r.end);
  }
  working = normalizeHourLists(
    [working.slice(nameStart), ...head.headTimes].join(' ').replace(/\s+/g, ' ').trim(),
  );
  const parsed = parseTherapyLine(working);

  // Nome: il candidato della clausola, se e' quello letto dal parser.
  let farmacoNome = '';
  if (head.name && head.name.toUpperCase() === parsed.farmacoNome) {
    farmacoNome = parsed.farmacoNome;
    mark(nameStart, nameStart + head.name.length);
  } else review = true;
  const afterName = nameStart + (farmacoNome ? head.name.length : 0);

  // Dose semplice: solo "numero unita'", ritrovata nella prescrizione e non attaccata ad altri numeri.
  if (!dosaggio && parsed.dosaggio && !analysis.doseChange) {
    // "5,000 UI" / "5.000 UI": migliaia o decimali? Non si indovina.
    const ok = /[.,]\d{3}(?!\d)/.test(parsed.dosaggio) ? null : DOSE_OK.exec(parsed.dosaggio);
    let located = false;
    if (ok) {
      const num = ok[1].replace(/[.,]/, '[.,]');
      const doseRe = new RegExp(String.raw`${LB}${num}\s?${ok[2]}${WE}`, 'giu');
      for (const m of original.slice(afterName, re).matchAll(doseRe)) {
        const start = afterName + (m.index ?? 0);
        const stop = start + m[0].length;
        if (!isFree(start, stop)) continue;
        const beforeText = original.slice(0, start).trimEnd();
        const before = beforeText.slice(-1);
        const beforeComma = before === ',' && /\d$/.test(beforeText.slice(0, -1).trimEnd());
        const after = original.slice(stop, re).trimStart().slice(0, 2);
        // "6-8-6 UI", "2 , 5 mg", "5 mg/kg": la dose non e' isolata, non si indovina.
        if (/[-–/.+\d]/.test(before) || beforeComma || /^[/-]/.test(after)) break;
        dosaggio = m[0];
        mark(start, stop);
        located = true;
        break;
      }
    }
    if (!located) review = true;
  }

  // Forma: solo forme farmaceutiche note; altrimenti il testo resta nelle note.
  let forma = '';
  if (parsed.forma) {
    const f = foldText(parsed.forma).replace(/\s+/g, ' ').trim();
    const idx = folded.indexOf(foldText(parsed.forma), afterName);
    if (
      KNOWN_FORM.test(f) &&
      idx >= 0 &&
      idx + parsed.forma.length <= re &&
      isFree(idx, idx + parsed.forma.length)
    ) {
      forma = parsed.forma;
      mark(idx, idx + parsed.forma.length);
    }
  }

  // Via: stesso codice del parser (prima la sigla fra parentesi, poi le frasi in ordine),
  // ritrovato nella prescrizione; "orale" dentro "sospensione orale" appartiene alla forma.
  let viaSomministrazione = '';
  if (parsed.viaSomministrazione) {
    const tail = original.slice(afterName, re);
    const paren = tail.match(ROUTE_PAREN);
    const bare = paren ? null : tail.match(BARE_ROUTE);
    let code = paren ? paren[1].toUpperCase() : bare ? bare[1].toUpperCase() : '';
    let pattern: RegExp | null = paren ? ROUTE_PAREN : bare ? BARE_ROUTE : null;
    if (!paren && !bare) {
      for (const [routeRe, phraseCode] of ROUTE_PHRASES) {
        if (routeRe.test(tail)) {
          code = phraseCode;
          pattern = routeRe;
          break;
        }
      }
    }
    if (pattern && code === parsed.viaSomministrazione) {
      viaSomministrazione = code;
      for (const m of tail.matchAll(new RegExp(pattern.source, 'gi'))) {
        const start = afterName + (m.index ?? 0);
        if (isFree(start, start + m[0].length)) {
          mark(start, start + m[0].length);
          break;
        }
      }
    } else review = true;
  }

  // Orari: l'elenco letto dal parser deve essere un elenco della prescrizione.
  let orari: string[] = [];
  const lists = scanTimeLists(scope).map((l) => ({
    ...l,
    start: rs + l.start,
    end: rs + l.end,
  }));
  if (lists.some((l) => l.ambiguous) && !ambiguous.includes('orari')) ambiguous.push('orari');
  if (parsed.orari.length && !timeThenQty) {
    const list = lists.find(
      (l) => l.times.join(',') === parsed.orari.join(',') && isFree(l.start, l.end),
    );
    if (list) {
      // Al bisogno non ha orari fissi: quelli scritti restano nelle note, come scritti.
      if (intent !== 'al_bisogno') {
        orari = list.times;
        mark(list.start, list.end);
      }
    } else review = true;
  }

  // Giorni e classe: solo nella prescrizione.
  // Giorni: un solo gruppo positivo ("Lun, Mer e Ven"). "tranne Dom", "da Lun a Ven" o due
  // gruppi lasciano parole non classificate e quindi svuotano la riga (TUTTO O NIENTE).
  const giorni: string[] = [];
  const dayMatches = [...original.slice(afterName, re).matchAll(DAY_RE)].map((m) => ({
    day: m[1],
    start: afterName + (m.index ?? 0),
    end: afterName + (m.index ?? 0) + m[0].length,
  }));
  const oneGroup = dayMatches.every(
    (d, k) =>
      k === 0 || /^\s*(?:,|e|ed)\s*$/iu.test(original.slice(dayMatches[k - 1].end, d.start)),
  );
  // "-Dom", "+Dom", "(- Dom)": il segno cambia il significato (escluso? aggiunto?): non si legge.
  const signed = dayMatches.some(
    (d) =>
      /[-+–/]\s*$/u.test(original.slice(rs, d.start)) ||
      /^\s*[-+–/]/u.test(original.slice(d.end, re)),
  );
  if (signed) review = true;
  if (dayMatches.length && oneGroup && !signed) {
    for (const d of dayMatches) {
      if (!parsed.giorni.includes(d.day) || giorni.includes(d.day)) continue;
      giorni.push(d.day);
      mark(d.start, d.end);
    }
  }
  const classe = CLASSE_RE.exec(scope);
  const classeValue = classe && parsed.classe ? parsed.classe : '';
  if (classe && classeValue) mark(rs + classe.index, rs + classe.index + classe[0].length);

  // TUTTO O NIENTE: se nella prescrizione avanza una parola non classificata, nessun campo.
  const leftover = unclassifiedWords(original, used, rs, re);
  if (leftover.length) {
    const labelsOnly = new Uint8Array(original.length);
    labelsOnly.fill(1, 0, analysis.labelEnd);
    return {
      result: {
        row: emptyRow(original, notesOf(original, labelsOnly)),
        intent,
        inferred: [],
        ambiguous,
        fasciaConflicts: [],
        // Testo avanzato e nessun blocco gia' scattato: avviso esplicito, mai zero avvisi.
        warnings: NON_PRESCRIPTION_INTENTS.has(intent)
          ? warnings
          : [...warnings, 'testo_non_classificato'],
        prescriptionRange: { start: rs, end: re },
      },
      leftover,
      dropped: droppedCharacters(original, labelsOnly, notesOf(original, labelsOnly)),
    };
  }

  // Connettori della prescrizione ("Lun, Mer e Ven"): non sono dati, non vanno nelle note.
  // "per 7 giorni" e "al bisogno" invece restano nelle note: nessun campo li porta.
  for (const m of scope.matchAll(/(?<![\p{L}\p{N}])(?:e|ed)(?![\p{L}\p{N}])/giu)) {
    const i = rs + (m.index ?? 0);
    if (isFree(i, i + m[0].length)) mark(i, i + m[0].length);
  }

  const note = notesOf(original, used);
  const fasciaConflicts = fasciaConflictsOf(orari);
  const complete =
    farmacoNome !== '' &&
    quantitaValore !== '' &&
    !unitAmbiguous &&
    viaSomministrazione !== '' &&
    orari.length > 0;
  const stato: ParsedTherapyRow['stato'] =
    complete &&
    !review &&
    intent === 'prescrizione' &&
    warnings.length === 0 &&
    inferred.length === 0 &&
    ambiguous.length === 0 &&
    fasciaConflicts.length === 0 &&
    forma === '' &&
    note === ''
      ? 'ok'
      : 'da_verificare';

  const row: DiaryParsedTherapyRow = {
    farmacoNome,
    forma,
    dosaggio,
    viaSomministrazione,
    quantita,
    orari,
    giorni,
    dataInizio,
    classe: classeValue,
    note,
    originalText: original,
    stato,
    dataFine,
    quantitaValore,
    quantityNumerator,
    quantityDenominator,
    unitaSomministrazione,
  };
  return {
    result: {
      row,
      intent,
      inferred,
      ambiguous,
      fasciaConflicts,
      warnings,
      prescriptionRange: { start: rs, end: re },
    },
    leftover: [],
    dropped: droppedCharacters(original, used, note),
  };
}
