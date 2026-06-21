// Parse the model's integral OCR markdown (rawText) into canonical narrative sections (REQ-035).
//
// The model already produced the section text (e.g. "## Anamnesi Patologica Recente:\n\n...");
// it was just never mapped into the per-section fields. This deterministic parser splits the
// markdown by headings, maps each heading to a canonical section, and accumulates ALL text up
// to the next heading of a DIFFERENT canonical section — so anamnesi subtitles stay in one
// ANAMNESIS block, headings are kept, nothing is summarised or re-split. No AI call.

import type { DischargeNarrativeDraft } from './narrative.js';
import { NARRATIVE_SCHEMA_VERSION } from './narrative.js';

type DraftTextField =
  | 'diagnosisText' | 'anamnesisText' | 'hospitalCourseText' | 'consultationsText'
  | 'imagingDiagnosticsText' | 'proceduresAndInterventionsText' | 'therapyText'
  | 'adviceAndFollowUpText' | 'allergiesText';

// Ordered: more specific patterns first (imaging before diagnosi; home-therapy before terapia).
const ALIASES: Array<{ field: DraftTextField; patterns: RegExp[] }> = [
  { field: 'allergiesText', patterns: [/\ballerg/, /\bintolleranz/] },
  { field: 'imagingDiagnosticsText', patterns: [/diagnostica per immagini/, /esami radiologic/, /\bimaging\b/, /\bradiolog/, /\becograf/, /\btac\b/, /risonanz/] },
  { field: 'diagnosisText', patterns: [/diagnosi di dimissione/, /diagnosi alla dimissione/, /diagnosi conclusiv/, /\bdiagnosi\b/] },
  { field: 'anamnesisText', patterns: [/\banamnesi\b/, /anamnestic/, /\bapr\b/, /\bapp\b/] },
  { field: 'hospitalCourseText', patterns: [/decorso ospedalier/, /decorso clinic/, /decorso della degenza/, /\bdecorso\b/] },
  { field: 'consultationsText', patterns: [/consulenz/, /consulti specialistic/, /\bconsulti\b/, /pareri specialistic/] },
  { field: 'proceduresAndInterventionsText', patterns: [/prestazioni e interventi/, /procedure e interventi/, /\bprocedure\b/, /interventi esegui/, /\bprestazioni\b/, /\binterventi\b/] },
  { field: 'therapyText', patterns: [/terapia domiciliar/, /terapia alla dimissione/, /terapia consigliat/, /terapia in atto/, /\bterapia\b/, /^td\b/, /\bt\.d\.\b/] },
  { field: 'adviceAndFollowUpText', patterns: [/consigli/, /controlli/, /indicazioni alla dimissione/, /\bindicazioni\b/, /follow[- ]?up/, /raccomandazion/] },
];

const FIELD_TO_ITALIAN: Record<DraftTextField, string> = {
  diagnosisText: 'DIAGNOSI', anamnesisText: 'ANAMNESI', hospitalCourseText: 'DECORSO_OSPEDALIERO',
  consultationsText: 'CONSULENZE', imagingDiagnosticsText: 'DIAGNOSTICA_PER_IMMAGINI',
  proceduresAndInterventionsText: 'PRESTAZIONI_E_INTERVENTI', therapyText: 'TERAPIA',
  adviceAndFollowUpText: 'CONSIGLI_E_CONTROLLI', allergiesText: 'ALLERGIE',
};

const MD_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;

/** Identify the canonical field for a heading line, or null if the line is not a section heading. */
function headingField(line: string): { field: DraftTextField; heading: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const md = MD_HEADING.exec(line);
  let headingText: string;
  if (md) {
    headingText = md[1].trim();
  } else {
    // Plain title line: short, optionally ending with ':' (no sentence punctuation inside).
    const t = trimmed.replace(/:\s*$/, '');
    const looksTitle = t.length > 0 && t.length <= 60 && !/[.!?]/.test(t) && (/:\s*$/.test(trimmed) || t === t.toUpperCase());
    if (!looksTitle) return null;
    headingText = t;
  }
  const lower = headingText.toLowerCase().replace(/[:#]/g, '').trim();
  for (const a of ALIASES) {
    if (a.patterns.some((re) => re.test(lower))) return { field: a.field, heading: headingText };
  }
  return null;
}

export interface ParsedSection { field: DraftTextField; detectedHeading: string; text: string }

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

  for (const line of lines) {
    const h = headingField(line);
    if (h) {
      if (h.field !== current) { flush(); current = h.field; heading = h.heading; }
      // same canonical field (e.g. another "Anamnesi …" subtitle) → keep accumulating in one block.
      buffer.push(line);
    } else if (current) {
      buffer.push(line);
    }
    // lines before the first recognised heading are ignored for section mapping (header/intro).
  }
  flush();
  return out;
}

/** Build a narrative draft directly from the extracted markdown (no AI call). */
export function parseNarrativeFromMarkdown(
  rawText: string,
  demographics?: Partial<Pick<DischargeNarrativeDraft, 'firstName' | 'lastName' | 'dateOfBirth' | 'placeOfBirth' | 'sex' | 'fiscalCode' | 'address' | 'phone' | 'email'>>,
  documentInfo?: { id?: string; filename?: string },
): DischargeNarrativeDraft {
  const parsed = parseMarkdownSections(rawText);
  const text = (f: DraftTextField) => parsed.get(f)?.text ?? '';
  const allergiesText = text('allergiesText');
  const missing: string[] = [];
  const draft: DischargeNarrativeDraft = {
    schemaVersion: NARRATIVE_SCHEMA_VERSION,
    firstName: demographics?.firstName ?? '', lastName: demographics?.lastName ?? '',
    dateOfBirth: demographics?.dateOfBirth ?? '', placeOfBirth: demographics?.placeOfBirth ?? '',
    sex: demographics?.sex ?? '', fiscalCode: demographics?.fiscalCode ?? '',
    address: demographics?.address ?? '', phone: demographics?.phone ?? '', email: demographics?.email ?? '',
    allergyStatus: allergiesText.trim() ? 'present' : 'not_documented',
    allergiesText,
    diagnosisText: text('diagnosisText'), anamnesisText: text('anamnesisText'),
    hospitalCourseText: text('hospitalCourseText'), consultationsText: text('consultationsText'),
    imagingDiagnosticsText: text('imagingDiagnosticsText'),
    proceduresAndInterventionsText: text('proceduresAndInterventionsText'),
    therapyText: text('therapyText'), adviceAndFollowUpText: text('adviceAndFollowUpText'),
    unmappedText: '',
    boldTags: [], sourceReferences: [], missingSections: missing, warnings: [],
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
        draft.sourceReferences.push({ sectionKey: italian, fileId: documentInfo.id, fileName: documentInfo.filename });
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
    if (sec.text.trim().length > 0 && !(draft[field] as string).trim()) lost.push(FIELD_TO_ITALIAN[field]);
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
export function assertNoNarrativeSectionLoss(rawText: string, draft: DischargeNarrativeDraft): void {
  const lost = detectSectionLoss(rawText, draft);
  if (lost.length > 0) throw new NarrativeSectionContentLostError(lost);
}
