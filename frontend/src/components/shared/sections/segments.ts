// Pure, safe text-segmentation for SemanticTaggedText (REQ-027).
//
// SAFETY GUARANTEES (covered by unit tests):
//  - the concatenation of all segment texts EQUALS rawText exactly (no loss, no edit);
//  - a span is emphasised ONLY when its annotation maps to the exact substring AND the
//    tag is configured bold — a drifted/wrong-offset annotation is silently ignored
//    (the text still renders, just not bold), never trusted to mutate text;
//  - overlapping annotations are resolved greedily (first by offset), no double-wrap;
//  - no HTML is ever produced here — segments are plain data rendered as React text.

import type { SemanticAnnotation, SemanticTag } from './types';
import type { TagStyle } from './tagStyles';

export interface Segment {
  text: string;
  bold: boolean;
  /** Illegible marker (e.g. "[ILLEGGIBILE]") found in the text. */
  illegible: boolean;
  tag?: SemanticTag;
  className?: string;
}

const ILLEGIBLE = /\[(?:ILLEGG?IBILE|ILLEGIBLE|\.{3,}|_{2,})\]/gi;

/** Split a plain run into legible / illegible segments (illegible markers highlighted). */
function splitIllegible(text: string, base: Omit<Segment, 'text' | 'illegible'>): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  ILLEGIBLE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ILLEGIBLE.exec(text)) !== null) {
    if (m.index > last) out.push({ ...base, text: text.slice(last, m.index), illegible: false });
    out.push({ ...base, text: m[0], illegible: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ ...base, text: text.slice(last), illegible: false });
  return out;
}

/** Build render segments from rawText + annotations. Never mutates rawText. */
export function buildSegments(
  rawText: string,
  annotations: SemanticAnnotation[] | undefined,
  styles: Record<SemanticTag, TagStyle>,
): Segment[] {
  const valid = (annotations ?? [])
    .filter(
      (a) =>
        a &&
        typeof a.startOffset === 'number' &&
        typeof a.endOffset === 'number' &&
        a.startOffset >= 0 &&
        a.endOffset <= rawText.length &&
        a.startOffset < a.endOffset &&
        styles[a.tag]?.bold &&
        rawText.slice(a.startOffset, a.endOffset) === a.text, // exact match only
    )
    .sort((x, y) => x.startOffset - y.startOffset);

  const out: Segment[] = [];
  let cursor = 0;
  for (const a of valid) {
    if (a.startOffset < cursor) continue; // overlap → skip inner
    if (a.startOffset > cursor)
      out.push(...splitIllegible(rawText.slice(cursor, a.startOffset), { bold: false }));
    out.push({
      text: a.text,
      bold: true,
      illegible: false,
      tag: a.tag,
      className: styles[a.tag]?.className,
    });
    cursor = a.endOffset;
  }
  if (cursor < rawText.length) out.push(...splitIllegible(rawText.slice(cursor), { bold: false }));
  return out;
}
