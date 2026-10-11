// Parse the model's integral OCR markdown (rawText) into canonical narrative sections (REQ-035).
//
// The model already produced the section text (e.g. "## Anamnesi Patologica Recente:\n\n...");
// it was just never mapped into the per-section fields. This deterministic parser splits the
// markdown by headings, maps each heading to a canonical section, and accumulates ALL text up
// to the next heading of a DIFFERENT canonical section — so anamnesi subtitles stay in one
// ANAMNESIS block, headings are kept, nothing is summarised or re-split. No AI call.

import type { DischargeNarrativeDraft } from './narrative.js';
import { NARRATIVE_SCHEMA_VERSION } from './narrative.js';
import { isPastHistoryHeading } from '../../intake/clinical-history.js';
import {
  hasPrescriptionSignal,
  looksLikePrescriptionLine,
} from '../../intake/parse-discharge-therapy.js';

type DraftTextField =
  | 'diagnosisText'
  | 'anamnesisText'
  | 'hospitalCourseText'
  | 'consultationsText'
  | 'imagingDiagnosticsText'
  | 'proceduresAndInterventionsText'
  | 'therapyText'
  | 'adviceAndFollowUpText'
  | 'allergiesText';

// Ordered: more specific patterns first (imaging before diagnosi; home-therapy before terapia).
const ALIASES: Array<{ field: DraftTextField; patterns: RegExp[] }> = [
  { field: 'allergiesText', patterns: [/\ballerg/, /\bintolleranz/] },
  {
    field: 'imagingDiagnosticsText',
    patterns: [
      /diagnostica per immagini/,
      /esami radiologic/,
      /\bimaging\b/,
      /\bradiolog/,
      /\becograf/,
      /\btac\b/,
      /risonanz/,
    ],
  },
  {
    field: 'diagnosisText',
    patterns: [
      /diagnosi di dimissione/,
      /diagnosi alla dimissione/,
      /diagnosi conclusiv/,
      /\bdiagnosi\b/,
    ],
  },
  { field: 'anamnesisText', patterns: [/\banamnesi\b/, /anamnestic/, /\bapr\b/, /\bapp\b/] },
  {
    field: 'hospitalCourseText',
    patterns: [/decorso ospedalier/, /decorso clinic/, /decorso della degenza/, /\bdecorso\b/],
  },
  {
    field: 'consultationsText',
    patterns: [/consulenz/, /consulti specialistic/, /\bconsulti\b/, /pareri specialistic/],
  },
  {
    field: 'proceduresAndInterventionsText',
    patterns: [
      /prestazioni e interventi/,
      /procedure e interventi/,
      /\bprocedure\b/,
      /interventi esegui/,
      /\bprestazioni\b/,
      /\binterventi\b/,
    ],
  },
  {
    field: 'therapyText',
    patterns: [
      /terapia domiciliar/,
      /terapia alla dimissione/,
      /terapia consigliat/,
      /terapia in atto/,
      /\bterapia\b/,
      /\bterapie\b/,
      /^td\b/,
      /\bt\.d\.\b/,
      // 2026-10-11: titoli usati dalle lettere al posto di "Terapia" (prima il loro elenco
      // finiva nella sezione precedente).
      /^farmaci\b/,
      /^prescrizion/,
      /piano terapeutic/,
      /schema terapeutic/,
    ],
  },
  {
    field: 'adviceAndFollowUpText',
    patterns: [
      /consigli/,
      /controlli/,
      /indicazioni alla dimissione/,
      /\bindicazioni\b/,
      /follow[- ]?up/,
      /raccomandazion/,
    ],
  },
];

const FIELD_TO_ITALIAN: Record<DraftTextField, string> = {
  diagnosisText: 'DIAGNOSI',
  anamnesisText: 'ANAMNESI',
  hospitalCourseText: 'DECORSO_OSPEDALIERO',
  consultationsText: 'CONSULENZE',
  imagingDiagnosticsText: 'DIAGNOSTICA_PER_IMMAGINI',
  proceduresAndInterventionsText: 'PRESTAZIONI_E_INTERVENTI',
  therapyText: 'TERAPIA',
  adviceAndFollowUpText: 'CONSIGLI_E_CONTROLLI',
  allergiesText: 'ALLERGIE',
};

const MD_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;

/** Identify the canonical field for a heading line, or null if the line is not a section heading. */
// #242: an inline pharmacological-therapy label (e.g. "Terapia:", "Terapia domiciliare:", "TD:")
// starts a THERAPY block even mid-content and even when the first drug is on the same line. This
// prevents a combined "Diagnosi e terapia …" heading from bucketing the whole drug list into DIAGNOSI
// (diagnosi e terapia farmacologica devono restare separate).
const THERAPY_LABEL =
  /^(terapi[ae][^:\n]{0,60}|t\.?d\.?|farmaci[^:\n]{0,40}|prescrizion[ei][^:\n]{0,40}|(?:piano|schema) terapeutico[^:\n]{0,40})\s*:/i;

// Quanto lontano dall'inizio del titolo puo' stare la parola chiave della sezione.
// "Allergie" apre il titolo; in "DUBBIA REAZIONE ALLERGICA AL CEFTAZIDIME" la parola
// compare a meta' frase perche' e' CONTENUTO clinico, non un'etichetta di sezione — ed e'
// cosi' che la diagnosi finiva archiviata sotto le allergie.
const APERTURA_TITOLO = 12;

function headingField(
  line: string,
  isolata: boolean,
): { field: DraftTextField; heading: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const tl = THERAPY_LABEL.exec(trimmed);
  if (tl) return { field: 'therapyText', heading: tl[1].trim() };
  const md = MD_HEADING.exec(line);
  let headingText: string;
  if (md) {
    headingText = md[1].trim();
  } else {
    // Un titolo, in un referto, si riconosce dalla STRUTTURA: sta su una riga propria,
    // staccata dal blocco precedente, ed e' seguito dalle righe di contenuto. Il maiuscolo
    // non e' un criterio affidabile — una diagnosi scritta tutta in maiuscolo NON e' un
    // titolo, e trattarla come tale faceva finire l'intera diagnosi sotto le allergie.
    // Una riga che sta dentro un paragrafo non puo' essere un titolo, qualunque sia il caso.
    if (!isolata) return null;
    const t = trimmed.replace(/:\s*$/, '');
    const parole = t.split(/\s+/).filter(Boolean);
    const looksTitle =
      t.length > 0 && t.length <= 60 && !/[.!?]/.test(t) && parole.length > 0 && parole.length <= 8;
    if (!looksTitle) return null;
    headingText = t;
  }
  const lower = headingText.toLowerCase().replace(/[:#]/g, '').trim();
  // Prior conditions / procedures belong to history, even if their heading contains
  // "interventi". Current-admission procedures keep their separate canonical section.
  if (isPastHistoryHeading(lower)) return { field: 'anamnesisText', heading: headingText };
  for (const a of ALIASES) {
    // L'etichetta deve APRIRE il titolo. Se la parola chiave compare a meta' riga e'
    // contenuto clinico, non un'intestazione.
    const apre = a.patterns.some((re) => {
      const m = new RegExp(re.source, re.flags.replace('g', '')).exec(lower);
      return m !== null && m.index <= APERTURA_TITOLO;
    });
    if (apre) return { field: a.field, heading: headingText };
  }
  return null;
}

export interface ParsedSection {
  field: DraftTextField;
  detectedHeading: string;
  text: string;
}

// Righe in maiuscolo che chiudono una pagina senza essere farmaci.
const CODA_NON_FARMACO =
  /^(?:firmat\w*|dirigent\w*|responsabil\w*|direttor\w*|caposala|medico|dott\w*|dr\w*|reparto|pagina|pag\b|tel\w*|fax|email|via|viale|piazza|dieta|controll[oi]|esami)\b/i;

/** Split markdown rawText into canonical sections. Headings are kept in the text. */
export function parseMarkdownSections(rawText: string): Map<DraftTextField, ParsedSection> {
  const out = new Map<DraftTextField, ParsedSection>();
  const lines = (rawText || '').split('\n');
  let current: DraftTextField | null = null;
  let buffer: string[] = [];
  let heading = '';

  const flush = () => {
    if (current && buffer.length) {
      const text = buffer.join('\n').replace(/\s+$/, '');
      const prev = out.get(current);
      if (prev) prev.text = `${prev.text}\n${text}`.trim();
      else out.set(current, { field: current, detectedHeading: heading, text: text.trim() });
    }
    buffer = [];
  };

  // Righe prima del primo titolo: intestazione e saluti, ma anche — su una pagina di
  // continuazione importata da sola — l'elenco dei farmaci rimasto senza titolo.
  const preambolo: string[] = [];
  // "Titolo, poi le righe, poi un blocco vuoto": una riga vuota (o l'inizio del documento)
  // e' cio' che rende una riga candidata a essere un titolo.
  let precedenteVuota = true;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    // NON si pretende anche la riga vuota DOPO il titolo: sembrava il modo pulito per
    // escludere le voci di elenco, ma su un referto reale ha azzerato il riconoscimento —
    // li' i titoli sono seguiti subito dalle righe di contenuto. Perdere tutte le sezioni
    // e' molto peggio che classificare male una voce di elenco.
    const h = headingField(line, precedenteVuota);
    precedenteVuota = line.trim() === '';
    if (h) {
      if (h.field !== current) {
        flush();
        current = h.field;
        heading = h.heading;
      }
      // same canonical field (e.g. another "Anamnesi …" subtitle) → keep accumulating in one block.
      buffer.push(line);
    } else if (current) {
      buffer.push(line);
    } else preambolo.push(line);
  }
  flush();
  // Il resto del preambolo (intestazione, saluti) non e' mappato su alcuna sezione. Se pero'
  // contiene prescrizioni complete, da li' in poi e' la terapia che prosegue da un'altra pagina.
  // L'elenco inizia alla prima prescrizione completa e arriva fino all'ultima riga con un segnale
  // di prescrizione (dose, quantita', via, orario, fascia glicemica): nel mezzo nulla si perde
  // (righe vuote, farmaci senza orario, sospesi — da verificare), la coda di prosa o firme resta fuori.
  const inizio = preambolo.findIndex(looksLikePrescriptionLine);
  if (inizio >= 0) {
    let fine = preambolo.length;
    while (fine > inizio + 1 && !hasPrescriptionSignal(preambolo[fine - 1])) fine--;
    // Nello stesso paragrafo, un farmaco scritto senza dose ("EUTIROX a digiuno") e' ancora
    // l'elenco: nome in maiuscolo in apertura, riga corta, non una firma o un'intestazione.
    while (
      fine < preambolo.length &&
      preambolo[fine].trim() &&
      /^\p{Lu}{3,}\b/u.test(preambolo[fine].trim()) &&
      preambolo[fine].trim().split(/\s+/).length <= 6 &&
      !CODA_NON_FARMACO.test(preambolo[fine].trim())
    )
      fine++;
    const elenco = preambolo.slice(inizio, fine).join('\n').trim();
    const prev = out.get('therapyText');
    if (prev) prev.text = `${elenco}\n\n${prev.text}`;
    else out.set('therapyText', { field: 'therapyText', detectedHeading: '', text: elenco });
  }
  return out;
}

/** Build a narrative draft directly from the extracted markdown (no AI call). */
export function parseNarrativeFromMarkdown(
  rawText: string,
  demographics?: Partial<
    Pick<
      DischargeNarrativeDraft,
      | 'firstName'
      | 'lastName'
      | 'dateOfBirth'
      | 'placeOfBirth'
      | 'sex'
      | 'fiscalCode'
      | 'address'
      | 'phone'
      | 'email'
    >
  >,
  documentInfo?: { id?: string; filename?: string },
): DischargeNarrativeDraft {
  const parsed = parseMarkdownSections(rawText);
  const text = (f: DraftTextField) => parsed.get(f)?.text ?? '';
  const allergiesText = text('allergiesText');
  const missing: string[] = [];
  const draft: DischargeNarrativeDraft = {
    schemaVersion: NARRATIVE_SCHEMA_VERSION,
    firstName: demographics?.firstName ?? '',
    lastName: demographics?.lastName ?? '',
    dateOfBirth: demographics?.dateOfBirth ?? '',
    placeOfBirth: demographics?.placeOfBirth ?? '',
    sex: demographics?.sex ?? '',
    fiscalCode: demographics?.fiscalCode ?? '',
    address: demographics?.address ?? '',
    phone: demographics?.phone ?? '',
    email: demographics?.email ?? '',
    allergyStatus: allergiesText.trim() ? 'present' : 'not_documented',
    allergiesText,
    diagnosisText: text('diagnosisText'),
    anamnesisText: text('anamnesisText'),
    hospitalCourseText: text('hospitalCourseText'),
    consultationsText: text('consultationsText'),
    imagingDiagnosticsText: text('imagingDiagnosticsText'),
    proceduresAndInterventionsText: text('proceduresAndInterventionsText'),
    therapyText: text('therapyText'),
    adviceAndFollowUpText: text('adviceAndFollowUpText'),
    unmappedText: '',
    boldTags: [],
    sourceReferences: [],
    missingSections: missing,
    warnings: [],
  };
  for (const [field, italian] of Object.entries(FIELD_TO_ITALIAN)) {
    if (!(draft[field as DraftTextField] as string).trim()) missing.push(italian);
  }
  // BUG-048 (#70): the markdown path knows the source document but not the per-section page, so
  // link every populated section to that document. "Confronta con la fonte" can then open it
  // (pageFrom omitted — the viewer opens the document; exact page is best-effort for this path).
  if (documentInfo && (documentInfo.id || documentInfo.filename)) {
    for (const [field, italian] of Object.entries(FIELD_TO_ITALIAN)) {
      if ((draft[field as DraftTextField] as string).trim()) {
        draft.sourceReferences.push({
          sectionKey: italian,
          fileId: documentInfo.id,
          fileName: documentInfo.filename,
        });
      }
    }
  }
  return draft;
}

/** Dev/test guard: a section heading was detected but its text is empty (content lost). */
export function detectSectionLoss(rawText: string, draft: DischargeNarrativeDraft): string[] {
  const parsed = parseMarkdownSections(rawText);
  const lost: string[] = [];
  for (const [field, sec] of parsed) {
    if (sec.text.trim().length > 0 && !(draft[field] as string).trim())
      lost.push(FIELD_TO_ITALIAN[field]);
  }
  return lost;
}

/** Thrown by {@link assertNoNarrativeSectionLoss} when content would be silently dropped. */
export class NarrativeSectionContentLostError extends Error {
  readonly lostSections: string[];
  constructor(lost: string[]) {
    super(`NARRATIVE_SECTION_CONTENT_LOST: ${lost.join(', ')}`);
    this.name = 'NarrativeSectionContentLostError';
    this.lostSections = lost;
  }
}

/**
 * BUG-051 confirm-time guard: block the save when a section detected with non-empty text in the
 * source markdown would be persisted with an empty `originalText`. Prevents silently creating
 * empty narrative blocks (editor opening blank) from a content-rich document. No AI call.
 */
export function assertNoNarrativeSectionLoss(
  rawText: string,
  draft: DischargeNarrativeDraft,
): void {
  const lost = detectSectionLoss(rawText, draft);
  if (lost.length > 0) throw new NarrativeSectionContentLostError(lost);
}
