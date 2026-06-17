// REQ-038: deterministic detection of line/paragraph-initial dates → DATE_PREFIX annotations.
//
// Pure, no AI, offset-based on the EXACT text. A date is a "prefix" only when it OPENS the line or
// paragraph (or a bullet item) — a date inside a sentence ("...eseguita il 09/03/2026.") is NOT a
// prefix and is left alone. The text is never modified; the bold is purely a render annotation,
// recomputed from the current text (so a manual edit recalculates the tags for free).

import type { SemanticAnnotation } from './types';

const MONTHS = 'gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre';
// Numeric DD/MM/YYYY · DD-MM-YYYY · DD.MM.YYYY · DD/MM/YY, or textual "9 marzo 2026".
const DATE_CORE = `(?:\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]\\d{2,4}|\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})`;
// Optional Italian lead-in "In data …" / "Il …" — highlighted together with the date.
const EXPRESSION = `(?:(?:in\\s+data|il)\\s+)?${DATE_CORE}`;
// Line start (start of text or after \n), optional bullet/numbered-list marker, then the expression.
const LINE_START = new RegExp(`(^|\\n)([ \\t]*(?:[-*•]\\s+|\\d{1,2}[.)]\\s+)?)(${EXPRESSION})`, 'gi');

/**
 * Return DATE_PREFIX annotations for every date that opens a line/paragraph/bullet in `text`.
 * Offsets are exact substrings of `text`. Deterministic and idempotent.
 */
export function detectDatePrefixAnnotations(text: string): SemanticAnnotation[] {
  if (!text) return [];
  const out: SemanticAnnotation[] = [];
  LINE_START.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINE_START.exec(text)) !== null) {
    const lead = m[1].length + m[2].length;        // newline + bullet/indent before the expression
    const start = m.index + lead;
    const expr = m[3];
    const end = start + expr.length;
    if (text.slice(start, end) === expr) {
      out.push({ tag: 'DATE_PREFIX', text: expr, startOffset: start, endOffset: end });
    }
    if (m.index === LINE_START.lastIndex) LINE_START.lastIndex++; // guard against zero-width loops
  }
  return out;
}

/**
 * Merge auto-detected date prefixes with model/provided annotations. Provided annotations win:
 * an auto prefix that overlaps an existing annotation is dropped (no double emphasis).
 */
export function withDatePrefixes(
  text: string,
  provided: SemanticAnnotation[] | undefined,
): SemanticAnnotation[] {
  const base = provided ?? [];
  const auto = detectDatePrefixAnnotations(text).filter(
    (a) => !base.some((p) => a.startOffset < p.endOffset && p.startOffset < a.endOffset),
  );
  return [...base, ...auto];
}
