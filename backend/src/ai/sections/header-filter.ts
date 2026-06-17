// REQ-037: detect and filter repetitive page headers/footers from the combined OCR transcription
// BEFORE the narrative sections are composed.
//
// The AI runtime transcribes all pages into ONE markdown blob (no per-page OCR), so a tabular
// patient header printed on every page appears as a repeated block inside `rawText`. Left in, it
// breaks the continuity of Anamnesi/Decorso/Terapia across pages and duplicates anagraphic data.
//
// This is deterministic (no model call), conservative (only removes blocks that REPEAT and score
// above a configurable confidence threshold; ambiguous blocks are kept and flagged), and it never
// touches the original text — `originalRawText` stays immutable, `cleanedRawText` is returned for
// extraction. The first occurrence of a header is always kept so the anagraphic data is preserved.

/** Header label tokens (normalised, accent-free). Configurable via DOCUMENT_HEADER_LABELS. */
const DEFAULT_HEADER_LABELS = [
  'paziente', 'nome', 'cognome', 'nascita', 'data di nascita', 'residenza', 'codice fiscale',
  'sesso', 'cartella clinica', 'numero nosologico', 'numero cartella', 'reparto', 'unita operativa',
];

// Page-number footer formats: "Pagina 1 di 8", "Pag. 1/8", "1 / 8", "Pagina 1". Group 1 = page,
// optional group 2 = total.
const PAGE_NUMBER_PATTERNS: RegExp[] = [
  /\bpagina\s+(\d{1,3})\s+di\s+(\d{1,3})\b/i,
  /\bpag\.?\s*(\d{1,3})\s*\/\s*(\d{1,3})\b/i,
  /^\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*$/,
  /\bpagina\s+(\d{1,3})\b/i,
];

export interface HeaderFilterConfig {
  labels: string[];
  requiredMatches: number;
  confidenceThreshold: number;
}

export interface HeaderFilterResult {
  cleanedText: string;
  warnings: string[];
  removedHeaderBlocks: number;
  removedFooterLines: number;
  detectedPageNumbers: number[];
  matchedLabels: string[];
}

export function loadHeaderFilterConfig(env: NodeJS.ProcessEnv = process.env): HeaderFilterConfig {
  const labelsRaw = (env.DOCUMENT_HEADER_LABELS || '').trim();
  const labels = labelsRaw ? labelsRaw.split(',').map((s) => normalise(s)).filter(Boolean) : DEFAULT_HEADER_LABELS;
  const requiredMatches = clampInt(env.DOCUMENT_HEADER_REQUIRED_MATCHES, 3, 1, 10);
  const confidenceThreshold = clampFloat(env.DOCUMENT_HEADER_CONFIDENCE_THRESHOLD, 0.85, 0, 1);
  return { labels, requiredMatches, confidenceThreshold };
}

function clampInt(v: string | undefined, def: number, lo: number, hi: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
}
function clampFloat(v: string | undefined, def: number, lo: number, hi: number): number {
  const n = v ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
}

/** Lowercase, strip accents and markdown bullets/heading marks, collapse spaces. */
function normalise(line: string): string {
  return line
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^[\s#>*\-•|]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The header label matched at the START of a line (e.g. "Codice Fiscale: ..."), or null. */
function matchedLabel(line: string, labels: string[]): string | null {
  const n = normalise(line);
  if (!n) return null;
  for (const lab of labels) {
    if (n === lab || n.startsWith(lab + ':') || n.startsWith(lab + ' :') || n.startsWith(lab + ' ')) {
      // guard: "nome" must not swallow a long prose line that merely begins with the word.
      const rest = n.slice(lab.length).replace(/^[\s:]+/, '');
      if (rest.length <= 60 && !/[.!?]/.test(rest)) return lab;
    }
  }
  return null;
}

/** A short, non-sentence line that can be the VALUE under a label-above-value layout. */
function isValueLine(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && t.length <= 40 && !/[.!?]/.test(t);
}

/** A line that is ONLY a page-number marker. Returns {page,total} or null. */
function pageNumberOnly(line: string): { page: number; total: number | null } | null {
  for (const re of PAGE_NUMBER_PATTERNS) {
    const m = re.exec(line);
    if (m) {
      const residue = line.replace(re, '').replace(/[\s|#>*\-—–.,;:]/g, '').trim();
      if (residue.length === 0) {
        return { page: parseInt(m[1], 10), total: m[2] ? parseInt(m[2], 10) : null };
      }
    }
    re.lastIndex = 0;
  }
  return null;
}

/** Does a line CONTAIN a page-number marker but also other text? */
function footerWithExtra(line: string): boolean {
  for (const re of PAGE_NUMBER_PATTERNS) {
    const m = re.exec(line);
    re.lastIndex = 0;
    if (m) {
      const residue = line.replace(re, '').replace(/[\s|#>*\-—–.,;:]/g, '').trim();
      if (residue.length > 0) return true;
    }
  }
  return false;
}

interface Block { start: number; end: number; labels: string[]; signature: string }

/** Find maximal runs of header label lines (absorbing short value lines), each with ≥1 label. */
function findHeaderBlocks(lines: string[], cfg: HeaderFilterConfig): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    if (matchedLabel(lines[i], cfg.labels)) {
      const labels: string[] = [];
      let j = i;
      while (j < lines.length) {
        const lab = matchedLabel(lines[j], cfg.labels);
        if (lab) { labels.push(lab); j++; continue; }
        // absorb a single value line that sits between two label lines (label-above-value layout)
        if (isValueLine(lines[j]) && j + 1 < lines.length && matchedLabel(lines[j + 1], cfg.labels)) { j++; continue; }
        break;
      }
      const distinct = Array.from(new Set(labels));
      blocks.push({ start: i, end: j, labels: distinct, signature: distinct.slice().sort().join('|') });
      i = j;
    } else {
      i++;
    }
  }
  return blocks;
}

/** Confidence that a block is a repeated page header. position/repetition/label/tableLayout. */
function scoreBlock(block: Block, lines: string[], signatureCounts: Map<string, number>, cfg: HeaderFilterConfig): number {
  const distinct = block.labels.length;
  const labelScore = Math.min(1, distinct / Math.max(1, cfg.requiredMatches));
  const repeat = signatureCounts.get(block.signature) ?? 1;
  const repetitionScore = repeat >= 2 ? 1 : 0.2;
  // table-like: fraction of block lines that are "label: value" pairs
  let pairs = 0, total = 0;
  for (let k = block.start; k < block.end; k++) {
    const t = lines[k].trim();
    if (!t) continue;
    total++;
    if (/:/.test(t) || matchedLabel(lines[k], cfg.labels)) pairs++;
  }
  const tableLayoutScore = total ? pairs / total : 0;
  // position: near the document start or right after a blank/page-break boundary (page top)
  const prev = block.start > 0 ? lines[block.start - 1].trim() : '';
  const positionScore = block.start === 0 || prev === '' || !!pageNumberOnly(prev) ? 1 : 0.4;
  return 0.35 * repetitionScore + 0.35 * labelScore + 0.15 * tableLayoutScore + 0.15 * positionScore;
}

/**
 * Remove repetitive headers/footers from the combined transcription. Keeps the FIRST occurrence of
 * each header (anagraphic data preserved), removes later duplicates, strips page-number-only footer
 * lines (recording the numbers), and KEEPS ambiguous/low-confidence blocks with a warning.
 * Deterministic and idempotent: re-running on cleaned text removes nothing further.
 */
export function filterRepeatedHeaders(rawText: string, config?: Partial<HeaderFilterConfig>): HeaderFilterResult {
  const cfg = { ...loadHeaderFilterConfig(), ...config };
  const warnings: string[] = [];
  const detectedPageNumbers: number[] = [];
  const matchedLabels: string[] = [];
  if (!rawText || !rawText.trim()) {
    return { cleanedText: rawText ?? '', warnings, removedHeaderBlocks: 0, removedFooterLines: 0, detectedPageNumbers, matchedLabels };
  }

  const lines = rawText.split('\n');
  const blocks = findHeaderBlocks(lines, cfg).filter((b) => b.labels.length >= cfg.requiredMatches);

  // count how often each header signature repeats across the document
  const signatureCounts = new Map<string, number>();
  for (const b of blocks) signatureCounts.set(b.signature, (signatureCounts.get(b.signature) ?? 0) + 1);

  const remove = new Set<number>(); // line indices to drop
  const seenSignature = new Set<string>();
  let removedHeaderBlocks = 0;

  for (const b of blocks) {
    const repeats = (signatureCounts.get(b.signature) ?? 1) >= 2;
    if (!repeats) continue; // a one-off block is content, never a repeated header
    const confidence = scoreBlock(b, lines, signatureCounts, cfg);
    const firstOccurrence = !seenSignature.has(b.signature);
    seenSignature.add(b.signature);
    if (firstOccurrence) continue; // always keep the first header (anagraphic source)
    if (confidence >= cfg.confidenceThreshold) {
      for (let k = b.start; k < b.end; k++) remove.add(k);
      removedHeaderBlocks++;
      for (const l of b.labels) if (!matchedLabels.includes(l)) matchedLabels.push(l);
    } else {
      warnings.push(`AMBIGUOUS_HEADER_KEPT confidence=${confidence.toFixed(2)} labels=${b.labels.length}`);
    }
  }

  // footer page-number lines (recover the number BEFORE removing the line)
  let removedFooterLines = 0;
  for (let k = 0; k < lines.length; k++) {
    if (remove.has(k)) continue;
    const pn = pageNumberOnly(lines[k]);
    if (pn) {
      detectedPageNumbers.push(pn.page);
      remove.add(k);
      removedFooterLines++;
    } else if (footerWithExtra(lines[k])) {
      warnings.push('FOOTER_WITH_EXTRA_TEXT_KEPT');
    }
  }

  const cleaned = lines.filter((_, idx) => !remove.has(idx)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    cleanedText: cleaned,
    warnings,
    removedHeaderBlocks,
    removedFooterLines,
    detectedPageNumbers,
    matchedLabels,
  };
}
